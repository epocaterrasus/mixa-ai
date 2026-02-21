// Package guard implements the GUARD (secrets & environment management)
// engine module. It stores environment variables encrypted in SQLite via
// AES-256-GCM, supports switching between environments (dev/staging/prod),
// and can import/export .env files.
package guard

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	"github.com/mixa-ai/engine/internal/storage"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Secret represents a single environment variable or secret.
type Secret struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Environment string `json:"environment"`
	Source      string `json:"source"` // "manual", "env-file", "doppler"
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// Module implements the GUARD secrets management module.
type Module struct {
	store   *storage.Store
	dbPath  string
	encKey  []byte

	mu          sync.RWMutex
	secrets     map[string]map[string]*Secret // environment -> key -> Secret
	activeEnv   string
	revealed    map[string]bool // key -> revealed (for current env)

	subMu       sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

// New creates a new GUARD module. dbPath is the SQLite database location;
// encKey must be exactly 32 bytes for AES-256-GCM.
func New(dbPath string, encKey []byte) *Module {
	return &Module{
		dbPath:      dbPath,
		encKey:      encKey,
		secrets:     make(map[string]map[string]*Secret),
		activeEnv:   "dev",
		revealed:    make(map[string]bool),
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
}

func (m *Module) Name() string        { return "guard" }
func (m *Module) DisplayName() string { return "GUARD" }
func (m *Module) Description() string { return "Secrets & environment variable management" }

// Start opens the encrypted store and loads persisted secrets.
func (m *Module) Start() error {
	store, err := storage.Open(m.dbPath, m.encKey)
	if err != nil {
		return fmt.Errorf("guard: open store: %w", err)
	}
	m.store = store

	if err := m.loadSecrets(); err != nil {
		store.Close()
		return fmt.Errorf("guard: load secrets: %w", err)
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

// --- Data operations ---

func (m *Module) loadSecrets() error {
	data, err := m.store.Get("guard:secrets")
	if err != nil {
		return err
	}
	if data == nil {
		// First run — initialize with empty dev environment.
		m.secrets["dev"] = make(map[string]*Secret)
		m.secrets["staging"] = make(map[string]*Secret)
		m.secrets["prod"] = make(map[string]*Secret)
		return nil
	}

	return json.Unmarshal(data, &m.secrets)
}

func (m *Module) persistSecrets() error {
	data, err := json.Marshal(m.secrets)
	if err != nil {
		return err
	}
	return m.store.Put("guard:secrets", data)
}

// SetSecret adds or updates a secret in the active environment.
func (m *Module) SetSecret(key, value, source string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	env := m.activeEnv
	if m.secrets[env] == nil {
		m.secrets[env] = make(map[string]*Secret)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	existing, ok := m.secrets[env][key]
	if ok {
		existing.Value = value
		existing.Source = source
		existing.UpdatedAt = now
	} else {
		m.secrets[env][key] = &Secret{
			Key:         key,
			Value:       value,
			Environment: env,
			Source:       source,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}

	if err := m.persistSecrets(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// DeleteSecret removes a secret from the active environment.
func (m *Module) DeleteSecret(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	env := m.activeEnv
	if m.secrets[env] == nil {
		return nil
	}
	delete(m.secrets[env], key)
	delete(m.revealed, key)

	if err := m.persistSecrets(); err != nil {
		return err
	}

	m.notifySubscribersLocked()
	return nil
}

// GetSecret returns the decrypted secret value for the given key in the active env.
func (m *Module) GetSecret(key string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	env := m.activeEnv
	if m.secrets[env] == nil {
		return "", false
	}
	s, ok := m.secrets[env][key]
	if !ok {
		return "", false
	}
	return s.Value, true
}

// ListSecrets returns all secrets in the active environment.
func (m *Module) ListSecrets() []*Secret {
	m.mu.RLock()
	defer m.mu.RUnlock()

	env := m.activeEnv
	if m.secrets[env] == nil {
		return nil
	}

	result := make([]*Secret, 0, len(m.secrets[env]))
	for _, s := range m.secrets[env] {
		result = append(result, s)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Key < result[j].Key
	})
	return result
}

// SwitchEnvironment changes the active environment.
func (m *Module) SwitchEnvironment(env string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.secrets[env] == nil {
		m.secrets[env] = make(map[string]*Secret)
	}
	m.activeEnv = env
	m.revealed = make(map[string]bool)
	m.notifySubscribersLocked()
}

// ActiveEnvironment returns the current active environment name.
func (m *Module) ActiveEnvironment() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeEnv
}

// Environments returns the list of available environments.
func (m *Module) Environments() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	envs := make([]string, 0, len(m.secrets))
	for env := range m.secrets {
		envs = append(envs, env)
	}
	sort.Strings(envs)
	return envs
}

// ImportEnv parses a .env file body and imports all key=value pairs as secrets
// in the active environment.
func (m *Module) ImportEnv(content string) (int, error) {
	pairs := parseEnvContent(content)
	count := 0
	for key, value := range pairs {
		if err := m.SetSecret(key, value, "env-file"); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// ExportEnv generates a sanitized .env.example (values replaced with placeholders).
func (m *Module) ExportEnv() string {
	secrets := m.ListSecrets()
	var b strings.Builder
	b.WriteString("# Generated by Mixa GUARD\n")
	b.WriteString(fmt.Sprintf("# Environment: %s\n\n", m.ActiveEnvironment()))
	for _, s := range secrets {
		b.WriteString(fmt.Sprintf("%s=<your-%s-here>\n", s.Key, strings.ToLower(s.Key)))
	}
	return b.String()
}

// --- UIProvider interface ---

// CurrentView returns the GUARD module's current UI view.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()

	env := m.activeEnv
	secrets := m.secrets[env]

	// Build sorted list for stable ordering
	sorted := make([]*Secret, 0, len(secrets))
	for _, s := range secrets {
		sorted = append(sorted, s)
	}
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Key < sorted[j].Key
	})

	rows := make([]*pb.RowData, 0, len(sorted))
	for _, s := range sorted {
		displayValue := "••••••••"
		if m.revealed[s.Key] {
			displayValue = s.Value
		}
		rows = append(rows, &pb.RowData{
			Values: map[string]string{
				"key":         s.Key,
				"value":       displayValue,
				"environment": s.Environment,
				"source":      s.Source,
				"updated":     s.UpdatedAt,
			},
		})
	}

	headerLevel := int32(1)
	headerContent := "GUARD — Secrets Manager"
	envInfoLevel := int32(3)
	envInfoContent := fmt.Sprintf("Environment: %s", env)
	statusContent := fmt.Sprintf("GUARD • %d secrets in %s • %d environments",
		len(sorted), env, len(m.secrets))

	envShortcut := strPtr("Ctrl+E")
	addShortcut := strPtr("Ctrl+N")
	refreshShortcut := strPtr("Ctrl+R")

	return &pb.UIViewUpdate{
		Module: "guard",
		Components: []*pb.UIComponent{
			{
				Id:      "guard-header",
				Type:    "header",
				Level:   &headerLevel,
				Content: &headerContent,
			},
			{
				Id:      "guard-env-info",
				Type:    "header",
				Level:   &envInfoLevel,
				Content: &envInfoContent,
			},
			{
				Id:   "guard-metrics",
				Type: "metric_row",
				Metrics: []*pb.Metric{
					{
						Label: "Secrets",
						Value: fmt.Sprintf("%d", len(sorted)),
						Trend: "flat",
					},
					{
						Label: "Environment",
						Value: env,
						Trend: "flat",
					},
					{
						Label: "Environments",
						Value: fmt.Sprintf("%d", len(m.secrets)),
						Trend: "flat",
					},
				},
			},
			{
				Id:   "guard-secrets-table",
				Type: "table",
				Columns: []*pb.TableColumn{
					{Key: "key", Label: "Key", Sortable: true},
					{Key: "value", Label: "Value", Sortable: false},
					{Key: "environment", Label: "Environment", Sortable: true},
					{Key: "source", Label: "Source", Sortable: true},
					{Key: "updated", Label: "Updated", Sortable: true},
				},
				Rows: rows,
			},
			{
				Id:   "guard-add-form",
				Type: "form",
				Fields: []*pb.FormField{
					{Id: "key", Label: "Key", FieldType: "text", Placeholder: strPtr("SECRET_NAME"), Required: true},
					{Id: "value", Label: "Value", FieldType: "password", Placeholder: strPtr("secret value"), Required: true},
				},
			},
			{
				Id:      "guard-status",
				Type:    "status_bar",
				Content: &statusContent,
			},
		},
		Actions: []*pb.UIAction{
			{Id: "add", Label: "Add Secret", Shortcut: addShortcut, Enabled: true},
			{Id: "delete", Label: "Delete", Enabled: true},
			{Id: "reveal", Label: "Reveal", Enabled: true},
			{Id: "copy", Label: "Copy", Enabled: true},
			{Id: "switch-env", Label: "Switch Env", Shortcut: envShortcut, Enabled: true},
			{Id: "import-env", Label: "Import .env", Enabled: true},
			{Id: "export-env", Label: "Export .env.example", Enabled: true},
			{Id: "refresh", Label: "Refresh", Shortcut: refreshShortcut, Enabled: true},
		},
	}
}

// HandleEvent processes user interactions with the GUARD UI.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId == nil {
		return nil
	}

	switch *event.ActionId {
	case "add":
		key := event.Data["key"]
		value := event.Data["value"]
		if key == "" || value == "" {
			return fmt.Errorf("key and value are required")
		}
		return m.SetSecret(key, value, "manual")

	case "delete":
		key := event.Data["key"]
		if key == "" {
			return fmt.Errorf("key is required")
		}
		return m.DeleteSecret(key)

	case "reveal":
		key := event.Data["key"]
		if key == "" {
			return nil
		}
		m.mu.Lock()
		m.revealed[key] = !m.revealed[key]
		m.mu.Unlock()
		m.notifySubscribers()

	case "copy":
		// Copy is handled client-side; the renderer reads the value from data.
		// We just need to return the value if the user requests it.
		return nil

	case "switch-env":
		env := event.Data["environment"]
		if env == "" {
			return fmt.Errorf("environment is required")
		}
		m.SwitchEnvironment(env)

	case "import-env":
		content := event.Data["content"]
		if content == "" {
			return fmt.Errorf("content is required")
		}
		_, err := m.ImportEnv(content)
		return err

	case "export-env":
		// The export content would be sent back via a view update
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
// It temporarily releases the lock to call CurrentView (which takes a read lock).
func (m *Module) notifySubscribersLocked() {
	m.mu.Unlock()
	m.notifySubscribers()
	m.mu.Lock()
}

// --- Helpers ---

func strPtr(s string) *string { return &s }

// parseEnvContent parses .env file content into key-value pairs.
// It handles comments, blank lines, and optional quoting.
func parseEnvContent(content string) map[string]string {
	result := make(map[string]string)
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx < 1 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		value := strings.TrimSpace(line[idx+1:])
		// Strip surrounding quotes
		if len(value) >= 2 {
			if (value[0] == '"' && value[len(value)-1] == '"') ||
				(value[0] == '\'' && value[len(value)-1] == '\'') {
				value = value[1 : len(value)-1]
			}
		}
		result[key] = value
	}
	return result
}

// Verify interface compliance at compile time.
var (
	_ module.Module     = (*Module)(nil)
	_ module.UIProvider = (*Module)(nil)
)
