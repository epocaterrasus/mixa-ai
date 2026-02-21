// Package cost implements the COST (cloud cost tracking) engine module.
// It tracks costs per provider and project, stores time-series cost data
// in encrypted SQLite, supports budget limits with threshold alerts, and
// provides a rich UI via the Fenix UI protocol.
package cost

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	"github.com/mixa-ai/engine/internal/storage"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// CostEntry represents a single cost record.
type CostEntry struct {
	ID        string  `json:"id"`
	Provider  string  `json:"provider"`  // "digitalocean", "aws", "manual"
	Service   string  `json:"service"`   // e.g., "Droplets", "EC2", "S3"
	Amount    float64 `json:"amount"`    // Cost in USD
	Currency  string  `json:"currency"`  // Always "USD" for now
	Date      string  `json:"date"`      // YYYY-MM-DD
	Project   string  `json:"project"`   // Optional project label
	Note      string  `json:"note"`      // Optional description
	CreatedAt string  `json:"createdAt"` // RFC3339
}

// Budget represents a spending limit for a provider or project.
type Budget struct {
	ID        string  `json:"id"`
	Scope     string  `json:"scope"`     // "provider:digitalocean", "project:myapp", or "total"
	Limit     float64 `json:"limit"`     // Monthly budget in USD
	CreatedAt string  `json:"createdAt"` // RFC3339
	UpdatedAt string  `json:"updatedAt"` // RFC3339
}

// PollSchedule controls how frequently cost data is polled from providers.
type PollSchedule string

const (
	PollHourly PollSchedule = "hourly"
	PollDaily  PollSchedule = "daily"
)

// ProviderAdapter defines how to fetch costs from a cloud provider.
type ProviderAdapter interface {
	Name() string
	FetchCosts(from, to time.Time) ([]CostEntry, error)
}

// Module implements the COST cloud cost tracking module.
type Module struct {
	store  *storage.Store
	dbPath string
	encKey []byte

	mu       sync.RWMutex
	entries  []*CostEntry
	budgets  map[string]*Budget // scope -> Budget
	nextID   int

	subMu       sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

// New creates a new COST module. dbPath is the SQLite database location;
// encKey must be exactly 32 bytes for AES-256-GCM.
func New(dbPath string, encKey []byte) *Module {
	return &Module{
		dbPath:      dbPath,
		encKey:      encKey,
		entries:     make([]*CostEntry, 0),
		budgets:     make(map[string]*Budget),
		nextID:      1,
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
}

func (m *Module) Name() string        { return "cost" }
func (m *Module) DisplayName() string { return "COST" }
func (m *Module) Description() string { return "Cloud cost tracking & budget management" }

// Start opens the encrypted store and loads persisted data.
func (m *Module) Start() error {
	store, err := storage.Open(m.dbPath, m.encKey)
	if err != nil {
		return fmt.Errorf("cost: open store: %w", err)
	}
	m.store = store

	if err := m.loadEntries(); err != nil {
		store.Close()
		return fmt.Errorf("cost: load entries: %w", err)
	}
	if err := m.loadBudgets(); err != nil {
		store.Close()
		return fmt.Errorf("cost: load budgets: %w", err)
	}

	return nil
}

// Stop closes the encrypted store.
func (m *Module) Stop() error {
	if m.store != nil {
		return m.store.Close()
	}
	return nil
}

// --- Persistence ---

func (m *Module) loadEntries() error {
	data, err := m.store.Get("cost:entries")
	if err != nil {
		return err
	}
	if data == nil {
		return nil
	}

	var stored struct {
		Entries []*CostEntry `json:"entries"`
		NextID  int          `json:"nextId"`
	}
	if err := json.Unmarshal(data, &stored); err != nil {
		return err
	}
	m.entries = stored.Entries
	m.nextID = stored.NextID
	return nil
}

func (m *Module) persistEntries() error {
	stored := struct {
		Entries []*CostEntry `json:"entries"`
		NextID  int          `json:"nextId"`
	}{
		Entries: m.entries,
		NextID:  m.nextID,
	}
	data, err := json.Marshal(stored)
	if err != nil {
		return err
	}
	return m.store.Put("cost:entries", data)
}

func (m *Module) loadBudgets() error {
	data, err := m.store.Get("cost:budgets")
	if err != nil {
		return err
	}
	if data == nil {
		return nil
	}
	return json.Unmarshal(data, &m.budgets)
}

func (m *Module) persistBudgets() error {
	data, err := json.Marshal(m.budgets)
	if err != nil {
		return err
	}
	return m.store.Put("cost:budgets", data)
}

// --- Data operations ---

// AddEntry adds a new cost entry.
func (m *Module) AddEntry(provider, service string, amount float64, date, project, note string) (*CostEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if provider == "" || service == "" {
		return nil, fmt.Errorf("provider and service are required")
	}
	if amount < 0 {
		return nil, fmt.Errorf("amount must be non-negative")
	}
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}

	entry := &CostEntry{
		ID:        fmt.Sprintf("cost-%d", m.nextID),
		Provider:  provider,
		Service:   service,
		Amount:    amount,
		Currency:  "USD",
		Date:      date,
		Project:   project,
		Note:      note,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	m.nextID++
	m.entries = append(m.entries, entry)

	if err := m.persistEntries(); err != nil {
		return nil, err
	}

	m.notifySubscribersLocked()
	return entry, nil
}

// DeleteEntry removes a cost entry by ID.
func (m *Module) DeleteEntry(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	idx := -1
	for i, e := range m.entries {
		if e.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return nil
	}

	m.entries = append(m.entries[:idx], m.entries[idx+1:]...)

	if err := m.persistEntries(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// ListEntries returns all cost entries sorted by date (newest first).
func (m *Module) ListEntries() []*CostEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*CostEntry, len(m.entries))
	copy(result, m.entries)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date > result[j].Date
	})
	return result
}

// SetBudget creates or updates a budget limit for the given scope.
func (m *Module) SetBudget(scope string, limit float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if scope == "" {
		return fmt.Errorf("scope is required")
	}
	if limit < 0 {
		return fmt.Errorf("budget limit must be non-negative")
	}

	now := time.Now().UTC().Format(time.RFC3339)
	existing, ok := m.budgets[scope]
	if ok {
		existing.Limit = limit
		existing.UpdatedAt = now
	} else {
		m.budgets[scope] = &Budget{
			ID:        fmt.Sprintf("budget-%s", scope),
			Scope:     scope,
			Limit:     limit,
			CreatedAt: now,
			UpdatedAt: now,
		}
	}

	if err := m.persistBudgets(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// DeleteBudget removes a budget.
func (m *Module) DeleteBudget(scope string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.budgets, scope)

	if err := m.persistBudgets(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// GetBudget returns the budget for the given scope.
func (m *Module) GetBudget(scope string) (*Budget, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	b, ok := m.budgets[scope]
	return b, ok
}

// --- Cost calculations ---

// CurrentMonthTotal calculates total spend for the current calendar month.
func (m *Module) CurrentMonthTotal() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.currentMonthTotalLocked()
}

func (m *Module) currentMonthTotalLocked() float64 {
	now := time.Now().UTC()
	prefix := now.Format("2006-01")

	total := 0.0
	for _, e := range m.entries {
		if strings.HasPrefix(e.Date, prefix) {
			total += e.Amount
		}
	}
	return total
}

// ProjectedMonthly estimates the full month cost based on current spending rate.
func (m *Module) ProjectedMonthly() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.projectedMonthlyLocked()
}

func (m *Module) projectedMonthlyLocked() float64 {
	now := time.Now().UTC()
	dayOfMonth := now.Day()
	if dayOfMonth == 0 {
		return 0
	}

	daysInMonth := daysInMonth(now.Year(), now.Month())
	current := m.currentMonthTotalLocked()

	return current * float64(daysInMonth) / float64(dayOfMonth)
}

// ProviderTotals returns spend per provider for the current month.
func (m *Module) ProviderTotals() map[string]float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.providerTotalsLocked()
}

func (m *Module) providerTotalsLocked() map[string]float64 {
	now := time.Now().UTC()
	prefix := now.Format("2006-01")

	totals := make(map[string]float64)
	for _, e := range m.entries {
		if strings.HasPrefix(e.Date, prefix) {
			totals[e.Provider] += e.Amount
		}
	}
	return totals
}

// ServiceBreakdown returns per-service costs for the current month.
func (m *Module) ServiceBreakdown() []ServiceCost {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.serviceBreakdownLocked()
}

// ServiceCost represents aggregated cost for a specific service.
type ServiceCost struct {
	Provider string
	Service  string
	Amount   float64
}

func (m *Module) serviceBreakdownLocked() []ServiceCost {
	now := time.Now().UTC()
	prefix := now.Format("2006-01")

	agg := make(map[string]*ServiceCost)
	for _, e := range m.entries {
		if strings.HasPrefix(e.Date, prefix) {
			key := e.Provider + ":" + e.Service
			if sc, ok := agg[key]; ok {
				sc.Amount += e.Amount
			} else {
				agg[key] = &ServiceCost{
					Provider: e.Provider,
					Service:  e.Service,
					Amount:   e.Amount,
				}
			}
		}
	}

	result := make([]ServiceCost, 0, len(agg))
	for _, sc := range agg {
		result = append(result, *sc)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Amount > result[j].Amount
	})
	return result
}

// DailyCosts returns daily cost totals for the past N days.
func (m *Module) DailyCosts(days int) []DailyCost {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.dailyCostsLocked(days)
}

// DailyCost represents total cost for a single day.
type DailyCost struct {
	Date   string
	Amount float64
}

func (m *Module) dailyCostsLocked(days int) []DailyCost {
	now := time.Now().UTC()
	start := now.AddDate(0, 0, -days+1)

	daily := make(map[string]float64)
	for _, e := range m.entries {
		daily[e.Date] += e.Amount
	}

	result := make([]DailyCost, 0, days)
	for d := start; !d.After(now); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		result = append(result, DailyCost{
			Date:   dateStr,
			Amount: daily[dateStr],
		})
	}
	return result
}

// BudgetAlerts returns budget alert levels for all configured budgets.
func (m *Module) BudgetAlerts() []BudgetAlert {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.budgetAlertsLocked()
}

// BudgetAlert represents the spending status against a budget.
type BudgetAlert struct {
	Scope       string
	Limit       float64
	Spent       float64
	Utilization float64 // 0.0 to 1.0+
	Level       string  // "ok", "warning", "critical", "exceeded"
}

func (m *Module) budgetAlertsLocked() []BudgetAlert {
	now := time.Now().UTC()
	prefix := now.Format("2006-01")

	// Calculate spend per scope
	providerSpend := make(map[string]float64)
	projectSpend := make(map[string]float64)
	totalSpend := 0.0

	for _, e := range m.entries {
		if strings.HasPrefix(e.Date, prefix) {
			providerSpend[e.Provider] += e.Amount
			if e.Project != "" {
				projectSpend[e.Project] += e.Amount
			}
			totalSpend += e.Amount
		}
	}

	alerts := make([]BudgetAlert, 0, len(m.budgets))
	for scope, budget := range m.budgets {
		var spent float64
		if scope == "total" {
			spent = totalSpend
		} else if strings.HasPrefix(scope, "provider:") {
			provider := strings.TrimPrefix(scope, "provider:")
			spent = providerSpend[provider]
		} else if strings.HasPrefix(scope, "project:") {
			project := strings.TrimPrefix(scope, "project:")
			spent = projectSpend[project]
		}

		utilization := 0.0
		if budget.Limit > 0 {
			utilization = spent / budget.Limit
		}

		level := "ok"
		if utilization >= 1.0 {
			level = "exceeded"
		} else if utilization >= 0.9 {
			level = "critical"
		} else if utilization >= 0.8 {
			level = "warning"
		}

		alerts = append(alerts, BudgetAlert{
			Scope:       scope,
			Limit:       budget.Limit,
			Spent:       spent,
			Utilization: utilization,
			Level:       level,
		})
	}

	sort.Slice(alerts, func(i, j int) bool {
		return alerts[i].Utilization > alerts[j].Utilization
	})
	return alerts
}

// ExportCSV generates a CSV string of all cost entries.
func (m *Module) ExportCSV() string {
	entries := m.ListEntries()

	var b strings.Builder
	w := csv.NewWriter(&b)
	w.Write([]string{"ID", "Provider", "Service", "Amount", "Currency", "Date", "Project", "Note"})
	for _, e := range entries {
		w.Write([]string{
			e.ID,
			e.Provider,
			e.Service,
			fmt.Sprintf("%.2f", e.Amount),
			e.Currency,
			e.Date,
			e.Project,
			e.Note,
		})
	}
	w.Flush()
	return b.String()
}

// --- UIProvider interface ---

// CurrentView returns the COST module's current UI view.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()

	currentTotal := m.currentMonthTotalLocked()
	projected := m.projectedMonthlyLocked()
	breakdown := m.serviceBreakdownLocked()
	dailyCosts := m.dailyCostsLocked(30)
	alerts := m.budgetAlertsLocked()

	// Find total budget
	budgetStr := "Not set"
	budgetTrend := "flat"
	if b, ok := m.budgets["total"]; ok {
		budgetStr = formatUSD(b.Limit)
		utilization := 0.0
		if b.Limit > 0 {
			utilization = currentTotal / b.Limit
		}
		if utilization >= 0.9 {
			budgetTrend = "up"
		} else if utilization < 0.5 {
			budgetTrend = "down"
		}
	}

	// Calculate month-over-month change
	momChange := 0.0
	prevMonthTotal := m.previousMonthTotalLocked()
	if prevMonthTotal > 0 {
		momChange = ((currentTotal - prevMonthTotal) / prevMonthTotal) * 100
	}
	momTrend := "flat"
	if momChange > 5 {
		momTrend = "up"
	} else if momChange < -5 {
		momTrend = "down"
	}

	// Build components
	components := make([]*pb.UIComponent, 0, 8)

	// 1. Header
	headerLevel := int32(1)
	headerContent := "COST — Cloud Cost Tracker"
	components = append(components, &pb.UIComponent{
		Id:      "cost-header",
		Type:    "header",
		Level:   &headerLevel,
		Content: &headerContent,
	})

	// 2. Metrics row
	components = append(components, &pb.UIComponent{
		Id:   "cost-metrics",
		Type: "metric_row",
		Metrics: []*pb.Metric{
			{
				Label:         "Monthly Spend",
				Value:         formatUSD(currentTotal),
				Trend:         momTrend,
				ChangePercent: math.Round(momChange*10) / 10,
			},
			{
				Label: "Projected",
				Value: formatUSD(projected),
				Trend: momTrend,
			},
			{
				Label: "Budget",
				Value: budgetStr,
				Trend: budgetTrend,
			},
			{
				Label: "Entries",
				Value: fmt.Sprintf("%d", len(m.entries)),
				Trend: "flat",
			},
		},
	})

	// 3. Budget alerts (if any are warning/critical/exceeded)
	for _, alert := range alerts {
		if alert.Level == "ok" {
			continue
		}
		alertLevel := int32(3)
		alertMsg := fmt.Sprintf("Budget Alert (%s): %s of %s spent (%.0f%%)",
			alert.Scope, formatUSD(alert.Spent), formatUSD(alert.Limit),
			alert.Utilization*100)
		components = append(components, &pb.UIComponent{
			Id:      fmt.Sprintf("cost-alert-%s", alert.Scope),
			Type:    "header",
			Level:   &alertLevel,
			Content: &alertMsg,
		})
	}

	// 4. Cost over time chart (area chart, last 30 days)
	chartData := make([]*pb.ChartDataPoint, 0, len(dailyCosts))
	for _, dc := range dailyCosts {
		chartData = append(chartData, &pb.ChartDataPoint{
			Values: map[string]string{
				"date":   dc.Date,
				"amount": fmt.Sprintf("%.2f", dc.Amount),
			},
		})
	}
	chartType := "area"
	components = append(components, &pb.UIComponent{
		Id:        "cost-chart",
		Type:      "chart",
		ChartType: &chartType,
		ChartData: chartData,
	})

	// 5. Per-service breakdown table
	serviceRows := make([]*pb.RowData, 0, len(breakdown))
	for _, sc := range breakdown {
		serviceRows = append(serviceRows, &pb.RowData{
			Values: map[string]string{
				"provider": sc.Provider,
				"service":  sc.Service,
				"amount":   formatUSD(sc.Amount),
			},
		})
	}
	components = append(components, &pb.UIComponent{
		Id:   "cost-breakdown-table",
		Type: "table",
		Columns: []*pb.TableColumn{
			{Key: "provider", Label: "Provider", Sortable: true},
			{Key: "service", Label: "Service", Sortable: true},
			{Key: "amount", Label: "Amount", Sortable: true},
		},
		Rows: serviceRows,
	})

	// 6. Add entry form
	components = append(components, &pb.UIComponent{
		Id:   "cost-add-form",
		Type: "form",
		Fields: []*pb.FormField{
			{Id: "provider", Label: "Provider", FieldType: "select", Required: true,
				Options: []string{"digitalocean", "aws", "manual"}},
			{Id: "service", Label: "Service", FieldType: "text",
				Placeholder: strPtr("e.g., Droplets, EC2"), Required: true},
			{Id: "amount", Label: "Amount (USD)", FieldType: "number",
				Placeholder: strPtr("0.00"), Required: true},
			{Id: "date", Label: "Date", FieldType: "text",
				Placeholder: strPtr("YYYY-MM-DD")},
			{Id: "project", Label: "Project", FieldType: "text",
				Placeholder: strPtr("optional")},
			{Id: "note", Label: "Note", FieldType: "text",
				Placeholder: strPtr("optional")},
		},
	})

	// 7. Status bar
	statusContent := fmt.Sprintf("COST • %d entries • %s this month • %d budgets",
		len(m.entries), formatUSD(currentTotal), len(m.budgets))
	components = append(components, &pb.UIComponent{
		Id:      "cost-status",
		Type:    "status_bar",
		Content: &statusContent,
	})

	// Actions
	refreshShortcut := strPtr("Ctrl+R")
	addShortcut := strPtr("Ctrl+N")

	return &pb.UIViewUpdate{
		Module:     "cost",
		Components: components,
		Actions: []*pb.UIAction{
			{Id: "add-entry", Label: "Add Entry", Shortcut: addShortcut, Enabled: true},
			{Id: "delete-entry", Label: "Delete Entry", Enabled: true},
			{Id: "set-budget", Label: "Set Budget", Enabled: true},
			{Id: "export-csv", Label: "Export CSV", Enabled: true},
			{Id: "view-history", Label: "View History", Enabled: true},
			{Id: "refresh", Label: "Refresh", Shortcut: refreshShortcut, Enabled: true},
		},
	}
}

// HandleEvent processes user interactions with the COST UI.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId == nil {
		return nil
	}

	switch *event.ActionId {
	case "add-entry":
		provider := event.Data["provider"]
		service := event.Data["service"]
		amountStr := event.Data["amount"]
		date := event.Data["date"]
		project := event.Data["project"]
		note := event.Data["note"]

		if provider == "" || service == "" || amountStr == "" {
			return fmt.Errorf("provider, service, and amount are required")
		}

		amount := 0.0
		if _, err := fmt.Sscanf(amountStr, "%f", &amount); err != nil {
			return fmt.Errorf("invalid amount: %w", err)
		}

		_, err := m.AddEntry(provider, service, amount, date, project, note)
		return err

	case "delete-entry":
		id := event.Data["id"]
		if id == "" {
			return fmt.Errorf("entry id is required")
		}
		return m.DeleteEntry(id)

	case "set-budget":
		scope := event.Data["scope"]
		limitStr := event.Data["limit"]
		if scope == "" || limitStr == "" {
			return fmt.Errorf("scope and limit are required")
		}
		limit := 0.0
		if _, err := fmt.Sscanf(limitStr, "%f", &limit); err != nil {
			return fmt.Errorf("invalid limit: %w", err)
		}
		return m.SetBudget(scope, limit)

	case "export-csv":
		// Export is handled by the renderer; we just trigger a refresh.
		m.notifySubscribers()

	case "view-history":
		m.notifySubscribers()

	case "refresh":
		m.notifySubscribers()
	}

	return nil
}

// Subscribe registers a callback for view updates. Returns unsubscribe function.
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

// notifySubscribersLocked is used when m.mu is already held (write-locked).
func (m *Module) notifySubscribersLocked() {
	m.mu.Unlock()
	m.notifySubscribers()
	m.mu.Lock()
}

func (m *Module) previousMonthTotalLocked() float64 {
	now := time.Now().UTC()
	prev := now.AddDate(0, -1, 0)
	prefix := prev.Format("2006-01")

	total := 0.0
	for _, e := range m.entries {
		if strings.HasPrefix(e.Date, prefix) {
			total += e.Amount
		}
	}
	return total
}

// --- Helpers ---

func strPtr(s string) *string { return &s }

func formatUSD(amount float64) string {
	return fmt.Sprintf("$%.2f", amount)
}

func daysInMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// Verify interface compliance at compile time.
var (
	_ module.Module     = (*Module)(nil)
	_ module.UIProvider = (*Module)(nil)
)
