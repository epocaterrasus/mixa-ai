package guard

import (
	"os"
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
	dbPath := filepath.Join(dir, "guard-test.db")
	mod := New(dbPath, testKey)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		mod.Stop()
	})
	return mod
}

func TestModuleIdentity(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	if mod.Name() != "guard" {
		t.Fatalf("expected name 'guard', got %q", mod.Name())
	}
	if mod.DisplayName() != "GUARD" {
		t.Fatalf("expected display name 'GUARD', got %q", mod.DisplayName())
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

	// Verify the nested directory was created
	if _, err := os.Stat(nested); os.IsNotExist(err) {
		t.Fatal("expected nested directory to be created")
	}
}

func TestSetAndGetSecret(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("DB_HOST", "localhost", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	val, ok := mod.GetSecret("DB_HOST")
	if !ok {
		t.Fatal("expected to find secret DB_HOST")
	}
	if val != "localhost" {
		t.Fatalf("expected 'localhost', got %q", val)
	}
}

func TestUpdateExistingSecret(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("API_KEY", "old-value", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	if err := mod.SetSecret("API_KEY", "new-value", "manual"); err != nil {
		t.Fatalf("SetSecret update: %v", err)
	}

	val, ok := mod.GetSecret("API_KEY")
	if !ok {
		t.Fatal("expected to find secret")
	}
	if val != "new-value" {
		t.Fatalf("expected 'new-value', got %q", val)
	}
}

func TestDeleteSecret(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("TO_DELETE", "value", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	if err := mod.DeleteSecret("TO_DELETE"); err != nil {
		t.Fatalf("DeleteSecret: %v", err)
	}

	_, ok := mod.GetSecret("TO_DELETE")
	if ok {
		t.Fatal("expected secret to be deleted")
	}
}

func TestDeleteNonexistentSecret(t *testing.T) {
	mod := newTestModule(t)
	// Should not error
	if err := mod.DeleteSecret("NONEXISTENT"); err != nil {
		t.Fatalf("DeleteSecret: %v", err)
	}
}

func TestListSecrets(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("B_KEY", "b", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	if err := mod.SetSecret("A_KEY", "a", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	secrets := mod.ListSecrets()
	if len(secrets) != 2 {
		t.Fatalf("expected 2 secrets, got %d", len(secrets))
	}
	// Should be sorted by key
	if secrets[0].Key != "A_KEY" {
		t.Fatalf("expected first secret to be A_KEY, got %q", secrets[0].Key)
	}
	if secrets[1].Key != "B_KEY" {
		t.Fatalf("expected second secret to be B_KEY, got %q", secrets[1].Key)
	}
}

func TestSwitchEnvironment(t *testing.T) {
	mod := newTestModule(t)

	// Add to dev
	if err := mod.SetSecret("DEV_ONLY", "dev-val", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	// Switch to staging
	mod.SwitchEnvironment("staging")
	if mod.ActiveEnvironment() != "staging" {
		t.Fatalf("expected 'staging', got %q", mod.ActiveEnvironment())
	}

	// Secret from dev should not be visible
	_, ok := mod.GetSecret("DEV_ONLY")
	if ok {
		t.Fatal("expected dev secret to not be visible in staging")
	}

	// Add to staging
	if err := mod.SetSecret("STAGING_ONLY", "staging-val", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	// Switch back to dev
	mod.SwitchEnvironment("dev")
	val, ok := mod.GetSecret("DEV_ONLY")
	if !ok || val != "dev-val" {
		t.Fatal("expected dev secret to be restored")
	}
	_, ok = mod.GetSecret("STAGING_ONLY")
	if ok {
		t.Fatal("expected staging secret to not be visible in dev")
	}
}

func TestEnvironments(t *testing.T) {
	mod := newTestModule(t)

	envs := mod.Environments()
	if len(envs) < 3 {
		t.Fatalf("expected at least 3 environments, got %d", len(envs))
	}

	found := make(map[string]bool)
	for _, e := range envs {
		found[e] = true
	}
	for _, expected := range []string{"dev", "staging", "prod"} {
		if !found[expected] {
			t.Fatalf("expected environment %q", expected)
		}
	}
}

func TestSwitchToNewEnvironment(t *testing.T) {
	mod := newTestModule(t)

	mod.SwitchEnvironment("custom-env")
	if mod.ActiveEnvironment() != "custom-env" {
		t.Fatalf("expected 'custom-env', got %q", mod.ActiveEnvironment())
	}

	envs := mod.Environments()
	found := false
	for _, e := range envs {
		if e == "custom-env" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected custom-env in environments list")
	}
}

func TestImportEnv(t *testing.T) {
	mod := newTestModule(t)

	content := `# Database config
DB_HOST=localhost
DB_PORT=5432
DB_NAME="myapp"
DB_PASS='s3cret'

# Empty line above should be skipped
API_KEY=abc123
`
	count, err := mod.ImportEnv(content)
	if err != nil {
		t.Fatalf("ImportEnv: %v", err)
	}
	if count != 5 {
		t.Fatalf("expected 5 imported, got %d", count)
	}

	secrets := mod.ListSecrets()
	if len(secrets) != 5 {
		t.Fatalf("expected 5 secrets, got %d", len(secrets))
	}

	val, ok := mod.GetSecret("DB_HOST")
	if !ok || val != "localhost" {
		t.Fatalf("expected DB_HOST=localhost, got %q", val)
	}

	// Verify quote stripping
	val, ok = mod.GetSecret("DB_NAME")
	if !ok || val != "myapp" {
		t.Fatalf("expected DB_NAME=myapp (unquoted), got %q", val)
	}
	val, ok = mod.GetSecret("DB_PASS")
	if !ok || val != "s3cret" {
		t.Fatalf("expected DB_PASS=s3cret (unquoted), got %q", val)
	}
}

func TestExportEnv(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("DB_HOST", "localhost", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	if err := mod.SetSecret("API_KEY", "secret123", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	exported := mod.ExportEnv()

	if !strings.Contains(exported, "API_KEY=<your-api_key-here>") {
		t.Fatalf("expected placeholder for API_KEY, got:\n%s", exported)
	}
	if !strings.Contains(exported, "DB_HOST=<your-db_host-here>") {
		t.Fatalf("expected placeholder for DB_HOST, got:\n%s", exported)
	}
	// Should not contain actual values
	if strings.Contains(exported, "localhost") {
		t.Fatal("exported .env.example should not contain real values")
	}
	if strings.Contains(exported, "secret123") {
		t.Fatal("exported .env.example should not contain real values")
	}
}

func TestPersistenceAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "persist.db")

	// First instance
	mod1 := New(dbPath, testKey)
	if err := mod1.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := mod1.SetSecret("PERSIST_KEY", "persist_value", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	mod1.Stop()

	// Second instance — should recover
	mod2 := New(dbPath, testKey)
	if err := mod2.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer mod2.Stop()

	val, ok := mod2.GetSecret("PERSIST_KEY")
	if !ok || val != "persist_value" {
		t.Fatalf("expected persisted secret 'persist_value', got %q, ok=%v", val, ok)
	}
}

func TestCurrentView(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("MY_SECRET", "value123", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	view := mod.CurrentView()

	if view.Module != "guard" {
		t.Fatalf("expected module 'guard', got %q", view.Module)
	}
	if len(view.Components) == 0 {
		t.Fatal("expected at least one component")
	}

	// Check header
	header := view.Components[0]
	if header.Type != "header" {
		t.Fatalf("expected first component to be header, got %q", header.Type)
	}
	if header.Content == nil || !strings.Contains(*header.Content, "GUARD") {
		t.Fatalf("expected header to contain 'GUARD'")
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
	if len(table.Columns) != 5 {
		t.Fatalf("expected 5 columns, got %d", len(table.Columns))
	}
	if len(table.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(table.Rows))
	}

	// Value should be masked by default
	row := table.Rows[0]
	if row.Values["value"] != "••••••••" {
		t.Fatalf("expected masked value, got %q", row.Values["value"])
	}
	if row.Values["key"] != "MY_SECRET" {
		t.Fatalf("expected key 'MY_SECRET', got %q", row.Values["key"])
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
	if len(form.Fields) != 2 {
		t.Fatalf("expected 2 form fields, got %d", len(form.Fields))
	}

	// Check actions
	if len(view.Actions) < 5 {
		t.Fatalf("expected at least 5 actions, got %d", len(view.Actions))
	}
}

func TestCurrentViewMaskedByDefault(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("SECRET", "hidden_value", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	view := mod.CurrentView()
	for _, c := range view.Components {
		if c.Type == "table" {
			for _, row := range c.Rows {
				if row.Values["key"] == "SECRET" {
					if row.Values["value"] != "••••••••" {
						t.Fatalf("expected masked value, got %q", row.Values["value"])
					}
					return
				}
			}
		}
	}
	t.Fatal("SECRET row not found in table")
}

func TestHandleRevealEvent(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("REVEAL_ME", "actual_value", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	// Reveal
	actionID := "reveal"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"key": "REVEAL_ME"},
	})
	if err != nil {
		t.Fatalf("HandleEvent reveal: %v", err)
	}

	view := mod.CurrentView()
	for _, c := range view.Components {
		if c.Type == "table" {
			for _, row := range c.Rows {
				if row.Values["key"] == "REVEAL_ME" {
					if row.Values["value"] != "actual_value" {
						t.Fatalf("expected revealed value, got %q", row.Values["value"])
					}
					return
				}
			}
		}
	}
	t.Fatal("REVEAL_ME row not found")
}

func TestHandleRevealToggle(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("TOGGLE_ME", "val", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	actionID := "reveal"
	event := &pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"key": "TOGGLE_ME"},
	}

	// First reveal
	mod.HandleEvent(event)
	// Second reveal should hide
	mod.HandleEvent(event)

	view := mod.CurrentView()
	for _, c := range view.Components {
		if c.Type == "table" {
			for _, row := range c.Rows {
				if row.Values["key"] == "TOGGLE_ME" {
					if row.Values["value"] != "••••••••" {
						t.Fatalf("expected re-masked value after toggle, got %q", row.Values["value"])
					}
					return
				}
			}
		}
	}
	t.Fatal("TOGGLE_ME row not found")
}

func TestHandleAddEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "add"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data: map[string]string{
			"key":   "NEW_KEY",
			"value": "new_value",
		},
	})
	if err != nil {
		t.Fatalf("HandleEvent add: %v", err)
	}

	val, ok := mod.GetSecret("NEW_KEY")
	if !ok || val != "new_value" {
		t.Fatalf("expected 'new_value', got %q", val)
	}
}

func TestHandleAddEventMissingFields(t *testing.T) {
	mod := newTestModule(t)

	actionID := "add"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"key": ""},
	})
	if err == nil {
		t.Fatal("expected error for missing key")
	}
}

func TestHandleDeleteEvent(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("DELETE_ME", "val", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	actionID := "delete"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"key": "DELETE_ME"},
	})
	if err != nil {
		t.Fatalf("HandleEvent delete: %v", err)
	}

	_, ok := mod.GetSecret("DELETE_ME")
	if ok {
		t.Fatal("expected secret to be deleted")
	}
}

func TestHandleSwitchEnvEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "switch-env"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"environment": "prod"},
	})
	if err != nil {
		t.Fatalf("HandleEvent switch-env: %v", err)
	}

	if mod.ActiveEnvironment() != "prod" {
		t.Fatalf("expected 'prod', got %q", mod.ActiveEnvironment())
	}
}

func TestHandleImportEnvEvent(t *testing.T) {
	mod := newTestModule(t)

	actionID := "import-env"
	content := "IMPORTED_KEY=imported_value\nANOTHER=val2"
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"content": content},
	})
	if err != nil {
		t.Fatalf("HandleEvent import-env: %v", err)
	}

	val, ok := mod.GetSecret("IMPORTED_KEY")
	if !ok || val != "imported_value" {
		t.Fatalf("expected imported secret, got %q", val)
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
		Module:    "guard",
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
	if received.Module != "guard" {
		t.Fatalf("expected module 'guard', got %q", received.Module)
	}
}

func TestHandleEventNoActionID(t *testing.T) {
	mod := newTestModule(t)

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("HandleEvent with nil actionId should not error: %v", err)
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

func TestParseEnvContent(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    map[string]string
	}{
		{
			name:    "simple",
			content: "KEY=value",
			want:    map[string]string{"KEY": "value"},
		},
		{
			name:    "double quoted",
			content: `KEY="quoted value"`,
			want:    map[string]string{"KEY": "quoted value"},
		},
		{
			name:    "single quoted",
			content: `KEY='quoted value'`,
			want:    map[string]string{"KEY": "quoted value"},
		},
		{
			name:    "comments and blanks",
			content: "# comment\n\nKEY=value\n\n# another comment\n",
			want:    map[string]string{"KEY": "value"},
		},
		{
			name:    "whitespace trimming",
			content: "  KEY  =  value  ",
			want:    map[string]string{"KEY": "value"},
		},
		{
			name:    "multiple pairs",
			content: "A=1\nB=2\nC=3",
			want:    map[string]string{"A": "1", "B": "2", "C": "3"},
		},
		{
			name:    "value with equals",
			content: "KEY=val=ue",
			want:    map[string]string{"KEY": "val=ue"},
		},
		{
			name:    "empty value",
			content: "KEY=",
			want:    map[string]string{"KEY": ""},
		},
		{
			name:    "invalid line no equals",
			content: "NOEQUALSSIGN",
			want:    map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseEnvContent(tt.content)
			if len(got) != len(tt.want) {
				t.Fatalf("expected %d pairs, got %d: %v", len(tt.want), len(got), got)
			}
			for k, v := range tt.want {
				if got[k] != v {
					t.Fatalf("key %q: expected %q, got %q", k, v, got[k])
				}
			}
		})
	}
}

func TestUIProviderInterface(t *testing.T) {
	dir := t.TempDir()
	mod := New(filepath.Join(dir, "test.db"), testKey)

	// Compile-time check
	var _ module.UIProvider = mod
}

func TestSecretTimestamps(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("TIMED", "val", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	secrets := mod.ListSecrets()
	if len(secrets) != 1 {
		t.Fatalf("expected 1 secret, got %d", len(secrets))
	}

	s := secrets[0]
	if s.CreatedAt == "" {
		t.Fatal("expected createdAt to be set")
	}
	if s.UpdatedAt == "" {
		t.Fatal("expected updatedAt to be set")
	}
	if s.Source != "manual" {
		t.Fatalf("expected source 'manual', got %q", s.Source)
	}
}

func TestSwitchEnvClearsRevealed(t *testing.T) {
	mod := newTestModule(t)

	if err := mod.SetSecret("S1", "v1", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}

	// Reveal a secret
	actionID := "reveal"
	mod.HandleEvent(&pb.UIEventRequest{
		Module:    "guard",
		ActionId:  &actionID,
		EventType: "click",
		Data:      map[string]string{"key": "S1"},
	})

	// Switch env and switch back — revealed state should be cleared
	mod.SwitchEnvironment("staging")
	mod.SwitchEnvironment("dev")

	view := mod.CurrentView()
	for _, c := range view.Components {
		if c.Type == "table" {
			for _, row := range c.Rows {
				if row.Values["key"] == "S1" {
					if row.Values["value"] != "••••••••" {
						t.Fatalf("expected masked after env switch, got %q", row.Values["value"])
					}
					return
				}
			}
		}
	}
	t.Fatal("S1 row not found")
}

func TestEncryptionWithWrongKey(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")

	// Write with key 1
	mod1 := New(dbPath, testKey)
	if err := mod1.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := mod1.SetSecret("ENCRYPTED", "sensitive", "manual"); err != nil {
		t.Fatalf("SetSecret: %v", err)
	}
	mod1.Stop()

	// Try to read with wrong key — Start should succeed (it opens the DB)
	// but the data will be unreadable
	wrongKey := []byte("99999999999999999999999999999999")
	mod2 := New(dbPath, wrongKey)
	err := mod2.Start()
	// The load will either fail entirely or load garbage
	if err != nil {
		// This is acceptable — wrong key should prevent access
		return
	}
	defer mod2.Stop()

	// If it didn't error on load, the secret should not be accessible
	val, ok := mod2.GetSecret("ENCRYPTED")
	if ok && val == "sensitive" {
		t.Fatal("expected wrong key to prevent reading real values")
	}
}
