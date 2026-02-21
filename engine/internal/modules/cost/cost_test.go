package cost

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// testKey is a 32-byte key for tests.
var testKey = []byte("01234567890123456789012345678901")

func newTestModule(t *testing.T) *Module {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "cost-test.db")
	mod := New(dbPath, testKey)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		mod.Stop()
	})
	return mod
}

func today() string {
	return time.Now().UTC().Format("2006-01-02")
}

func thisMonthDay(day int) string {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

func lastMonthDay(day int) string {
	now := time.Now().UTC()
	prev := now.AddDate(0, -1, 0)
	return time.Date(prev.Year(), prev.Month(), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

// --- Module identity ---

func TestModuleIdentity(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	if mod.Name() != "cost" {
		t.Fatalf("expected name 'cost', got %q", mod.Name())
	}
	if mod.DisplayName() != "COST" {
		t.Fatalf("expected display name 'COST', got %q", mod.DisplayName())
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

func TestStartCreatesDirectory(t *testing.T) {
	dir := t.TempDir()
	nested := filepath.Join(dir, "a", "b", "c")
	mod := New(filepath.Join(nested, "test.db"), testKey)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer mod.Stop()
}

// --- Cost entries ---

func TestAddEntry(t *testing.T) {
	mod := newTestModule(t)

	entry, err := mod.AddEntry("digitalocean", "Droplets", 25.50, today(), "myapp", "dev server")
	if err != nil {
		t.Fatalf("AddEntry: %v", err)
	}

	if entry.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if entry.Provider != "digitalocean" {
		t.Fatalf("expected provider 'digitalocean', got %q", entry.Provider)
	}
	if entry.Amount != 25.50 {
		t.Fatalf("expected amount 25.50, got %f", entry.Amount)
	}
	if entry.Currency != "USD" {
		t.Fatalf("expected currency 'USD', got %q", entry.Currency)
	}
}

func TestAddEntryDefaultDate(t *testing.T) {
	mod := newTestModule(t)

	entry, err := mod.AddEntry("aws", "EC2", 10.00, "", "", "")
	if err != nil {
		t.Fatalf("AddEntry: %v", err)
	}

	if entry.Date != today() {
		t.Fatalf("expected date %q, got %q", today(), entry.Date)
	}
}

func TestAddEntryValidation(t *testing.T) {
	mod := newTestModule(t)

	// Missing provider
	_, err := mod.AddEntry("", "Service", 10.0, today(), "", "")
	if err == nil {
		t.Fatal("expected error for missing provider")
	}

	// Missing service
	_, err = mod.AddEntry("aws", "", 10.0, today(), "", "")
	if err == nil {
		t.Fatal("expected error for missing service")
	}

	// Negative amount
	_, err = mod.AddEntry("aws", "EC2", -5.0, today(), "", "")
	if err == nil {
		t.Fatal("expected error for negative amount")
	}
}

func TestDeleteEntry(t *testing.T) {
	mod := newTestModule(t)

	entry, _ := mod.AddEntry("aws", "EC2", 10.0, today(), "", "")
	if err := mod.DeleteEntry(entry.ID); err != nil {
		t.Fatalf("DeleteEntry: %v", err)
	}

	entries := mod.ListEntries()
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries, got %d", len(entries))
	}
}

func TestDeleteNonexistentEntry(t *testing.T) {
	mod := newTestModule(t)
	if err := mod.DeleteEntry("nonexistent-id"); err != nil {
		t.Fatalf("DeleteEntry nonexistent: %v", err)
	}
}

func TestListEntriesSortedByDate(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, "2024-01-01", "", "")
	mod.AddEntry("aws", "S3", 5.0, "2024-01-15", "", "")
	mod.AddEntry("digitalocean", "Droplets", 20.0, "2024-01-10", "", "")

	entries := mod.ListEntries()
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}

	// Should be sorted newest first
	if entries[0].Date != "2024-01-15" {
		t.Fatalf("expected newest first, got %q", entries[0].Date)
	}
	if entries[2].Date != "2024-01-01" {
		t.Fatalf("expected oldest last, got %q", entries[2].Date)
	}
}

// --- Budget management ---

func TestSetBudget(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetBudget("total", 500.0); err != nil {
		t.Fatalf("SetBudget: %v", err)
	}

	b, ok := mod.GetBudget("total")
	if !ok {
		t.Fatal("expected to find budget")
	}
	if b.Limit != 500.0 {
		t.Fatalf("expected limit 500.0, got %f", b.Limit)
	}
}

func TestUpdateBudget(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 500.0)
	mod.SetBudget("total", 750.0)

	b, ok := mod.GetBudget("total")
	if !ok {
		t.Fatal("expected to find budget")
	}
	if b.Limit != 750.0 {
		t.Fatalf("expected updated limit 750.0, got %f", b.Limit)
	}
}

func TestDeleteBudget(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 500.0)
	if err := mod.DeleteBudget("total"); err != nil {
		t.Fatalf("DeleteBudget: %v", err)
	}

	_, ok := mod.GetBudget("total")
	if ok {
		t.Fatal("expected budget to be deleted")
	}
}

func TestSetBudgetValidation(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetBudget("", 500.0); err == nil {
		t.Fatal("expected error for empty scope")
	}

	if err := mod.SetBudget("total", -100.0); err == nil {
		t.Fatal("expected error for negative limit")
	}
}

// --- Cost calculations ---

func TestCurrentMonthTotal(t *testing.T) {
	mod := newTestModule(t)

	// Add entries for current month
	mod.AddEntry("aws", "EC2", 10.0, thisMonthDay(1), "", "")
	mod.AddEntry("aws", "S3", 5.0, thisMonthDay(2), "", "")
	mod.AddEntry("digitalocean", "Droplets", 20.0, thisMonthDay(3), "", "")

	// Add entry for last month (should not be counted)
	mod.AddEntry("aws", "EC2", 100.0, lastMonthDay(15), "", "")

	total := mod.CurrentMonthTotal()
	if total != 35.0 {
		t.Fatalf("expected current month total 35.0, got %f", total)
	}
}

func TestProviderTotals(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, thisMonthDay(1), "", "")
	mod.AddEntry("aws", "S3", 5.0, thisMonthDay(2), "", "")
	mod.AddEntry("digitalocean", "Droplets", 20.0, thisMonthDay(3), "", "")

	totals := mod.ProviderTotals()
	if totals["aws"] != 15.0 {
		t.Fatalf("expected aws total 15.0, got %f", totals["aws"])
	}
	if totals["digitalocean"] != 20.0 {
		t.Fatalf("expected digitalocean total 20.0, got %f", totals["digitalocean"])
	}
}

func TestServiceBreakdown(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, thisMonthDay(1), "", "")
	mod.AddEntry("aws", "EC2", 15.0, thisMonthDay(2), "", "")
	mod.AddEntry("aws", "S3", 5.0, thisMonthDay(3), "", "")

	breakdown := mod.ServiceBreakdown()
	if len(breakdown) != 2 {
		t.Fatalf("expected 2 service entries, got %d", len(breakdown))
	}

	// Should be sorted by amount descending
	if breakdown[0].Service != "EC2" || breakdown[0].Amount != 25.0 {
		t.Fatalf("expected first service EC2 with 25.0, got %q with %f",
			breakdown[0].Service, breakdown[0].Amount)
	}
	if breakdown[1].Service != "S3" || breakdown[1].Amount != 5.0 {
		t.Fatalf("expected second service S3 with 5.0, got %q with %f",
			breakdown[1].Service, breakdown[1].Amount)
	}
}

func TestDailyCosts(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, today(), "", "")

	costs := mod.DailyCosts(7)
	if len(costs) != 7 {
		t.Fatalf("expected 7 daily costs, got %d", len(costs))
	}

	// Today should have the entry
	last := costs[len(costs)-1]
	if last.Date != today() {
		t.Fatalf("expected last day to be today, got %q", last.Date)
	}
	if last.Amount != 10.0 {
		t.Fatalf("expected today's amount 10.0, got %f", last.Amount)
	}
}

func TestProjectedMonthly(t *testing.T) {
	mod := newTestModule(t)

	// Add some spend for this month
	mod.AddEntry("aws", "EC2", 100.0, thisMonthDay(1), "", "")

	projected := mod.ProjectedMonthly()
	// Projected should be >= current total (since we're not at month end)
	if projected < 100.0 {
		t.Fatalf("expected projected >= 100.0, got %f", projected)
	}
}

// --- Budget alerts ---

func TestBudgetAlertsOK(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 1000.0)
	mod.AddEntry("aws", "EC2", 50.0, thisMonthDay(1), "", "")

	alerts := mod.BudgetAlerts()
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}

	if alerts[0].Level != "ok" {
		t.Fatalf("expected level 'ok', got %q", alerts[0].Level)
	}
	if alerts[0].Spent != 50.0 {
		t.Fatalf("expected spent 50.0, got %f", alerts[0].Spent)
	}
}

func TestBudgetAlertsWarning(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 100.0)
	mod.AddEntry("aws", "EC2", 85.0, thisMonthDay(1), "", "")

	alerts := mod.BudgetAlerts()
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}

	if alerts[0].Level != "warning" {
		t.Fatalf("expected level 'warning' at 85%%, got %q (utilization: %f)",
			alerts[0].Level, alerts[0].Utilization)
	}
}

func TestBudgetAlertsCritical(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 100.0)
	mod.AddEntry("aws", "EC2", 95.0, thisMonthDay(1), "", "")

	alerts := mod.BudgetAlerts()
	if alerts[0].Level != "critical" {
		t.Fatalf("expected level 'critical' at 95%%, got %q", alerts[0].Level)
	}
}

func TestBudgetAlertsExceeded(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 100.0)
	mod.AddEntry("aws", "EC2", 110.0, thisMonthDay(1), "", "")

	alerts := mod.BudgetAlerts()
	if alerts[0].Level != "exceeded" {
		t.Fatalf("expected level 'exceeded' at 110%%, got %q", alerts[0].Level)
	}
	if alerts[0].Utilization < 1.0 {
		t.Fatalf("expected utilization > 1.0, got %f", alerts[0].Utilization)
	}
}

func TestBudgetAlertsProviderScope(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("provider:aws", 50.0)
	mod.AddEntry("aws", "EC2", 45.0, thisMonthDay(1), "", "")
	mod.AddEntry("digitalocean", "Droplets", 200.0, thisMonthDay(1), "", "")

	alerts := mod.BudgetAlerts()
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}

	// Only AWS spend should be tracked against provider:aws budget
	if alerts[0].Spent != 45.0 {
		t.Fatalf("expected spent 45.0, got %f", alerts[0].Spent)
	}
	if alerts[0].Level != "critical" {
		t.Fatalf("expected level 'critical' at 90%%, got %q", alerts[0].Level)
	}
}

func TestBudgetAlertsProjectScope(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("project:myapp", 200.0)
	mod.AddEntry("aws", "EC2", 50.0, thisMonthDay(1), "myapp", "")
	mod.AddEntry("aws", "S3", 30.0, thisMonthDay(2), "myapp", "")
	mod.AddEntry("aws", "EC2", 100.0, thisMonthDay(3), "other", "")

	alerts := mod.BudgetAlerts()
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}

	// Only myapp project spend
	if alerts[0].Spent != 80.0 {
		t.Fatalf("expected spent 80.0, got %f", alerts[0].Spent)
	}
}

func TestBudgetAlertsSortedByUtilization(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 900.0, thisMonthDay(1), "", "")
	mod.AddEntry("digitalocean", "Droplets", 400.0, thisMonthDay(2), "", "")

	mod.SetBudget("total", 2000.0)           // ~65% utilization
	mod.SetBudget("provider:aws", 1000.0)    // 90% utilization

	alerts := mod.BudgetAlerts()
	if len(alerts) != 2 {
		t.Fatalf("expected 2 alerts, got %d", len(alerts))
	}
	// Higher utilization should be first
	if alerts[0].Utilization < alerts[1].Utilization {
		t.Fatal("expected alerts sorted by utilization descending")
	}
}

// --- Export ---

func TestExportCSV(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, "2024-01-15", "myapp", "test note")
	mod.AddEntry("digitalocean", "Droplets", 25.50, "2024-01-10", "", "")

	csvStr := mod.ExportCSV()

	// Should have header + 2 data rows
	lines := strings.Split(strings.TrimSpace(csvStr), "\n")
	if len(lines) != 3 {
		t.Fatalf("expected 3 CSV lines (header + 2 data), got %d", len(lines))
	}

	// Header
	if !strings.Contains(lines[0], "Provider") || !strings.Contains(lines[0], "Amount") {
		t.Fatalf("expected CSV header, got %q", lines[0])
	}

	// Data should contain the values
	if !strings.Contains(csvStr, "aws") || !strings.Contains(csvStr, "10.00") {
		t.Fatal("expected CSV to contain aws entry data")
	}
}

// --- Persistence ---

func TestPersistenceAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "persist.db")

	// First instance — add entries and budget
	mod1 := New(dbPath, testKey)
	if err := mod1.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	mod1.AddEntry("aws", "EC2", 42.0, today(), "myapp", "test")
	mod1.SetBudget("total", 500.0)
	mod1.Stop()

	// Second instance — should recover
	mod2 := New(dbPath, testKey)
	if err := mod2.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer mod2.Stop()

	entries := mod2.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after restart, got %d", len(entries))
	}
	if entries[0].Amount != 42.0 {
		t.Fatalf("expected amount 42.0, got %f", entries[0].Amount)
	}

	b, ok := mod2.GetBudget("total")
	if !ok || b.Limit != 500.0 {
		t.Fatalf("expected budget 500.0 after restart, got %v", b)
	}
}

// --- UIProvider interface ---

func TestUIProviderInterface(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)
	var _ module.UIProvider = mod
}

func TestCurrentView(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 10.0, thisMonthDay(1), "", "")
	mod.AddEntry("digitalocean", "Droplets", 20.0, thisMonthDay(2), "", "")

	view := mod.CurrentView()

	if view.Module != "cost" {
		t.Fatalf("expected module 'cost', got %q", view.Module)
	}
	if len(view.Components) == 0 {
		t.Fatal("expected at least one component")
	}

	// Check header
	header := view.Components[0]
	if header.Type != "header" {
		t.Fatalf("expected first component to be header, got %q", header.Type)
	}
	if header.Content == nil || !strings.Contains(*header.Content, "COST") {
		t.Fatal("expected header to contain 'COST'")
	}

	// Check metrics
	var metricRow *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "metric_row" {
			metricRow = c
			break
		}
	}
	if metricRow == nil {
		t.Fatal("expected a metric_row component")
	}
	if len(metricRow.Metrics) < 3 {
		t.Fatalf("expected at least 3 metrics, got %d", len(metricRow.Metrics))
	}

	// Check chart
	var chart *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "chart" {
			chart = c
			break
		}
	}
	if chart == nil {
		t.Fatal("expected a chart component")
	}
	if chart.ChartType == nil || *chart.ChartType != "area" {
		t.Fatal("expected chart type 'area'")
	}

	// Check table
	var table *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "table" {
			table = c
			break
		}
	}
	if table == nil {
		t.Fatal("expected a table component")
	}
	if len(table.Columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(table.Columns))
	}
	if len(table.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(table.Rows))
	}

	// Check form
	var form *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "form" {
			form = c
			break
		}
	}
	if form == nil {
		t.Fatal("expected a form component")
	}

	// Check actions
	if len(view.Actions) < 5 {
		t.Fatalf("expected at least 5 actions, got %d", len(view.Actions))
	}
}

func TestCurrentViewWithBudgetAlert(t *testing.T) {
	mod := newTestModule(t)

	mod.SetBudget("total", 100.0)
	mod.AddEntry("aws", "EC2", 95.0, thisMonthDay(1), "", "")

	view := mod.CurrentView()

	// Should have budget alert header
	alertFound := false
	for _, c := range view.Components {
		if c.Type == "header" && c.Content != nil && strings.Contains(*c.Content, "Budget Alert") {
			alertFound = true
			break
		}
	}
	if !alertFound {
		t.Fatal("expected budget alert header when at critical level")
	}
}

// --- Event handling ---

func TestHandleAddEntryEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "add-entry"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data: map[string]string{
			"provider": "manual",
			"service":  "Hosting",
			"amount":   "42.50",
			"date":     today(),
			"project":  "myapp",
			"note":     "test entry",
		},
	})
	if err != nil {
		t.Fatalf("HandleEvent add-entry: %v", err)
	}

	entries := mod.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Amount != 42.50 {
		t.Fatalf("expected amount 42.50, got %f", entries[0].Amount)
	}
}

func TestHandleAddEntryEventMissingFields(t *testing.T) {
	mod := newTestModule(t)

	actionID := "add-entry"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"provider": "aws"},
	})
	if err == nil {
		t.Fatal("expected error for missing service and amount")
	}
}

func TestHandleDeleteEntryEvent(t *testing.T) {
	mod := newTestModule(t)

	entry, _ := mod.AddEntry("aws", "EC2", 10.0, today(), "", "")

	actionID := "delete-entry"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"id": entry.ID},
	})
	if err != nil {
		t.Fatalf("HandleEvent delete-entry: %v", err)
	}

	entries := mod.ListEntries()
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries, got %d", len(entries))
	}
}

func TestHandleSetBudgetEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "set-budget"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"scope": "total", "limit": "500.00"},
	})
	if err != nil {
		t.Fatalf("HandleEvent set-budget: %v", err)
	}

	b, ok := mod.GetBudget("total")
	if !ok || b.Limit != 500.0 {
		t.Fatalf("expected budget 500.0, got %v", b)
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
		Module:    "cost",
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
		t.Fatal("expected subscriber to receive view update on refresh")
	}
	if received.Module != "cost" {
		t.Fatalf("expected module 'cost', got %q", received.Module)
	}
}

func TestHandleEventNoActionID(t *testing.T) {
	mod := newTestModule(t)

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
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

func TestMultipleSubscribers(t *testing.T) {
	mod := newTestModule(t)

	var mu sync.Mutex
	count1, count2 := 0, 0

	mod.Subscribe(func(_ *pb.UIViewUpdate) {
		mu.Lock()
		count1++
		mu.Unlock()
	})
	mod.Subscribe(func(_ *pb.UIViewUpdate) {
		mu.Lock()
		count2++
		mu.Unlock()
	})

	mod.notifySubscribers()
	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if count1 != 1 || count2 != 1 {
		t.Fatalf("expected both subscribers called once, got %d and %d", count1, count2)
	}
}

// --- Helpers ---

func TestFormatUSD(t *testing.T) {
	tests := []struct {
		amount float64
		want   string
	}{
		{0, "$0.00"},
		{10.5, "$10.50"},
		{1234.567, "$1234.57"},
		{0.01, "$0.01"},
	}

	for _, tt := range tests {
		got := formatUSD(tt.amount)
		if got != tt.want {
			t.Errorf("formatUSD(%f) = %q, want %q", tt.amount, got, tt.want)
		}
	}
}

func TestDaysInMonth(t *testing.T) {
	tests := []struct {
		year  int
		month time.Month
		want  int
	}{
		{2024, time.January, 31},
		{2024, time.February, 29}, // Leap year
		{2025, time.February, 28},
		{2024, time.April, 30},
		{2024, time.December, 31},
	}

	for _, tt := range tests {
		got := daysInMonth(tt.year, tt.month)
		if got != tt.want {
			t.Errorf("daysInMonth(%d, %v) = %d, want %d", tt.year, tt.month, got, tt.want)
		}
	}
}

func TestUniqueEntryIDs(t *testing.T) {
	mod := newTestModule(t)

	e1, _ := mod.AddEntry("aws", "EC2", 10.0, today(), "", "")
	e2, _ := mod.AddEntry("aws", "S3", 5.0, today(), "", "")
	e3, _ := mod.AddEntry("digitalocean", "Droplets", 20.0, today(), "", "")

	ids := map[string]bool{e1.ID: true, e2.ID: true, e3.ID: true}
	if len(ids) != 3 {
		t.Fatalf("expected 3 unique IDs, got %d", len(ids))
	}
}

// --- Provider adapter tests ---

type mockAdapter struct {
	id      string
	name    string
	entries []CostEntry
	err     error
}

func (a *mockAdapter) ID() string   { return a.id }
func (a *mockAdapter) Name() string { return a.name }
func (a *mockAdapter) FetchCosts(_ context.Context, _ string, _, _ time.Time) ([]CostEntry, error) {
	return a.entries, a.err
}

func TestManualAdapterInterface(t *testing.T) {
	adapter := &ManualAdapter{}
	if adapter.ID() != "manual" {
		t.Fatalf("expected ID 'manual', got %q", adapter.ID())
	}
	if adapter.Name() == "" {
		t.Fatal("expected non-empty name")
	}

	entries, err := adapter.FetchCosts(context.Background(), "", time.Now(), time.Now())
	if err != nil {
		t.Fatalf("FetchCosts: %v", err)
	}
	if entries != nil {
		t.Fatal("expected nil entries from manual adapter")
	}
}

func TestDigitalOceanAdapterInterface(t *testing.T) {
	adapter := &DigitalOceanAdapter{}
	if adapter.ID() != "digitalocean" {
		t.Fatalf("expected ID 'digitalocean', got %q", adapter.ID())
	}
	if adapter.Name() == "" {
		t.Fatal("expected non-empty name")
	}

	// Without API key should return error
	_, err := adapter.FetchCosts(context.Background(), "", time.Now(), time.Now())
	if err == nil {
		t.Fatal("expected error without API key")
	}

	// With API key should return nil entries (stub)
	entries, err := adapter.FetchCosts(context.Background(), "test-key", time.Now(), time.Now())
	if err != nil {
		t.Fatalf("FetchCosts with key: %v", err)
	}
	if entries != nil {
		t.Fatal("expected nil entries from stub")
	}
}

func TestAWSAdapterInterface(t *testing.T) {
	adapter := &AWSAdapter{}
	if adapter.ID() != "aws" {
		t.Fatalf("expected ID 'aws', got %q", adapter.ID())
	}
	if adapter.Name() == "" {
		t.Fatal("expected non-empty name")
	}

	_, err := adapter.FetchCosts(context.Background(), "", time.Now(), time.Now())
	if err == nil {
		t.Fatal("expected error without API key")
	}
}

func TestRegisterAdapter(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	if len(mod.adapters) != 3 {
		t.Fatalf("expected 3 built-in adapters, got %d", len(mod.adapters))
	}

	custom := &mockAdapter{id: "custom", name: "Custom"}
	mod.RegisterAdapter(custom)

	if len(mod.adapters) != 4 {
		t.Fatalf("expected 4 adapters, got %d", len(mod.adapters))
	}
}

func TestAdapterInterfaceCompliance(t *testing.T) {
	var _ ProviderAdapter = (*ManualAdapter)(nil)
	var _ ProviderAdapter = (*DigitalOceanAdapter)(nil)
	var _ ProviderAdapter = (*AWSAdapter)(nil)
}

// --- Provider configuration tests ---

func TestDefaultProviders(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	providers := mod.Providers()
	if len(providers) != 3 {
		t.Fatalf("expected 3 default providers, got %d", len(providers))
	}

	ids := make(map[string]bool)
	for _, p := range providers {
		ids[p.ProviderID] = true
	}
	for _, expected := range []string{"manual", "digitalocean", "aws"} {
		if !ids[expected] {
			t.Fatalf("expected provider %q in defaults", expected)
		}
	}
}

func TestManualProviderEnabledByDefault(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	for _, p := range mod.Providers() {
		if p.ProviderID == "manual" && !p.Enabled {
			t.Fatal("expected manual provider to be enabled by default")
		}
		if p.ProviderID != "manual" && p.Enabled {
			t.Fatalf("expected %q to be disabled by default", p.ProviderID)
		}
	}
}

func TestConfigureProvider(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.ConfigureProvider("digitalocean", "do-key-123", true); err != nil {
		t.Fatalf("ConfigureProvider: %v", err)
	}

	providers := mod.Providers()
	for _, p := range providers {
		if p.ProviderID == "digitalocean" {
			if p.APIKey != "do-key-123" {
				t.Fatalf("expected API key 'do-key-123', got %q", p.APIKey)
			}
			if !p.Enabled {
				t.Fatal("expected provider to be enabled")
			}
			return
		}
	}
	t.Fatal("digitalocean provider not found")
}

func TestConfigureProviderNotFound(t *testing.T) {
	mod := newTestModule(t)
	err := mod.ConfigureProvider("nonexistent", "key", true)
	if err == nil {
		t.Fatal("expected error for nonexistent provider")
	}
}

func TestProviderConfigPersistence(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "persist.db")

	mod1 := New(dbPath, testKey)
	if err := mod1.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	mod1.ConfigureProvider("digitalocean", "test-api-key", true)
	mod1.SetSchedule(PollHourly)
	mod1.Stop()

	mod2 := New(dbPath, testKey)
	if err := mod2.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer mod2.Stop()

	for _, p := range mod2.Providers() {
		if p.ProviderID == "digitalocean" {
			if p.APIKey != "test-api-key" || !p.Enabled {
				t.Fatal("expected provider config to persist")
			}
		}
	}

	if mod2.Schedule() != PollHourly {
		t.Fatalf("expected schedule 'hourly', got %q", mod2.Schedule())
	}
}

// --- Schedule tests ---

func TestDefaultSchedule(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)
	if mod.Schedule() != PollDaily {
		t.Fatalf("expected default schedule 'daily', got %q", mod.Schedule())
	}
}

func TestSetSchedule(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSchedule(PollHourly); err != nil {
		t.Fatalf("SetSchedule: %v", err)
	}
	if mod.Schedule() != PollHourly {
		t.Fatalf("expected schedule 'hourly', got %q", mod.Schedule())
	}
}

func TestPollInterval(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	mod.schedule = PollDaily
	if mod.pollInterval() != 24*time.Hour {
		t.Fatal("expected 24h for daily schedule")
	}

	mod.schedule = PollHourly
	if mod.pollInterval() != time.Hour {
		t.Fatal("expected 1h for hourly schedule")
	}
}

// --- Merge entries tests ---

func TestMergeFetchedEntriesUpdate(t *testing.T) {
	mod := newTestModule(t)
	date := thisMonthDay(1)

	mod.AddEntry("aws", "EC2", 100.0, date, "", "")

	mod.mu.Lock()
	mod.mergeFetchedEntries([]CostEntry{
		{Provider: "aws", Service: "EC2", Amount: 120.0, Currency: "USD", Date: date},
	})
	mod.mu.Unlock()

	entries := mod.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry after merge update, got %d", len(entries))
	}
	if entries[0].Amount != 120.0 {
		t.Fatalf("expected updated amount 120.0, got %f", entries[0].Amount)
	}
}

func TestMergeFetchedEntriesNew(t *testing.T) {
	mod := newTestModule(t)

	mod.AddEntry("aws", "EC2", 100.0, thisMonthDay(1), "", "")

	mod.mu.Lock()
	mod.mergeFetchedEntries([]CostEntry{
		{Provider: "aws", Service: "S3", Amount: 30.0, Currency: "USD", Date: thisMonthDay(2)},
	})
	mod.mu.Unlock()

	entries := mod.ListEntries()
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries after merge new, got %d", len(entries))
	}
}

func TestMergeFetchedEntriesAssignsID(t *testing.T) {
	mod := newTestModule(t)

	mod.mu.Lock()
	mod.mergeFetchedEntries([]CostEntry{
		{Provider: "aws", Service: "EC2", Amount: 50.0, Currency: "USD", Date: thisMonthDay(1)},
	})
	mod.mu.Unlock()

	entries := mod.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].ID == "" {
		t.Fatal("expected merged entry to have an ID assigned")
	}
}

// --- HandleEvent for new actions ---

func TestHandleDeleteBudgetEvent(t *testing.T) {
	mod := newTestModule(t)
	mod.SetBudget("total", 500.0)

	actionID := "delete-budget"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"scope": "total"},
	})
	if err != nil {
		t.Fatalf("HandleEvent delete-budget: %v", err)
	}

	_, ok := mod.GetBudget("total")
	if ok {
		t.Fatal("expected budget to be deleted via event")
	}
}

func TestHandleConfigureProviderEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "configure-provider"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data: map[string]string{
			"provider_id": "digitalocean",
			"api_key":     "do-test-key",
			"enabled":     "true",
		},
	})
	if err != nil {
		t.Fatalf("HandleEvent configure-provider: %v", err)
	}

	for _, p := range mod.Providers() {
		if p.ProviderID == "digitalocean" {
			if p.APIKey != "do-test-key" || !p.Enabled {
				t.Fatal("expected provider configured via event")
			}
			return
		}
	}
	t.Fatal("digitalocean provider not found")
}

func TestHandleSetScheduleEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "set-schedule"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"schedule": "hourly"},
	})
	if err != nil {
		t.Fatalf("HandleEvent set-schedule: %v", err)
	}
	if mod.Schedule() != PollHourly {
		t.Fatalf("expected schedule 'hourly', got %q", mod.Schedule())
	}
}

func TestHandleSetScheduleInvalid(t *testing.T) {
	mod := newTestModule(t)

	actionID := "set-schedule"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "cost",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"schedule": "invalid"},
	})
	if err == nil {
		t.Fatal("expected error for invalid schedule")
	}
}

func TestStatusBarShowsSchedule(t *testing.T) {
	mod := newTestModule(t)

	view := mod.CurrentView()
	for _, c := range view.Components {
		if c.Type == "status_bar" && c.Content != nil {
			if !strings.Contains(*c.Content, string(PollDaily)) {
				t.Fatalf("expected status bar to show poll schedule, got %q", *c.Content)
			}
			return
		}
	}
	t.Fatal("status_bar component not found")
}
