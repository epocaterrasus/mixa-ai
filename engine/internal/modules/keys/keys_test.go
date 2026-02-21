package keys

import (
	"crypto/sha256"
	"os"
	"path/filepath"
	"testing"

	pb "github.com/mixa-ai/engine/pkg/proto"
)

// testModule creates a KEYS module backed by a temporary SQLite database.
func testModule(t *testing.T) *Module {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys_test.db")
	key := sha256.Sum256([]byte("test-keys-module"))
	m := New(dbPath, key[:])
	if err := m.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		if err := m.Stop(); err != nil {
			t.Errorf("Stop: %v", err)
		}
	})
	return m
}

func TestModuleIdentity(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys.db")
	key := sha256.Sum256([]byte("test"))
	m := New(dbPath, key[:])

	if m.Name() != "keys" {
		t.Errorf("Name() = %q, want %q", m.Name(), "keys")
	}
	if m.DisplayName() != "KEYS" {
		t.Errorf("DisplayName() = %q, want %q", m.DisplayName(), "KEYS")
	}
	if m.Description() == "" {
		t.Error("Description() should not be empty")
	}
}

func TestStartStop(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys.db")
	key := sha256.Sum256([]byte("test"))
	m := New(dbPath, key[:])

	if err := m.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := m.Stop(); err != nil {
		t.Fatalf("Stop: %v", err)
	}
}

func TestDefaultBindings(t *testing.T) {
	m := testModule(t)

	// Verify some well-known defaults
	tests := []struct {
		cmdID    string
		shortcut string
	}{
		{"global.new-tab", "Ctrl+T"},
		{"global.close-tab", "Ctrl+W"},
		{"global.command-palette", "Ctrl+K"},
		{"guard.add", "Ctrl+N"},
		{"forge.pull", "Ctrl+Shift+P"},
	}

	for _, tt := range tests {
		got, ok := m.GetBinding(tt.cmdID)
		if !ok {
			t.Errorf("GetBinding(%q): not found", tt.cmdID)
			continue
		}
		if got != tt.shortcut {
			t.Errorf("GetBinding(%q) = %q, want %q", tt.cmdID, got, tt.shortcut)
		}
	}
}

func TestSetBinding(t *testing.T) {
	m := testModule(t)

	// Override global.new-tab from Ctrl+T to Ctrl+Shift+T
	conflict, err := m.SetBinding("global.new-tab", "Ctrl+Shift+T")
	if err != nil {
		t.Fatalf("SetBinding: %v", err)
	}
	if conflict != nil {
		t.Logf("Warning — conflict detected (may be expected): %+v", conflict)
	}

	got, ok := m.GetBinding("global.new-tab")
	if !ok {
		t.Fatal("GetBinding: not found after SetBinding")
	}
	if got != "Ctrl+Shift+T" {
		t.Errorf("GetBinding = %q, want %q", got, "Ctrl+Shift+T")
	}
}

func TestSetBindingUnknownCommand(t *testing.T) {
	m := testModule(t)

	_, err := m.SetBinding("nonexistent.command", "Ctrl+X")
	if err == nil {
		t.Error("SetBinding with unknown command should return error")
	}
}

func TestSetBindingUnbind(t *testing.T) {
	m := testModule(t)

	// Set a custom binding then unbind it
	_, err := m.SetBinding("global.new-tab", "Ctrl+Shift+T")
	if err != nil {
		t.Fatalf("SetBinding: %v", err)
	}

	// Unbind by passing empty shortcut
	_, err = m.SetBinding("global.new-tab", "")
	if err != nil {
		t.Fatalf("SetBinding (unbind): %v", err)
	}

	// Should revert to default
	got, ok := m.GetBinding("global.new-tab")
	if !ok {
		t.Fatal("GetBinding: not found after unbind")
	}
	if got != "Ctrl+T" {
		t.Errorf("GetBinding = %q, want default %q", got, "Ctrl+T")
	}
}

func TestResetBinding(t *testing.T) {
	m := testModule(t)

	_, err := m.SetBinding("global.new-tab", "Ctrl+Shift+T")
	if err != nil {
		t.Fatalf("SetBinding: %v", err)
	}

	if err := m.ResetBinding("global.new-tab"); err != nil {
		t.Fatalf("ResetBinding: %v", err)
	}

	got, _ := m.GetBinding("global.new-tab")
	if got != "Ctrl+T" {
		t.Errorf("after ResetBinding: GetBinding = %q, want %q", got, "Ctrl+T")
	}
}

func TestResetAll(t *testing.T) {
	m := testModule(t)

	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+T")
	_, _ = m.SetBinding("global.close-tab", "Ctrl+Shift+W")

	if err := m.ResetAll(); err != nil {
		t.Fatalf("ResetAll: %v", err)
	}

	bindings := m.ActiveBindings()
	for _, b := range bindings {
		if b.IsCustom {
			t.Errorf("after ResetAll, binding %q should not be custom", b.CommandID)
		}
	}
}

func TestConflictDetection(t *testing.T) {
	m := testModule(t)

	// Bind two commands to the same shortcut
	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+X")
	conflict, err := m.SetBinding("global.close-tab", "Ctrl+Shift+X")
	if err != nil {
		t.Fatalf("SetBinding: %v", err)
	}

	if conflict == nil {
		t.Fatal("expected conflict when binding two commands to Ctrl+Shift+X")
	}

	if len(conflict.CommandIDs) < 2 {
		t.Errorf("conflict should have at least 2 command IDs, got %d", len(conflict.CommandIDs))
	}

	// Also verify via DetectConflicts
	conflicts := m.DetectConflicts()
	found := false
	for _, c := range conflicts {
		if c.Shortcut == NormalizeShortcut("Ctrl+Shift+X") {
			found = true
			break
		}
	}
	if !found {
		t.Error("DetectConflicts did not report the Ctrl+Shift+X conflict")
	}
}

func TestNormalizeShortcut(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Ctrl+T", "ctrl+t"},
		{"Ctrl+Shift+T", "ctrl+shift+t"},
		{"Shift+Ctrl+T", "ctrl+shift+t"}, // Modifiers reordered
		{"Alt+Shift+Ctrl+X", "alt+ctrl+shift+x"},
		{"F1", "f1"},
		{"Ctrl+Shift+Backspace", "ctrl+shift+backspace"},
	}

	for _, tt := range tests {
		got := NormalizeShortcut(tt.input)
		if got != tt.want {
			t.Errorf("NormalizeShortcut(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestFilterCommands(t *testing.T) {
	m := testModule(t)

	// Filter by module
	guardCmds := m.FilterCommands("guard", "", "")
	for _, cmd := range guardCmds {
		if cmd.Module != "guard" {
			t.Errorf("FilterCommands(module=guard): got command with module %q", cmd.Module)
		}
	}
	if len(guardCmds) == 0 {
		t.Error("FilterCommands(module=guard): expected at least 1 result")
	}

	// Filter by category
	navCmds := m.FilterCommands("", "navigation", "")
	for _, cmd := range navCmds {
		if cmd.Category != "navigation" {
			t.Errorf("FilterCommands(category=navigation): got command with category %q", cmd.Category)
		}
	}
	if len(navCmds) == 0 {
		t.Error("FilterCommands(category=navigation): expected at least 1 result")
	}

	// Search by text
	searchCmds := m.FilterCommands("", "", "new tab")
	found := false
	for _, cmd := range searchCmds {
		if cmd.ID == "global.new-tab" {
			found = true
		}
	}
	if !found {
		t.Error("FilterCommands(search='new tab'): expected global.new-tab in results")
	}

	// Combined filter
	combined := m.FilterCommands("global", "navigation", "tab")
	if len(combined) == 0 {
		t.Error("FilterCommands(module=global, category=navigation, search=tab): expected results")
	}
	for _, cmd := range combined {
		if cmd.Module != "global" || cmd.Category != "navigation" {
			t.Errorf("Combined filter returned unexpected cmd: %+v", cmd)
		}
	}

	// No matches
	empty := m.FilterCommands("nonexistent", "", "")
	if len(empty) != 0 {
		t.Errorf("FilterCommands(module=nonexistent): expected 0 results, got %d", len(empty))
	}
}

func TestListCommands(t *testing.T) {
	m := testModule(t)

	cmds := m.ListCommands()
	if len(cmds) == 0 {
		t.Fatal("ListCommands: expected at least 1 command")
	}

	// Verify sorted by module then ID
	for i := 1; i < len(cmds); i++ {
		prev := cmds[i-1]
		curr := cmds[i]
		if prev.Module > curr.Module || (prev.Module == curr.Module && prev.ID > curr.ID) {
			t.Errorf("ListCommands not sorted: [%d]=%s.%s > [%d]=%s.%s",
				i-1, prev.Module, prev.ID, i, curr.Module, curr.ID)
		}
	}
}

func TestActiveBindings(t *testing.T) {
	m := testModule(t)

	bindings := m.ActiveBindings()
	if len(bindings) == 0 {
		t.Fatal("ActiveBindings: expected at least 1 binding")
	}

	// All default bindings should not be marked custom
	for _, b := range bindings {
		if b.IsCustom {
			t.Errorf("default binding %q should not be custom", b.CommandID)
		}
	}
}

func TestExportImportConfig(t *testing.T) {
	m := testModule(t)

	// Set a custom binding
	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+T")

	// Export
	exported, err := m.ExportConfig()
	if err != nil {
		t.Fatalf("ExportConfig: %v", err)
	}
	if exported == "" {
		t.Fatal("ExportConfig returned empty string")
	}

	// Create a fresh module and import
	m2 := testModule(t)
	count, err := m2.ImportConfig(exported)
	if err != nil {
		t.Fatalf("ImportConfig: %v", err)
	}
	if count == 0 {
		t.Error("ImportConfig: expected at least 1 imported binding")
	}

	// Verify the custom binding was imported
	got, ok := m2.GetBinding("global.new-tab")
	if !ok {
		t.Fatal("GetBinding after import: not found")
	}
	if got != "Ctrl+Shift+T" {
		t.Errorf("GetBinding after import = %q, want %q", got, "Ctrl+Shift+T")
	}
}

func TestImportConfigInvalidJSON(t *testing.T) {
	m := testModule(t)

	_, err := m.ImportConfig("not json")
	if err == nil {
		t.Error("ImportConfig with invalid JSON should return error")
	}
}

func TestImportConfigUnknownCommands(t *testing.T) {
	m := testModule(t)

	// Import config with unknown commands — they should be ignored
	config := `{"bindings": {"unknown.cmd": "Ctrl+X", "global.new-tab": "Ctrl+Shift+T"}}`
	count, err := m.ImportConfig(config)
	if err != nil {
		t.Fatalf("ImportConfig: %v", err)
	}
	// Only global.new-tab should be counted (unknown.cmd is skipped)
	if count != 1 {
		t.Errorf("ImportConfig count = %d, want 1", count)
	}
}

func TestCommandPaletteEntries(t *testing.T) {
	m := testModule(t)

	entries := m.CommandPaletteEntries("")
	if len(entries) == 0 {
		t.Fatal("CommandPaletteEntries: expected at least 1 entry")
	}

	// Verify entries have required fields
	for _, e := range entries {
		if e.ID == "" || e.Label == "" {
			t.Errorf("Entry missing fields: %+v", e)
		}
	}

	// Search should filter
	filtered := m.CommandPaletteEntries("zoom")
	if len(filtered) == 0 {
		t.Fatal("CommandPaletteEntries(search=zoom): expected results")
	}
	for _, e := range filtered {
		if e.ID == "global.new-tab" {
			t.Error("zoom search should not include global.new-tab")
		}
	}
}

func TestPersistence(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys_persist.db")
	key := sha256.Sum256([]byte("persist-test"))

	// First instance: set a custom binding
	m1 := New(dbPath, key[:])
	if err := m1.Start(); err != nil {
		t.Fatalf("m1.Start: %v", err)
	}
	if _, err := m1.SetBinding("global.new-tab", "Ctrl+Shift+T"); err != nil {
		t.Fatalf("m1.SetBinding: %v", err)
	}
	if err := m1.Stop(); err != nil {
		t.Fatalf("m1.Stop: %v", err)
	}

	// Second instance: verify the custom binding persisted
	m2 := New(dbPath, key[:])
	if err := m2.Start(); err != nil {
		t.Fatalf("m2.Start: %v", err)
	}
	defer func() {
		if err := m2.Stop(); err != nil {
			t.Errorf("m2.Stop: %v", err)
		}
	}()

	got, ok := m2.GetBinding("global.new-tab")
	if !ok {
		t.Fatal("m2.GetBinding: not found after restart")
	}
	if got != "Ctrl+Shift+T" {
		t.Errorf("m2.GetBinding = %q, want %q", got, "Ctrl+Shift+T")
	}
}

func TestCurrentView(t *testing.T) {
	m := testModule(t)

	view := m.CurrentView()
	if view == nil {
		t.Fatal("CurrentView returned nil")
	}
	if view.Module != "keys" {
		t.Errorf("view.Module = %q, want %q", view.Module, "keys")
	}
	if len(view.Components) == 0 {
		t.Error("view.Components is empty")
	}
	if len(view.Actions) == 0 {
		t.Error("view.Actions is empty")
	}

	// Verify expected component types exist
	types := make(map[string]bool)
	for _, c := range view.Components {
		types[c.Type] = true
	}
	for _, expected := range []string{"header", "metric_row", "table", "form", "status_bar"} {
		if !types[expected] {
			t.Errorf("view missing component type %q", expected)
		}
	}
}

func TestHandleEvent(t *testing.T) {
	m := testModule(t)

	// Test set-binding event
	setAction := "set-binding"
	err := m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &setAction,
		Data: map[string]string{
			"commandId": "global.new-tab",
			"shortcut":  "Ctrl+Shift+T",
		},
	})
	if err != nil {
		t.Fatalf("HandleEvent(set-binding): %v", err)
	}

	got, _ := m.GetBinding("global.new-tab")
	if got != "Ctrl+Shift+T" {
		t.Errorf("after HandleEvent, GetBinding = %q, want %q", got, "Ctrl+Shift+T")
	}

	// Test reset-binding event
	resetAction := "reset-binding"
	err = m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &resetAction,
		Data:     map[string]string{"commandId": "global.new-tab"},
	})
	if err != nil {
		t.Fatalf("HandleEvent(reset-binding): %v", err)
	}

	got, _ = m.GetBinding("global.new-tab")
	if got != "Ctrl+T" {
		t.Errorf("after reset, GetBinding = %q, want %q", got, "Ctrl+T")
	}

	// Test reset-all event
	resetAllAction := "reset-all"
	err = m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &resetAllAction,
		Data:     map[string]string{},
	})
	if err != nil {
		t.Fatalf("HandleEvent(reset-all): %v", err)
	}

	// Test refresh event (should not error)
	refreshAction := "refresh"
	err = m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &refreshAction,
	})
	if err != nil {
		t.Fatalf("HandleEvent(refresh): %v", err)
	}

	// Test nil action
	err = m.HandleEvent(&pb.UIEventRequest{
		Module: "keys",
	})
	if err != nil {
		t.Fatalf("HandleEvent(nil action): %v", err)
	}
}

func TestHandleEventValidation(t *testing.T) {
	m := testModule(t)

	// set-binding with missing fields
	setAction := "set-binding"
	err := m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &setAction,
		Data:     map[string]string{},
	})
	if err == nil {
		t.Error("HandleEvent(set-binding) with empty data should error")
	}

	// reset-binding with missing commandId
	resetAction := "reset-binding"
	err = m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &resetAction,
		Data:     map[string]string{},
	})
	if err == nil {
		t.Error("HandleEvent(reset-binding) with empty commandId should error")
	}

	// import with empty content
	importAction := "import"
	err = m.HandleEvent(&pb.UIEventRequest{
		Module:   "keys",
		ActionId: &importAction,
		Data:     map[string]string{},
	})
	if err == nil {
		t.Error("HandleEvent(import) with empty content should error")
	}
}

func TestSubscribe(t *testing.T) {
	m := testModule(t)

	callCount := 0
	unsub := m.Subscribe(func(view *pb.UIViewUpdate) {
		callCount++
	})

	// Trigger a notification
	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+T")
	if callCount == 0 {
		t.Error("subscriber was not called after SetBinding")
	}

	// Unsubscribe
	unsub()
	prevCount := callCount
	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+U")
	if callCount != prevCount {
		t.Error("subscriber was called after unsubscribe")
	}
}

func TestConflictViewRendering(t *testing.T) {
	m := testModule(t)

	// Create a conflict
	_, _ = m.SetBinding("global.new-tab", "Ctrl+Shift+X")
	_, _ = m.SetBinding("global.close-tab", "Ctrl+Shift+X")

	view := m.CurrentView()

	// Should contain a conflict header and conflict table
	hasConflictHeader := false
	hasConflictTable := false
	for _, c := range view.Components {
		if c.Id == "keys-conflict-header" {
			hasConflictHeader = true
		}
		if c.Id == "keys-conflict-table" {
			hasConflictTable = true
		}
	}

	if !hasConflictHeader {
		t.Error("view should contain conflict header when conflicts exist")
	}
	if !hasConflictTable {
		t.Error("view should contain conflict table when conflicts exist")
	}
}

func TestStartWithInvalidKey(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys.db")
	badKey := []byte("too-short")

	m := New(dbPath, badKey)
	err := m.Start()
	if err == nil {
		t.Error("Start with invalid key should return error")
	}
}

func TestStopWithoutStart(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "keys.db")
	key := sha256.Sum256([]byte("test"))
	m := New(dbPath, key[:])

	// Stop without Start should not panic or error
	if err := m.Stop(); err != nil {
		t.Errorf("Stop without Start: %v", err)
	}
}

func TestStartCreatesDirectory(t *testing.T) {
	dir := t.TempDir()
	// Nested path that doesn't exist yet
	dbPath := filepath.Join(dir, "deeply", "nested", "keys.db")
	key := sha256.Sum256([]byte("test"))
	m := New(dbPath, key[:])

	if err := m.Start(); err != nil {
		t.Fatalf("Start with nested path: %v", err)
	}
	defer m.Stop()

	// Verify the directory was created
	parent := filepath.Dir(dbPath)
	if _, err := os.Stat(parent); os.IsNotExist(err) {
		t.Error("Start did not create parent directory")
	}
}
