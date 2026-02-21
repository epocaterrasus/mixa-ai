package system

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

func newTestModule(t *testing.T) *Module {
	t.Helper()
	registry := module.NewRegistry()

	// Register the system module itself and a stub for testing
	stub := &stubForTest{name: "test-stub", displayName: "Test Stub", description: "A test stub module"}
	if err := registry.Register(stub); err != nil {
		t.Fatalf("Register stub: %v", err)
	}

	mod := New(registry, "1.0.0-test")
	if err := registry.Register(mod); err != nil {
		t.Fatalf("Register system: %v", err)
	}
	if err := registry.StartAll(); err != nil {
		t.Fatalf("StartAll: %v", err)
	}

	return mod
}

type stubForTest struct {
	name        string
	displayName string
	description string
}

func (s *stubForTest) Name() string        { return s.name }
func (s *stubForTest) DisplayName() string { return s.displayName }
func (s *stubForTest) Description() string { return s.description }
func (s *stubForTest) Start() error        { return nil }
func (s *stubForTest) Stop() error         { return nil }

func TestModuleIdentity(t *testing.T) {
	mod := New(module.NewRegistry(), "1.0.0")

	if mod.Name() != "system" {
		t.Fatalf("expected name 'system', got %q", mod.Name())
	}
	if mod.DisplayName() != "System Info" {
		t.Fatalf("expected display name 'System Info', got %q", mod.DisplayName())
	}
	if mod.Description() == "" {
		t.Fatal("expected non-empty description")
	}
}

func TestStartStop(t *testing.T) {
	mod := New(module.NewRegistry(), "1.0.0")
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := mod.Stop(); err != nil {
		t.Fatalf("Stop: %v", err)
	}
}

func TestCurrentView(t *testing.T) {
	mod := newTestModule(t)
	view := mod.CurrentView()

	if view.Module != "system" {
		t.Fatalf("expected module 'system', got %q", view.Module)
	}

	if len(view.Components) == 0 {
		t.Fatal("expected at least one component")
	}

	// Check header component
	header := view.Components[0]
	if header.Type != "header" {
		t.Fatalf("expected first component to be header, got %q", header.Type)
	}
	if header.Content == nil || *header.Content != "Fenix Engine" {
		t.Fatalf("expected header content 'Fenix Engine', got %v", header.Content)
	}

	// Check metrics component
	metrics := view.Components[1]
	if metrics.Type != "metric_row" {
		t.Fatalf("expected metric_row, got %q", metrics.Type)
	}
	if len(metrics.Metrics) != 3 {
		t.Fatalf("expected 3 metrics, got %d", len(metrics.Metrics))
	}

	// Check version metric
	if metrics.Metrics[0].Label != "Version" {
		t.Fatalf("expected first metric label 'Version', got %q", metrics.Metrics[0].Label)
	}
	if metrics.Metrics[0].Value != "1.0.0-test" {
		t.Fatalf("expected version '1.0.0-test', got %q", metrics.Metrics[0].Value)
	}

	// Check modules table
	var tableFound bool
	for _, c := range view.Components {
		if c.Type == "table" {
			tableFound = true
			if len(c.Columns) != 4 {
				t.Fatalf("expected 4 columns, got %d", len(c.Columns))
			}
			if len(c.Rows) < 2 {
				t.Fatalf("expected at least 2 rows (system + stub), got %d", len(c.Rows))
			}
		}
	}
	if !tableFound {
		t.Fatal("expected a table component in view")
	}

	// Check actions
	if len(view.Actions) != 1 {
		t.Fatalf("expected 1 action, got %d", len(view.Actions))
	}
	if view.Actions[0].Id != "refresh" {
		t.Fatalf("expected action id 'refresh', got %q", view.Actions[0].Id)
	}
}

func TestCurrentViewStatusBar(t *testing.T) {
	mod := newTestModule(t)
	view := mod.CurrentView()

	var statusBar *pb.UIComponent
	for _, c := range view.Components {
		if c.Type == "status_bar" {
			statusBar = c
			break
		}
	}
	if statusBar == nil {
		t.Fatal("expected a status_bar component")
	}
	if statusBar.Content == nil {
		t.Fatal("expected status bar content")
	}
	if !strings.Contains(*statusBar.Content, "1.0.0-test") {
		t.Fatalf("expected status bar to contain version, got %q", *statusBar.Content)
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
		Module:    "system",
		ActionId:  &actionID,
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("HandleEvent: %v", err)
	}

	// Give subscriber time to receive
	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if received == nil {
		t.Fatal("expected subscriber to receive view update on refresh")
	}
	if received.Module != "system" {
		t.Fatalf("expected module 'system', got %q", received.Module)
	}
}

func TestHandleUnknownEvent(t *testing.T) {
	mod := newTestModule(t)

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "system",
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("HandleEvent for unknown action should not error: %v", err)
	}
}

func TestSubscribeAndUnsubscribe(t *testing.T) {
	mod := newTestModule(t)

	callCount := 0
	var mu sync.Mutex

	unsubscribe := mod.Subscribe(func(_ *pb.UIViewUpdate) {
		mu.Lock()
		callCount++
		mu.Unlock()
	})

	// Trigger notification
	mod.notifySubscribers()
	time.Sleep(10 * time.Millisecond)

	mu.Lock()
	if callCount != 1 {
		t.Fatalf("expected 1 call, got %d", callCount)
	}
	mu.Unlock()

	// Unsubscribe and trigger again
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

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		d    time.Duration
		want string
	}{
		{5 * time.Second, "5s"},
		{30 * time.Second, "30s"},
		{90 * time.Second, "1m 30s"},
		{5 * time.Minute, "5m 0s"},
		{90 * time.Minute, "1h 30m"},
		{2 * time.Hour, "2h 0m"},
	}

	for _, tt := range tests {
		got := formatDuration(tt.d)
		if got != tt.want {
			t.Errorf("formatDuration(%v) = %q, want %q", tt.d, got, tt.want)
		}
	}
}

func TestUIProviderInterface(t *testing.T) {
	mod := New(module.NewRegistry(), "1.0.0")

	// Verify that Module implements module.UIProvider
	var _ module.UIProvider = mod
}
