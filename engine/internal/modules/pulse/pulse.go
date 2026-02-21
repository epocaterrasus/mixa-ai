// Package pulse implements the PULSE (health & uptime monitoring) engine module.
// It pings configurable HTTP(S) endpoints, tracks SSL certificate expiry,
// calculates uptime percentages, records response times with percentiles,
// and maintains an incident log.
package pulse

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	"github.com/mixa-ai/engine/internal/storage"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Endpoint represents a monitored HTTP(S) endpoint.
type Endpoint struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	URL       string `json:"url"`
	Method    string `json:"method"` // GET, HEAD
	Interval  int    `json:"interval"` // seconds between checks
	CreatedAt string `json:"createdAt"`
}

// CheckResult represents the result of a single health check.
type CheckResult struct {
	EndpointID   string  `json:"endpointId"`
	Timestamp    string  `json:"timestamp"`    // RFC3339
	StatusCode   int     `json:"statusCode"`
	ResponseMs   float64 `json:"responseMs"`   // response time in milliseconds
	IsUp         bool    `json:"isUp"`
	ErrorMessage string  `json:"errorMessage"` // non-empty on failure
}

// SSLInfo holds SSL certificate information for an endpoint.
type SSLInfo struct {
	EndpointID string `json:"endpointId"`
	Issuer     string `json:"issuer"`
	Subject    string `json:"subject"`
	NotBefore  string `json:"notBefore"`  // RFC3339
	NotAfter   string `json:"notAfter"`   // RFC3339
	DaysLeft   int    `json:"daysLeft"`
	CheckedAt  string `json:"checkedAt"`  // RFC3339
}

// Incident records a status change (up → down or down → up).
type Incident struct {
	ID         string `json:"id"`
	EndpointID string `json:"endpointId"`
	Type       string `json:"type"` // "down" or "up"
	Timestamp  string `json:"timestamp"`
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
}

// Module implements the PULSE health & uptime monitoring module.
type Module struct {
	store  *storage.Store
	dbPath string
	encKey []byte

	mu        sync.RWMutex
	endpoints map[string]*Endpoint
	results   map[string][]*CheckResult // endpointID -> results (last 1000)
	sslInfo   map[string]*SSLInfo       // endpointID -> SSL info
	incidents []*Incident
	nextID    int

	httpClient *http.Client

	// Polling goroutine lifecycle.
	cancelPoll context.CancelFunc
	pollDone   chan struct{}

	subMu       sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

const maxResultsPerEndpoint = 1000

// New creates a new PULSE module.
func New(dbPath string, encKey []byte) *Module {
	return &Module{
		dbPath:      dbPath,
		encKey:      encKey,
		endpoints:   make(map[string]*Endpoint),
		results:     make(map[string][]*CheckResult),
		sslInfo:     make(map[string]*SSLInfo),
		incidents:   make([]*Incident, 0),
		nextID:      1,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: false,
				},
			},
		},
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
}

func (m *Module) Name() string        { return "pulse" }
func (m *Module) DisplayName() string { return "PULSE" }
func (m *Module) Description() string { return "Health & uptime monitoring" }

// Start opens the encrypted store, loads persisted data, and starts the polling loop.
func (m *Module) Start() error {
	store, err := storage.Open(m.dbPath, m.encKey)
	if err != nil {
		return fmt.Errorf("pulse: open store: %w", err)
	}
	m.store = store

	if err := m.loadData(); err != nil {
		store.Close()
		return fmt.Errorf("pulse: load data: %w", err)
	}

	// Start background polling goroutine.
	ctx, cancel := context.WithCancel(context.Background())
	m.cancelPoll = cancel
	m.pollDone = make(chan struct{})
	go m.pollLoop(ctx)

	return nil
}

// Stop cancels the polling loop and closes the encrypted store.
func (m *Module) Stop() error {
	if m.cancelPoll != nil {
		m.cancelPoll()
		<-m.pollDone
	}
	if m.store != nil {
		return m.store.Close()
	}
	return nil
}

// --- Persistence ---

type persistedData struct {
	Endpoints map[string]*Endpoint        `json:"endpoints"`
	Results   map[string][]*CheckResult   `json:"results"`
	SSLInfo   map[string]*SSLInfo         `json:"sslInfo"`
	Incidents []*Incident                 `json:"incidents"`
	NextID    int                         `json:"nextId"`
}

func (m *Module) loadData() error {
	data, err := m.store.Get("pulse:data")
	if err != nil {
		return err
	}
	if data == nil {
		return nil
	}

	var stored persistedData
	if err := json.Unmarshal(data, &stored); err != nil {
		return err
	}
	if stored.Endpoints != nil {
		m.endpoints = stored.Endpoints
	}
	if stored.Results != nil {
		m.results = stored.Results
	}
	if stored.SSLInfo != nil {
		m.sslInfo = stored.SSLInfo
	}
	if stored.Incidents != nil {
		m.incidents = stored.Incidents
	}
	m.nextID = stored.NextID
	return nil
}

func (m *Module) persistData() error {
	stored := persistedData{
		Endpoints: m.endpoints,
		Results:   m.results,
		SSLInfo:   m.sslInfo,
		Incidents: m.incidents,
		NextID:    m.nextID,
	}
	data, err := json.Marshal(stored)
	if err != nil {
		return err
	}
	return m.store.Put("pulse:data", data)
}

// --- Polling ---

func (m *Module) pollLoop(ctx context.Context) {
	defer close(m.pollDone)

	for {
		// Determine the shortest interval across all endpoints.
		interval := m.shortestInterval()

		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
			m.pollAllEndpoints()
		}
	}
}

// shortestInterval returns the shortest check interval across all endpoints,
// defaulting to 60 seconds if no endpoints are configured.
func (m *Module) shortestInterval() time.Duration {
	m.mu.RLock()
	defer m.mu.RUnlock()

	shortest := 60
	for _, ep := range m.endpoints {
		if ep.Interval > 0 && ep.Interval < shortest {
			shortest = ep.Interval
		}
	}
	return time.Duration(shortest) * time.Second
}

// pollAllEndpoints checks all endpoints that are due for a health check.
func (m *Module) pollAllEndpoints() {
	m.mu.RLock()
	ids := make([]string, 0, len(m.endpoints))
	for id := range m.endpoints {
		ids = append(ids, id)
	}
	m.mu.RUnlock()

	for _, id := range ids {
		m.CheckEndpoint(id)
	}
}

// --- Endpoint management ---

// AddEndpoint registers a new endpoint to monitor.
func (m *Module) AddEndpoint(name, url, method string, interval int) (*Endpoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if name == "" || url == "" {
		return nil, fmt.Errorf("name and url are required")
	}
	if method == "" {
		method = "GET"
	}
	if interval <= 0 {
		interval = 60
	}

	ep := &Endpoint{
		ID:        fmt.Sprintf("ep-%d", m.nextID),
		Name:      name,
		URL:       url,
		Method:    method,
		Interval:  interval,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	m.nextID++
	m.endpoints[ep.ID] = ep
	m.results[ep.ID] = make([]*CheckResult, 0)

	if err := m.persistData(); err != nil {
		return nil, err
	}

	m.notifySubscribersLocked()
	return ep, nil
}

// RemoveEndpoint removes an endpoint and its associated data.
func (m *Module) RemoveEndpoint(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.endpoints, id)
	delete(m.results, id)
	delete(m.sslInfo, id)

	if err := m.persistData(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// ListEndpoints returns all configured endpoints.
func (m *Module) ListEndpoints() []*Endpoint {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Endpoint, 0, len(m.endpoints))
	for _, ep := range m.endpoints {
		result = append(result, ep)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result
}

// --- Health checking ---

// CheckEndpoint performs a health check on a single endpoint.
func (m *Module) CheckEndpoint(id string) (*CheckResult, error) {
	m.mu.RLock()
	ep, ok := m.endpoints[id]
	if !ok {
		m.mu.RUnlock()
		return nil, fmt.Errorf("endpoint %q not found", id)
	}
	url := ep.URL
	method := ep.Method
	m.mu.RUnlock()

	result := m.performCheck(id, url, method)

	m.mu.Lock()
	defer m.mu.Unlock()

	// Record result
	m.results[id] = append(m.results[id], result)
	if len(m.results[id]) > maxResultsPerEndpoint {
		m.results[id] = m.results[id][len(m.results[id])-maxResultsPerEndpoint:]
	}

	// Check for status change and create incident
	m.checkForIncident(id, result)

	if err := m.persistData(); err != nil {
		return result, err
	}

	m.notifySubscribersLocked()
	return result, nil
}

func (m *Module) performCheck(endpointID, url, method string) *CheckResult {
	start := time.Now()
	result := &CheckResult{
		EndpointID: endpointID,
		Timestamp:  start.UTC().Format(time.RFC3339),
	}

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		result.ErrorMessage = err.Error()
		result.ResponseMs = float64(time.Since(start).Milliseconds())
		return result
	}

	resp, err := m.httpClient.Do(req)
	result.ResponseMs = float64(time.Since(start).Milliseconds())

	if err != nil {
		result.ErrorMessage = err.Error()
		return result
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode
	result.IsUp = resp.StatusCode >= 200 && resp.StatusCode < 400

	return result
}

func (m *Module) checkForIncident(endpointID string, result *CheckResult) {
	results := m.results[endpointID]
	if len(results) < 2 {
		return
	}

	prev := results[len(results)-2]
	if prev.IsUp && !result.IsUp {
		m.incidents = append(m.incidents, &Incident{
			ID:         fmt.Sprintf("inc-%d", m.nextID),
			EndpointID: endpointID,
			Type:       "down",
			Timestamp:  result.Timestamp,
			StatusCode: result.StatusCode,
			Message:    result.ErrorMessage,
		})
		m.nextID++
	} else if !prev.IsUp && result.IsUp {
		m.incidents = append(m.incidents, &Incident{
			ID:         fmt.Sprintf("inc-%d", m.nextID),
			EndpointID: endpointID,
			Type:       "up",
			Timestamp:  result.Timestamp,
			StatusCode: result.StatusCode,
			Message:    "Recovered",
		})
		m.nextID++
	}
}

// CheckSSL retrieves SSL certificate info for an HTTPS endpoint.
func (m *Module) CheckSSL(id string) (*SSLInfo, error) {
	m.mu.RLock()
	ep, ok := m.endpoints[id]
	if !ok {
		m.mu.RUnlock()
		return nil, fmt.Errorf("endpoint %q not found", id)
	}
	url := ep.URL
	m.mu.RUnlock()

	if !strings.HasPrefix(url, "https://") {
		return nil, fmt.Errorf("SSL check requires HTTPS URL")
	}

	info, err := fetchSSLInfo(id, url)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.sslInfo[id] = info

	if err := m.persistData(); err != nil {
		return info, err
	}

	m.notifySubscribersLocked()
	return info, nil
}

func fetchSSLInfo(endpointID, url string) (*SSLInfo, error) {
	// Extract host from URL
	host := strings.TrimPrefix(url, "https://")
	host = strings.TrimPrefix(host, "http://")
	if idx := strings.Index(host, "/"); idx > 0 {
		host = host[:idx]
	}
	if !strings.Contains(host, ":") {
		host += ":443"
	}

	conn, err := tls.Dial("tcp", host, &tls.Config{
		InsecureSkipVerify: false,
	})
	if err != nil {
		return nil, fmt.Errorf("TLS dial: %w", err)
	}
	defer conn.Close()

	certs := conn.ConnectionState().PeerCertificates
	if len(certs) == 0 {
		return nil, fmt.Errorf("no certificates found")
	}

	cert := certs[0]
	now := time.Now().UTC()
	daysLeft := int(cert.NotAfter.Sub(now).Hours() / 24)

	return &SSLInfo{
		EndpointID: endpointID,
		Issuer:     cert.Issuer.CommonName,
		Subject:    cert.Subject.CommonName,
		NotBefore:  cert.NotBefore.UTC().Format(time.RFC3339),
		NotAfter:   cert.NotAfter.UTC().Format(time.RFC3339),
		DaysLeft:   daysLeft,
		CheckedAt:  now.Format(time.RFC3339),
	}, nil
}

// --- Calculations ---

// UptimePercent calculates the uptime percentage for an endpoint over a duration.
func (m *Module) UptimePercent(endpointID string, duration time.Duration) float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.uptimePercentLocked(endpointID, duration)
}

func (m *Module) uptimePercentLocked(endpointID string, duration time.Duration) float64 {
	results := m.results[endpointID]
	if len(results) == 0 {
		return 100.0 // No checks yet = assume up
	}

	cutoff := time.Now().UTC().Add(-duration)
	total := 0
	up := 0

	for _, r := range results {
		ts, err := time.Parse(time.RFC3339, r.Timestamp)
		if err != nil {
			continue
		}
		if ts.Before(cutoff) {
			continue
		}
		total++
		if r.IsUp {
			up++
		}
	}

	if total == 0 {
		return 100.0
	}
	return math.Round(float64(up)/float64(total)*10000) / 100
}

// ResponseTimePercentiles calculates p50, p95, p99 response times for an endpoint
// over the given duration.
func (m *Module) ResponseTimePercentiles(endpointID string, duration time.Duration) (p50, p95, p99 float64) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.responseTimePercentilesLocked(endpointID, duration)
}

func (m *Module) responseTimePercentilesLocked(endpointID string, duration time.Duration) (p50, p95, p99 float64) {
	results := m.results[endpointID]
	if len(results) == 0 {
		return 0, 0, 0
	}

	cutoff := time.Now().UTC().Add(-duration)
	var times []float64

	for _, r := range results {
		ts, err := time.Parse(time.RFC3339, r.Timestamp)
		if err != nil {
			continue
		}
		if ts.Before(cutoff) {
			continue
		}
		if r.ResponseMs > 0 {
			times = append(times, r.ResponseMs)
		}
	}

	if len(times) == 0 {
		return 0, 0, 0
	}

	sort.Float64s(times)
	p50 = percentile(times, 50)
	p95 = percentile(times, 95)
	p99 = percentile(times, 99)
	return
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	rank := p / 100 * float64(len(sorted)-1)
	lower := int(math.Floor(rank))
	upper := int(math.Ceil(rank))
	if lower == upper || upper >= len(sorted) {
		return math.Round(sorted[lower]*100) / 100
	}
	frac := rank - float64(lower)
	return math.Round((sorted[lower]*(1-frac)+sorted[upper]*frac)*100) / 100
}

// ListIncidents returns all recorded incidents, newest first.
func (m *Module) ListIncidents() []*Incident {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Incident, len(m.incidents))
	copy(result, m.incidents)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Timestamp > result[j].Timestamp
	})
	return result
}

// RecordCheckResult records a check result directly (used for testing).
func (m *Module) RecordCheckResult(result *CheckResult) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.results[result.EndpointID] = append(m.results[result.EndpointID], result)
	if len(m.results[result.EndpointID]) > maxResultsPerEndpoint {
		m.results[result.EndpointID] = m.results[result.EndpointID][len(m.results[result.EndpointID])-maxResultsPerEndpoint:]
	}

	m.checkForIncident(result.EndpointID, result)
}

// SetSSLInfo sets SSL info directly (used for testing).
func (m *Module) SetSSLInfo(info *SSLInfo) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sslInfo[info.EndpointID] = info
}

// --- UIProvider interface ---

// CurrentView returns the PULSE module's current UI view.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()

	endpoints := make([]*Endpoint, 0, len(m.endpoints))
	for _, ep := range m.endpoints {
		endpoints = append(endpoints, ep)
	}
	sort.Slice(endpoints, func(i, j int) bool {
		return endpoints[i].Name < endpoints[j].Name
	})

	components := make([]*pb.UIComponent, 0, 10)

	// 1. Header
	headerLevel := int32(1)
	headerContent := "PULSE — Health & Uptime Monitor"
	components = append(components, &pb.UIComponent{
		Id:      "pulse-header",
		Type:    "header",
		Level:   &headerLevel,
		Content: &headerContent,
	})

	// 2. Metrics row
	totalEndpoints := len(endpoints)
	healthyCount := 0
	for _, ep := range endpoints {
		results := m.results[ep.ID]
		if len(results) > 0 && results[len(results)-1].IsUp {
			healthyCount++
		}
	}

	incidentCount := len(m.incidents)
	sslWarnings := 0
	for _, info := range m.sslInfo {
		if info.DaysLeft <= 30 {
			sslWarnings++
		}
	}

	components = append(components, &pb.UIComponent{
		Id:   "pulse-metrics",
		Type: "metric_row",
		Metrics: []*pb.Metric{
			{
				Label: "Endpoints",
				Value: fmt.Sprintf("%d", totalEndpoints),
				Trend: "flat",
			},
			{
				Label: "Healthy",
				Value: fmt.Sprintf("%d/%d", healthyCount, totalEndpoints),
				Trend: uptimeTrend(healthyCount, totalEndpoints),
			},
			{
				Label: "Incidents",
				Value: fmt.Sprintf("%d", incidentCount),
				Trend: "flat",
			},
			{
				Label: "SSL Warnings",
				Value: fmt.Sprintf("%d", sslWarnings),
				Trend: sslTrend(sslWarnings),
			},
		},
	})

	// 3. Uptime table (per-endpoint status)
	uptimeRows := make([]*pb.RowData, 0, len(endpoints))
	for _, ep := range endpoints {
		uptime24h := m.uptimePercentLocked(ep.ID, 24*time.Hour)
		uptime7d := m.uptimePercentLocked(ep.ID, 7*24*time.Hour)
		uptime30d := m.uptimePercentLocked(ep.ID, 30*24*time.Hour)
		p50, p95, p99 := m.responseTimePercentilesLocked(ep.ID, 24*time.Hour)

		lastStatus := "unknown"
		results := m.results[ep.ID]
		if len(results) > 0 {
			if results[len(results)-1].IsUp {
				lastStatus = "up"
			} else {
				lastStatus = "down"
			}
		}

		uptimeRows = append(uptimeRows, &pb.RowData{
			Values: map[string]string{
				"name":       ep.Name,
				"url":        ep.URL,
				"status":     lastStatus,
				"uptime_24h": fmt.Sprintf("%.2f%%", uptime24h),
				"uptime_7d":  fmt.Sprintf("%.2f%%", uptime7d),
				"uptime_30d": fmt.Sprintf("%.2f%%", uptime30d),
				"p50":        fmt.Sprintf("%.0fms", p50),
				"p95":        fmt.Sprintf("%.0fms", p95),
				"p99":        fmt.Sprintf("%.0fms", p99),
				"id":         ep.ID,
			},
		})
	}

	components = append(components, &pb.UIComponent{
		Id:   "pulse-uptime-table",
		Type: "table",
		Columns: []*pb.TableColumn{
			{Key: "name", Label: "Name", Sortable: true},
			{Key: "url", Label: "URL", Sortable: false},
			{Key: "status", Label: "Status", Sortable: true},
			{Key: "uptime_24h", Label: "24h", Sortable: true},
			{Key: "uptime_7d", Label: "7d", Sortable: true},
			{Key: "uptime_30d", Label: "30d", Sortable: true},
			{Key: "p50", Label: "p50", Sortable: true},
			{Key: "p95", Label: "p95", Sortable: true},
			{Key: "p99", Label: "p99", Sortable: true},
		},
		Rows: uptimeRows,
	})

	// 4. Response time chart (last 24h for all endpoints)
	chartData := make([]*pb.ChartDataPoint, 0)
	for _, ep := range endpoints {
		results := m.results[ep.ID]
		cutoff := time.Now().UTC().Add(-24 * time.Hour)
		for _, r := range results {
			ts, err := time.Parse(time.RFC3339, r.Timestamp)
			if err != nil || ts.Before(cutoff) {
				continue
			}
			chartData = append(chartData, &pb.ChartDataPoint{
				Values: map[string]string{
					"time":     r.Timestamp,
					"endpoint": ep.Name,
					"ms":       fmt.Sprintf("%.0f", r.ResponseMs),
				},
			})
		}
	}
	chartType := "line"
	components = append(components, &pb.UIComponent{
		Id:        "pulse-response-chart",
		Type:      "chart",
		ChartType: &chartType,
		ChartData: chartData,
	})

	// 5. SSL certificate expiry table
	sslRows := make([]*pb.RowData, 0)
	for _, ep := range endpoints {
		info, ok := m.sslInfo[ep.ID]
		if !ok {
			continue
		}
		alertLevel := "ok"
		if info.DaysLeft <= 7 {
			alertLevel = "critical"
		} else if info.DaysLeft <= 14 {
			alertLevel = "warning"
		} else if info.DaysLeft <= 30 {
			alertLevel = "caution"
		}
		sslRows = append(sslRows, &pb.RowData{
			Values: map[string]string{
				"name":      ep.Name,
				"issuer":    info.Issuer,
				"expires":   info.NotAfter,
				"days_left": fmt.Sprintf("%d", info.DaysLeft),
				"alert":     alertLevel,
			},
		})
	}
	if len(sslRows) > 0 {
		components = append(components, &pb.UIComponent{
			Id:   "pulse-ssl-table",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "name", Label: "Endpoint", Sortable: true},
				{Key: "issuer", Label: "Issuer", Sortable: true},
				{Key: "expires", Label: "Expires", Sortable: true},
				{Key: "days_left", Label: "Days Left", Sortable: true},
				{Key: "alert", Label: "Alert", Sortable: true},
			},
			Rows: sslRows,
		})
	}

	// 6. Incident timeline (last 20)
	incidents := make([]*Incident, len(m.incidents))
	copy(incidents, m.incidents)
	sort.Slice(incidents, func(i, j int) bool {
		return incidents[i].Timestamp > incidents[j].Timestamp
	})
	if len(incidents) > 20 {
		incidents = incidents[:20]
	}

	incidentItems := make([]string, 0, len(incidents))
	for _, inc := range incidents {
		epName := inc.EndpointID
		if ep, ok := m.endpoints[inc.EndpointID]; ok {
			epName = ep.Name
		}
		icon := "🔴"
		if inc.Type == "up" {
			icon = "🟢"
		}
		incidentItems = append(incidentItems,
			fmt.Sprintf("%s %s %s — %s", icon, inc.Timestamp, epName, inc.Message))
	}
	if len(incidentItems) > 0 {
		components = append(components, &pb.UIComponent{
			Id:    "pulse-incidents",
			Type:  "list",
			Items: incidentItems,
		})
	}

	// 7. Add endpoint form
	components = append(components, &pb.UIComponent{
		Id:   "pulse-add-form",
		Type: "form",
		Fields: []*pb.FormField{
			{Id: "name", Label: "Name", FieldType: "text",
				Placeholder: strPtr("My API"), Required: true},
			{Id: "url", Label: "URL", FieldType: "text",
				Placeholder: strPtr("https://api.example.com/health"), Required: true},
			{Id: "method", Label: "Method", FieldType: "select",
				Options: []string{"GET", "HEAD"}},
			{Id: "interval", Label: "Interval (sec)", FieldType: "number",
				Placeholder: strPtr("60")},
		},
	})

	// 8. Status bar
	statusContent := fmt.Sprintf("PULSE • %d endpoints • %d healthy • %d incidents",
		totalEndpoints, healthyCount, incidentCount)
	components = append(components, &pb.UIComponent{
		Id:      "pulse-status",
		Type:    "status_bar",
		Content: &statusContent,
	})

	refreshShortcut := strPtr("Ctrl+R")
	addShortcut := strPtr("Ctrl+N")

	return &pb.UIViewUpdate{
		Module:     "pulse",
		Components: components,
		Actions: []*pb.UIAction{
			{Id: "add-endpoint", Label: "Add Endpoint", Shortcut: addShortcut, Enabled: true},
			{Id: "remove-endpoint", Label: "Remove", Enabled: true},
			{Id: "test-now", Label: "Test Now", Enabled: true},
			{Id: "check-ssl", Label: "Check SSL", Enabled: true},
			{Id: "view-incidents", Label: "View Incidents", Enabled: true},
			{Id: "refresh", Label: "Refresh", Shortcut: refreshShortcut, Enabled: true},
		},
	}
}

// HandleEvent processes user interactions with the PULSE UI.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId == nil {
		return nil
	}

	switch *event.ActionId {
	case "add-endpoint":
		name := event.Data["name"]
		url := event.Data["url"]
		method := event.Data["method"]
		intervalStr := event.Data["interval"]

		if name == "" || url == "" {
			return fmt.Errorf("name and url are required")
		}

		interval := 60
		if intervalStr != "" {
			if _, err := fmt.Sscanf(intervalStr, "%d", &interval); err != nil {
				return fmt.Errorf("invalid interval: %w", err)
			}
		}

		_, err := m.AddEndpoint(name, url, method, interval)
		return err

	case "remove-endpoint":
		id := event.Data["id"]
		if id == "" {
			return fmt.Errorf("endpoint id is required")
		}
		return m.RemoveEndpoint(id)

	case "test-now":
		id := event.Data["id"]
		if id == "" {
			return fmt.Errorf("endpoint id is required")
		}
		_, err := m.CheckEndpoint(id)
		return err

	case "check-ssl":
		id := event.Data["id"]
		if id == "" {
			return fmt.Errorf("endpoint id is required")
		}
		_, err := m.CheckSSL(id)
		return err

	case "view-incidents":
		m.notifySubscribers()

	case "refresh":
		m.notifySubscribers()
	}

	return nil
}

// Subscribe registers a callback for view updates.
func (m *Module) Subscribe(fn func(*pb.UIViewUpdate)) func() {
	m.subMu.Lock()
	id := m.nextSubID
	m.nextSubID++
	m.subscribers[id] = fn
	m.subMu.Unlock()

	return func() {
		m.subMu.Lock()
		delete(m.subscribers, id)
		m.subMu.Unlock()
	}
}

func (m *Module) notifySubscribers() {
	view := m.CurrentView()
	m.subMu.RLock()
	defer m.subMu.RUnlock()
	for _, fn := range m.subscribers {
		fn(view)
	}
}

func (m *Module) notifySubscribersLocked() {
	m.mu.Unlock()
	m.notifySubscribers()
	m.mu.Lock()
}

// --- Helpers ---

func strPtr(s string) *string { return &s }

func uptimeTrend(healthy, total int) string {
	if total == 0 {
		return "flat"
	}
	ratio := float64(healthy) / float64(total)
	if ratio >= 1.0 {
		return "flat"
	}
	if ratio < 0.9 {
		return "down"
	}
	return "flat"
}

func sslTrend(warnings int) string {
	if warnings > 0 {
		return "up"
	}
	return "flat"
}

// Verify interface compliance at compile time.
var (
	_ module.Module     = (*Module)(nil)
	_ module.UIProvider = (*Module)(nil)
)
