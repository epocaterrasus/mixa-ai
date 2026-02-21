package pulse

import (
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

var testKey = []byte("01234567890123456789012345678901")

func newTestModule(t *testing.T) *Module {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "pulse-test.db")
	mod := New(dbPath, testKey)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		mod.Stop()
	})
	return mod
}

// --- Module identity ---

func TestModuleIdentity(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	if mod.Name() != "pulse" {
		t.Fatalf("expected name 'pulse', got %q", mod.Name())
	}
	if mod.DisplayName() != "PULSE" {
		t.Fatalf("expected display name 'PULSE', got %q", mod.DisplayName())
	}
	if mod.Description() == "" {
		t.Fatal("expected non-empty description")
	}
}

func TestStartStop(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := mod.Stop(); err != nil {
		t.Fatalf("Stop: %v", err)
	}
}

func TestUIProviderInterface(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)
	var _ module.UIProvider = mod
}

// --- Endpoint management ---

func TestAddEndpoint(t *testing.T) {
	mod := newTestModule(t)

	ep, err := mod.AddEndpoint("My API", "https://api.example.com/health", "GET", 60)
	if err != nil {
		t.Fatalf("AddEndpoint: %v", err)
	}

	if ep.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if ep.Name != "My API" {
		t.Fatalf("expected name 'My API', got %q", ep.Name)
	}
	if ep.URL != "https://api.example.com/health" {
		t.Fatalf("expected URL, got %q", ep.URL)
	}
}

func TestAddEndpointDefaults(t *testing.T) {
	mod := newTestModule(t)

	ep, err := mod.AddEndpoint("Test", "https://example.com", "", 0)
	if err != nil {
		t.Fatalf("AddEndpoint: %v", err)
	}

	if ep.Method != "GET" {
		t.Fatalf("expected default method 'GET', got %q", ep.Method)
	}
	if ep.Interval != 60 {
		t.Fatalf("expected default interval 60, got %d", ep.Interval)
	}
}

func TestAddEndpointValidation(t *testing.T) {
	mod := newTestModule(t)

	_, err := mod.AddEndpoint("", "https://example.com", "", 0)
	if err == nil {
		t.Fatal("expected error for missing name")
	}

	_, err = mod.AddEndpoint("Test", "", "", 0)
	if err == nil {
		t.Fatal("expected error for missing URL")
	}
}

func TestRemoveEndpoint(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)
	if err := mod.RemoveEndpoint(ep.ID); err != nil {
		t.Fatalf("RemoveEndpoint: %v", err)
	}

	endpoints := mod.ListEndpoints()
	if len(endpoints) != 0 {
		t.Fatalf("expected 0 endpoints, got %d", len(endpoints))
	}
}

func TestListEndpointsSorted(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEndpoint("Zebra", "https://z.com", "", 60)
	mod.AddEndpoint("Alpha", "https://a.com", "", 60)
	mod.AddEndpoint("Middle", "https://m.com", "", 60)

	endpoints := mod.ListEndpoints()
	if len(endpoints) != 3 {
		t.Fatalf("expected 3 endpoints, got %d", len(endpoints))
	}
	if endpoints[0].Name != "Alpha" {
		t.Fatalf("expected first 'Alpha', got %q", endpoints[0].Name)
	}
	if endpoints[2].Name != "Zebra" {
		t.Fatalf("expected last 'Zebra', got %q", endpoints[2].Name)
	}
}

// --- Uptime calculation ---

func TestUptimePercentAllUp(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	for i := 0; i < 10; i++ {
		mod.RecordCheckResult(&CheckResult{
			EndpointID: ep.ID,
			Timestamp:  now.Add(-time.Duration(i) * time.Minute).Format(time.RFC3339),
			StatusCode: 200,
			ResponseMs: 100,
			IsUp:       true,
		})
	}

	uptime := mod.UptimePercent(ep.ID, 1*time.Hour)
	if uptime != 100.0 {
		t.Fatalf("expected 100%% uptime, got %.2f%%", uptime)
	}
}

func TestUptimePercentPartialDown(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// 8 up, 2 down = 80%
	for i := 0; i < 8; i++ {
		mod.RecordCheckResult(&CheckResult{
			EndpointID: ep.ID,
			Timestamp:  now.Add(-time.Duration(i) * time.Minute).Format(time.RFC3339),
			StatusCode: 200,
			ResponseMs: 100,
			IsUp:       true,
		})
	}
	for i := 8; i < 10; i++ {
		mod.RecordCheckResult(&CheckResult{
			EndpointID: ep.ID,
			Timestamp:  now.Add(-time.Duration(i) * time.Minute).Format(time.RFC3339),
			StatusCode: 503,
			ResponseMs: 50,
			IsUp:       false,
		})
	}

	uptime := mod.UptimePercent(ep.ID, 1*time.Hour)
	if uptime != 80.0 {
		t.Fatalf("expected 80%% uptime, got %.2f%%", uptime)
	}
}

func TestUptimePercentNoChecks(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	uptime := mod.UptimePercent(ep.ID, 1*time.Hour)
	if uptime != 100.0 {
		t.Fatalf("expected 100%% uptime (no checks), got %.2f%%", uptime)
	}
}

func TestUptimePercentFiltersByDuration(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// Old check (25h ago) — down
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-25 * time.Hour).Format(time.RFC3339),
		StatusCode: 503,
		IsUp:       false,
	})
	// Recent check — up
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-5 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})

	// 24h window should only see the recent up check
	uptime := mod.UptimePercent(ep.ID, 24*time.Hour)
	if uptime != 100.0 {
		t.Fatalf("expected 100%% for 24h window, got %.2f%%", uptime)
	}
}

// --- Response time percentiles ---

func TestResponseTimePercentiles(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// Add 100 results with response times 1-100
	for i := 1; i <= 100; i++ {
		mod.RecordCheckResult(&CheckResult{
			EndpointID: ep.ID,
			Timestamp:  now.Add(-time.Duration(100-i) * time.Minute).Format(time.RFC3339),
			StatusCode: 200,
			ResponseMs: float64(i),
			IsUp:       true,
		})
	}

	p50, p95, p99 := mod.ResponseTimePercentiles(ep.ID, 24*time.Hour)

	// p50 should be around 50
	if p50 < 49 || p50 > 51 {
		t.Fatalf("expected p50 ~50, got %.2f", p50)
	}
	// p95 should be around 95
	if p95 < 94 || p95 > 96 {
		t.Fatalf("expected p95 ~95, got %.2f", p95)
	}
	// p99 should be around 99
	if p99 < 98 || p99 > 100 {
		t.Fatalf("expected p99 ~99, got %.2f", p99)
	}
}

func TestResponseTimePercentilesNoData(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	p50, p95, p99 := mod.ResponseTimePercentiles(ep.ID, 24*time.Hour)
	if p50 != 0 || p95 != 0 || p99 != 0 {
		t.Fatalf("expected all zeros with no data, got p50=%f p95=%f p99=%f", p50, p95, p99)
	}
}

// --- Percentile function ---

func TestPercentileFunction(t *testing.T) {
	tests := []struct {
		name   string
		data   []float64
		p      float64
		expect float64
	}{
		{"empty", nil, 50, 0},
		{"single", []float64{100}, 50, 100},
		{"two values p50", []float64{10, 20}, 50, 15},
		{"three values p50", []float64{10, 20, 30}, 50, 20},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := percentile(tt.data, tt.p)
			if got != tt.expect {
				t.Fatalf("percentile(%v, %f) = %f, want %f", tt.data, tt.p, got, tt.expect)
			}
		})
	}
}

// --- Incident detection ---

func TestIncidentDetectionDownTransition(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// First check: up
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-2 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})
	// Second check: down → should create incident
	mod.RecordCheckResult(&CheckResult{
		EndpointID:   ep.ID,
		Timestamp:    now.Add(-1 * time.Minute).Format(time.RFC3339),
		StatusCode:   503,
		IsUp:         false,
		ErrorMessage: "Service unavailable",
	})

	incidents := mod.ListIncidents()
	if len(incidents) != 1 {
		t.Fatalf("expected 1 incident, got %d", len(incidents))
	}
	if incidents[0].Type != "down" {
		t.Fatalf("expected incident type 'down', got %q", incidents[0].Type)
	}
}

func TestIncidentDetectionRecovery(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// down
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-3 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-2 * time.Minute).Format(time.RFC3339),
		StatusCode: 503,
		IsUp:       false,
	})
	// up again → recovery incident
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-1 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})

	incidents := mod.ListIncidents()
	if len(incidents) != 2 {
		t.Fatalf("expected 2 incidents (down+up), got %d", len(incidents))
	}

	// Newest first
	if incidents[0].Type != "up" {
		t.Fatalf("expected first incident 'up' (recovery), got %q", incidents[0].Type)
	}
	if incidents[1].Type != "down" {
		t.Fatalf("expected second incident 'down', got %q", incidents[1].Type)
	}
}

func TestNoIncidentOnStableStatus(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	now := time.Now().UTC()
	// Both up — no incident
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-2 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Add(-1 * time.Minute).Format(time.RFC3339),
		StatusCode: 200,
		IsUp:       true,
	})

	incidents := mod.ListIncidents()
	if len(incidents) != 0 {
		t.Fatalf("expected 0 incidents for stable status, got %d", len(incidents))
	}
}

// --- SSL info ---

func TestSetSSLInfo(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	mod.SetSSLInfo(&SSLInfo{
		EndpointID: ep.ID,
		Issuer:     "Let's Encrypt",
		Subject:    "example.com",
		NotBefore:  "2024-01-01T00:00:00Z",
		NotAfter:   "2024-12-31T00:00:00Z",
		DaysLeft:   45,
		CheckedAt:  time.Now().UTC().Format(time.RFC3339),
	})

	view := mod.CurrentView()

	// Should have SSL table
	sslTableFound := false
	for _, c := range view.Components {
		if c.Id == "pulse-ssl-table" {
			sslTableFound = true
			if len(c.Rows) != 1 {
				t.Fatalf("expected 1 SSL row, got %d", len(c.Rows))
			}
			if c.Rows[0].Values["issuer"] != "Let's Encrypt" {
				t.Fatalf("expected issuer 'Let's Encrypt', got %q", c.Rows[0].Values["issuer"])
			}
			break
		}
	}
	if !sslTableFound {
		t.Fatal("expected SSL table in view")
	}
}

func TestSSLAlertLevels(t *testing.T) {
	mod := newTestModule(t)

	ep1, _ := mod.AddEndpoint("OK", "https://ok.example.com", "", 60)
	ep2, _ := mod.AddEndpoint("Caution", "https://caution.example.com", "", 60)
	ep3, _ := mod.AddEndpoint("Warning", "https://warning.example.com", "", 60)
	ep4, _ := mod.AddEndpoint("Critical", "https://critical.example.com", "", 60)

	mod.SetSSLInfo(&SSLInfo{EndpointID: ep1.ID, DaysLeft: 60})
	mod.SetSSLInfo(&SSLInfo{EndpointID: ep2.ID, DaysLeft: 25})
	mod.SetSSLInfo(&SSLInfo{EndpointID: ep3.ID, DaysLeft: 12})
	mod.SetSSLInfo(&SSLInfo{EndpointID: ep4.ID, DaysLeft: 5})

	view := mod.CurrentView()

	for _, c := range view.Components {
		if c.Id != "pulse-ssl-table" {
			continue
		}
		alertMap := make(map[string]string)
		for _, row := range c.Rows {
			alertMap[row.Values["name"]] = row.Values["alert"]
		}

		if alertMap["OK"] != "ok" {
			t.Fatalf("expected OK alert 'ok', got %q", alertMap["OK"])
		}
		if alertMap["Caution"] != "caution" {
			t.Fatalf("expected Caution alert 'caution', got %q", alertMap["Caution"])
		}
		if alertMap["Warning"] != "warning" {
			t.Fatalf("expected Warning alert 'warning', got %q", alertMap["Warning"])
		}
		if alertMap["Critical"] != "critical" {
			t.Fatalf("expected Critical alert 'critical', got %q", alertMap["Critical"])
		}
		return
	}
	t.Fatal("SSL table not found")
}

// --- Persistence ---

func TestPersistenceAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "persist.db")

	mod1 := New(dbPath, testKey)
	if err := mod1.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	ep, _ := mod1.AddEndpoint("Test", "https://example.com", "GET", 30)
	mod1.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		StatusCode: 200,
		ResponseMs: 150,
		IsUp:       true,
	})
	mod1.persistData()
	mod1.Stop()

	mod2 := New(dbPath, testKey)
	if err := mod2.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer mod2.Stop()

	endpoints := mod2.ListEndpoints()
	if len(endpoints) != 1 {
		t.Fatalf("expected 1 endpoint after restart, got %d", len(endpoints))
	}
	if endpoints[0].Name != "Test" {
		t.Fatalf("expected name 'Test', got %q", endpoints[0].Name)
	}
}

// --- UIProvider ---

func TestCurrentView(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("API", "https://api.example.com", "GET", 60)

	now := time.Now().UTC()
	mod.RecordCheckResult(&CheckResult{
		EndpointID: ep.ID,
		Timestamp:  now.Format(time.RFC3339),
		StatusCode: 200,
		ResponseMs: 120,
		IsUp:       true,
	})

	view := mod.CurrentView()

	if view.Module != "pulse" {
		t.Fatalf("expected module 'pulse', got %q", view.Module)
	}

	// Check header
	if view.Components[0].Type != "header" {
		t.Fatalf("expected header, got %q", view.Components[0].Type)
	}
	if !strings.Contains(*view.Components[0].Content, "PULSE") {
		t.Fatal("expected PULSE in header")
	}

	// Check metrics
	var metrics *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "metric_row" {
			metrics = c
			break
		}
	}
	if metrics == nil {
		t.Fatal("expected metric_row")
	}
	if len(metrics.Metrics) < 4 {
		t.Fatalf("expected at least 4 metrics, got %d", len(metrics.Metrics))
	}

	// Check uptime table
	var table *pb.UIComponent
	for _, c := range view.Components {
		if c.Id == "pulse-uptime-table" {
			table = c
			break
		}
	}
	if table == nil {
		t.Fatal("expected uptime table")
	}
	if len(table.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(table.Rows))
	}
	if table.Rows[0].Values["status"] != "up" {
		t.Fatalf("expected status 'up', got %q", table.Rows[0].Values["status"])
	}

	// Check actions
	if len(view.Actions) < 5 {
		t.Fatalf("expected at least 5 actions, got %d", len(view.Actions))
	}
}

// --- Event handling ---

func TestHandleAddEndpointEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "add-endpoint"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "pulse",
		ActionId:  &actionID,
		EventType: "click",
		Data: map[string]string{
			"name": "My API",
			"url":  "https://api.example.com/health",
		},
	})
	if err != nil {
		t.Fatalf("HandleEvent add-endpoint: %v", err)
	}

	endpoints := mod.ListEndpoints()
	if len(endpoints) != 1 {
		t.Fatalf("expected 1 endpoint, got %d", len(endpoints))
	}
}

func TestHandleRemoveEndpointEvent(t *testing.T) {
	mod := newTestModule(t)

	ep, _ := mod.AddEndpoint("Test", "https://example.com", "", 60)

	actionID := "remove-endpoint"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "pulse",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"id": ep.ID},
	})
	if err != nil {
		t.Fatalf("HandleEvent remove-endpoint: %v", err)
	}

	endpoints := mod.ListEndpoints()
	if len(endpoints) != 0 {
		t.Fatalf("expected 0 endpoints, got %d", len(endpoints))
	}
}

func TestHandleRefreshEvent(t *testing.T) {
	mod := newTestModule(t)

	var received *pb.UIViewUpdate
	var mu sync.Mutex

	mod.Subscribe(func(update *pb.UIViewUpdate) {
		mu.Lock()
		received = update
		mu.Unlock()
	})

	actionID := "refresh"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "pulse",
		ActionId:  &actionID,
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("HandleEvent refresh: %v", err)
	}

	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if received == nil {
		t.Fatal("expected subscriber to receive view update")
	}
}

func TestHandleEventNoActionID(t *testing.T) {
	mod := newTestModule(t)

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "pulse",
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("HandleEvent with nil actionId should not error: %v", err)
	}
}

// --- Subscriber pattern ---

func TestSubscribeAndUnsubscribe(t *testing.T) {
	mod := newTestModule(t)

	callCount := 0
	var mu sync.Mutex

	unsubscribe := mod.Subscribe(func(_ *pb.UIViewUpdate) {
		mu.Lock()
		callCount++
		mu.Unlock()
	})

	mod.notifySubscribers()
	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	if callCount != 1 {
		t.Fatalf("expected 1 call, got %d", callCount)
	}
	mu.Unlock()

	unsubscribe()
	mod.notifySubscribers()
	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	if callCount != 1 {
		t.Fatalf("expected still 1 call after unsubscribe, got %d", callCount)
	}
	mu.Unlock()
}

// --- Helpers ---

func TestUptimeTrend(t *testing.T) {
	if uptimeTrend(10, 10) != "flat" {
		t.Fatal("expected flat for all healthy")
	}
	if uptimeTrend(8, 10) != "down" {
		t.Fatal("expected down for <90%")
	}
	if uptimeTrend(0, 0) != "flat" {
		t.Fatal("expected flat for no endpoints")
	}
}

func TestSSLTrend(t *testing.T) {
	if sslTrend(0) != "flat" {
		t.Fatal("expected flat for no warnings")
	}
	if sslTrend(3) != "up" {
		t.Fatal("expected up for warnings")
	}
}
