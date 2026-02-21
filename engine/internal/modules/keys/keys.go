// Package keys implements the KEYS (shortcuts & command palette) engine module.
// It manages keyboard shortcuts with default mappings, user customization,
// conflict detection, and exposes command palette data for the Electron omnibar.
package keys

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/mixa-ai/engine/internal/module"
	"github.com/mixa-ai/engine/internal/storage"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Command represents an available action exposed to the command palette.
type Command struct {
	ID          string `json:"id"`
	Module      string `json:"module"`
	Category    string `json:"category"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// Binding maps a keyboard shortcut to a command.
type Binding struct {
	Shortcut  string `json:"shortcut"`
	CommandID string `json:"commandId"`
	IsCustom  bool   `json:"isCustom"`
}

// Conflict describes a shortcut collision between multiple commands.
type Conflict struct {
	Shortcut   string   `json:"shortcut"`
	CommandIDs []string `json:"commandIds"`
}

// Module implements the KEYS shortcuts & command palette module.
type Module struct {
	store  *storage.Store
	dbPath string
	encKey []byte

	mu       sync.RWMutex
	commands map[string]*Command // id -> Command
	defaults map[string]string   // commandID -> shortcut (built-in defaults)
	custom   map[string]string   // commandID -> shortcut (user overrides)
	active   map[string]string   // commandID -> shortcut (merged: custom overrides defaults)
	reverse  map[string][]string // shortcut -> []commandID (for conflict detection)

	subMu       sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

// New creates a new KEYS module. dbPath is the SQLite database location;
// encKey must be exactly 32 bytes for AES-256-GCM.
func New(dbPath string, encKey []byte) *Module {
	m := &Module{
		dbPath:      dbPath,
		encKey:      encKey,
		commands:    make(map[string]*Command),
		defaults:    make(map[string]string),
		custom:      make(map[string]string),
		active:      make(map[string]string),
		reverse:     make(map[string][]string),
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
	m.registerDefaults()
	return m
}

func (m *Module) Name() string        { return "keys" }
func (m *Module) DisplayName() string { return "KEYS" }
func (m *Module) Description() string { return "Keyboard shortcuts & command palette" }

// Start opens the encrypted store and loads user-customized shortcuts.
func (m *Module) Start() error {
	store, err := storage.Open(m.dbPath, m.encKey)
	if err != nil {
		return fmt.Errorf("keys: open store: %w", err)
	}
	m.store = store

	if err := m.loadCustomBindings(); err != nil {
		store.Close()
		return fmt.Errorf("keys: load bindings: %w", err)
	}

	m.rebuildActive()
	return nil
}

// Stop closes the encrypted store.
func (m *Module) Stop() error {
	if m.store != nil {
		return m.store.Close()
	}
	return nil
}

// --- Default shortcuts ---

func (m *Module) registerDefaults() {
	// Global shortcuts
	m.addCommand("global.new-tab", "global", "navigation", "New Tab", "Open a new browser tab")
	m.addCommand("global.close-tab", "global", "navigation", "Close Tab", "Close the active tab")
	m.addCommand("global.next-tab", "global", "navigation", "Next Tab", "Switch to the next tab")
	m.addCommand("global.prev-tab", "global", "navigation", "Previous Tab", "Switch to the previous tab")
	m.addCommand("global.reload", "global", "navigation", "Reload Page", "Reload the current page")
	m.addCommand("global.back", "global", "navigation", "Go Back", "Navigate back in history")
	m.addCommand("global.forward", "global", "navigation", "Go Forward", "Navigate forward in history")
	m.addCommand("global.focus-omnibar", "global", "navigation", "Focus Omnibar", "Focus the URL/command bar")
	m.addCommand("global.command-palette", "global", "navigation", "Command Palette", "Open the command palette")
	m.addCommand("global.toggle-sidebar", "global", "navigation", "Toggle Sidebar", "Show or hide the sidebar")
	m.addCommand("global.toggle-devtools", "global", "navigation", "Toggle DevTools", "Open or close developer tools")
	m.addCommand("global.settings", "global", "navigation", "Open Settings", "Open the settings tab")
	m.addCommand("global.zoom-in", "global", "view", "Zoom In", "Increase page zoom level")
	m.addCommand("global.zoom-out", "global", "view", "Zoom Out", "Decrease page zoom level")
	m.addCommand("global.zoom-reset", "global", "view", "Reset Zoom", "Reset zoom to 100%")
	m.addCommand("global.find", "global", "editing", "Find in Page", "Search within the current page")

	// GUARD module shortcuts
	m.addCommand("guard.add", "guard", "secrets", "Add Secret", "Add a new secret or environment variable")
	m.addCommand("guard.switch-env", "guard", "secrets", "Switch Environment", "Switch between dev/staging/prod environments")
	m.addCommand("guard.refresh", "guard", "secrets", "Refresh Secrets", "Reload the secrets list")

	// FORGE module shortcuts
	m.addCommand("forge.refresh", "forge", "git", "Refresh Repos", "Rescan Git repositories")
	m.addCommand("forge.pull", "forge", "git", "Git Pull", "Pull latest changes for the active repo")
	m.addCommand("forge.push", "forge", "git", "Git Push", "Push local changes to remote")
	m.addCommand("forge.switch-repo", "forge", "git", "Switch Repository", "Switch to a different Git repository")

	// KEYS module shortcuts
	m.addCommand("keys.refresh", "keys", "shortcuts", "Refresh Shortcuts", "Reload the shortcuts view")
	m.addCommand("keys.reset-all", "keys", "shortcuts", "Reset All Shortcuts", "Reset all shortcuts to defaults")

	// Default bindings
	m.defaults["global.new-tab"] = "Ctrl+T"
	m.defaults["global.close-tab"] = "Ctrl+W"
	m.defaults["global.next-tab"] = "Ctrl+Tab"
	m.defaults["global.prev-tab"] = "Ctrl+Shift+Tab"
	m.defaults["global.reload"] = "Ctrl+R"
	m.defaults["global.back"] = "Alt+Left"
	m.defaults["global.forward"] = "Alt+Right"
	m.defaults["global.focus-omnibar"] = "Ctrl+L"
	m.defaults["global.command-palette"] = "Ctrl+K"
	m.defaults["global.toggle-sidebar"] = "Ctrl+B"
	m.defaults["global.toggle-devtools"] = "Ctrl+Shift+I"
	m.defaults["global.settings"] = "Ctrl+,"
	m.defaults["global.zoom-in"] = "Ctrl+="
	m.defaults["global.zoom-out"] = "Ctrl+-"
	m.defaults["global.zoom-reset"] = "Ctrl+0"
	m.defaults["global.find"] = "Ctrl+F"
	m.defaults["guard.add"] = "Ctrl+N"
	m.defaults["guard.switch-env"] = "Ctrl+E"
	m.defaults["guard.refresh"] = "Ctrl+Shift+R"
	m.defaults["forge.refresh"] = "Ctrl+Shift+R"
	m.defaults["forge.pull"] = "Ctrl+Shift+P"
	m.defaults["forge.push"] = "Ctrl+Shift+U"
	m.defaults["forge.switch-repo"] = "Ctrl+Shift+O"
	m.defaults["keys.refresh"] = "Ctrl+Shift+R"
	m.defaults["keys.reset-all"] = "Ctrl+Shift+Backspace"
}

func (m *Module) addCommand(id, mod, category, label, description string) {
	m.commands[id] = &Command{
		ID:          id,
		Module:      mod,
		Category:    category,
		Label:       label,
		Description: description,
	}
}

// --- Data operations ---

func (m *Module) loadCustomBindings() error {
	data, err := m.store.Get("keys:bindings")
	if err != nil {
		return err
	}
	if data == nil {
		return nil
	}
	return json.Unmarshal(data, &m.custom)
}

func (m *Module) persistCustomBindings() error {
	data, err := json.Marshal(m.custom)
	if err != nil {
		return err
	}
	return m.store.Put("keys:bindings", data)
}

// rebuildActive merges defaults with custom overrides and builds the reverse index.
func (m *Module) rebuildActive() {
	m.active = make(map[string]string)
	m.reverse = make(map[string][]string)

	// Start with defaults
	for cmdID, shortcut := range m.defaults {
		m.active[cmdID] = shortcut
	}

	// Apply custom overrides
	for cmdID, shortcut := range m.custom {
		if _, exists := m.commands[cmdID]; exists {
			m.active[cmdID] = shortcut
		}
	}

	// Build reverse index
	for cmdID, shortcut := range m.active {
		normalized := NormalizeShortcut(shortcut)
		m.reverse[normalized] = append(m.reverse[normalized], cmdID)
	}
}

// NormalizeShortcut normalizes a shortcut string for consistent comparison.
// It sorts modifier keys alphabetically and lowercases everything.
func NormalizeShortcut(s string) string {
	parts := strings.Split(s, "+")
	if len(parts) <= 1 {
		return strings.ToLower(strings.TrimSpace(s))
	}

	// Separate modifiers from the main key
	modifiers := make([]string, 0, len(parts)-1)
	mainKey := strings.ToLower(strings.TrimSpace(parts[len(parts)-1]))

	for _, p := range parts[:len(parts)-1] {
		mod := strings.ToLower(strings.TrimSpace(p))
		modifiers = append(modifiers, mod)
	}

	sort.Strings(modifiers)
	return strings.Join(append(modifiers, mainKey), "+")
}

// SetBinding sets a custom shortcut binding for a command. Pass empty shortcut
// to unbind. Returns a Conflict if the shortcut is already bound to another command.
func (m *Module) SetBinding(commandID, shortcut string) (*Conflict, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.commands[commandID]; !exists {
		return nil, fmt.Errorf("unknown command: %s", commandID)
	}

	if shortcut == "" {
		// Unbind: remove the custom override and the active binding
		delete(m.custom, commandID)
		if err := m.persistCustomBindings(); err != nil {
			return nil, err
		}
		m.rebuildActive()
		m.notifySubscribersLocked()
		return nil, nil
	}

	m.custom[commandID] = shortcut
	if err := m.persistCustomBindings(); err != nil {
		return nil, err
	}

	m.rebuildActive()

	// Check for conflicts
	conflict := m.detectConflictForShortcut(NormalizeShortcut(shortcut))
	m.notifySubscribersLocked()
	return conflict, nil
}

// ResetBinding removes a custom override, reverting to the default shortcut.
func (m *Module) ResetBinding(commandID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.custom, commandID)
	if err := m.persistCustomBindings(); err != nil {
		return err
	}
	m.rebuildActive()
	m.notifySubscribersLocked()
	return nil
}

// ResetAll removes all custom overrides, reverting everything to defaults.
func (m *Module) ResetAll() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.custom = make(map[string]string)
	if err := m.persistCustomBindings(); err != nil {
		return err
	}
	m.rebuildActive()
	m.notifySubscribersLocked()
	return nil
}

// GetBinding returns the active shortcut for a command.
func (m *Module) GetBinding(commandID string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.active[commandID]
	return s, ok
}

// ListCommands returns all registered commands sorted by module then ID.
func (m *Module) ListCommands() []*Command {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Command, 0, len(m.commands))
	for _, cmd := range m.commands {
		result = append(result, cmd)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Module != result[j].Module {
			return result[i].Module < result[j].Module
		}
		return result[i].ID < result[j].ID
	})
	return result
}

// FilterCommands returns commands matching the given filters. All filters are
// optional; empty string means no filter on that field. The search string
// matches against command ID, label, and description (case-insensitive).
func (m *Module) FilterCommands(moduleFilter, categoryFilter, search string) []*Command {
	m.mu.RLock()
	defer m.mu.RUnlock()

	searchLower := strings.ToLower(search)
	result := make([]*Command, 0)

	for _, cmd := range m.commands {
		if moduleFilter != "" && cmd.Module != moduleFilter {
			continue
		}
		if categoryFilter != "" && cmd.Category != categoryFilter {
			continue
		}
		if search != "" {
			idMatch := strings.Contains(strings.ToLower(cmd.ID), searchLower)
			labelMatch := strings.Contains(strings.ToLower(cmd.Label), searchLower)
			descMatch := strings.Contains(strings.ToLower(cmd.Description), searchLower)
			if !idMatch && !labelMatch && !descMatch {
				continue
			}
		}
		result = append(result, cmd)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Module != result[j].Module {
			return result[i].Module < result[j].Module
		}
		return result[i].ID < result[j].ID
	})
	return result
}

// DetectConflicts returns all shortcut conflicts in the active binding set.
func (m *Module) DetectConflicts() []Conflict {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var conflicts []Conflict
	for shortcut, cmdIDs := range m.reverse {
		if len(cmdIDs) > 1 {
			sorted := make([]string, len(cmdIDs))
			copy(sorted, cmdIDs)
			sort.Strings(sorted)
			conflicts = append(conflicts, Conflict{
				Shortcut:   shortcut,
				CommandIDs: sorted,
			})
		}
	}
	sort.Slice(conflicts, func(i, j int) bool {
		return conflicts[i].Shortcut < conflicts[j].Shortcut
	})
	return conflicts
}

func (m *Module) detectConflictForShortcut(normalized string) *Conflict {
	cmdIDs := m.reverse[normalized]
	if len(cmdIDs) <= 1 {
		return nil
	}
	sorted := make([]string, len(cmdIDs))
	copy(sorted, cmdIDs)
	sort.Strings(sorted)
	return &Conflict{
		Shortcut:   normalized,
		CommandIDs: sorted,
	}
}

// ActiveBindings returns all active bindings as a slice sorted by command ID.
func (m *Module) ActiveBindings() []Binding {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]Binding, 0, len(m.active))
	for cmdID, shortcut := range m.active {
		_, isCustom := m.custom[cmdID]
		result = append(result, Binding{
			Shortcut:  shortcut,
			CommandID: cmdID,
			IsCustom:  isCustom,
		})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CommandID < result[j].CommandID
	})
	return result
}

// ExportConfig returns the current shortcut configuration as JSON.
func (m *Module) ExportConfig() (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	type exportFormat struct {
		Bindings map[string]string `json:"bindings"`
	}

	data, err := json.MarshalIndent(exportFormat{Bindings: m.active}, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ImportConfig imports shortcut configuration from JSON, overwriting custom bindings.
func (m *Module) ImportConfig(jsonData string) (int, error) {
	type importFormat struct {
		Bindings map[string]string `json:"bindings"`
	}

	var imported importFormat
	if err := json.Unmarshal([]byte(jsonData), &imported); err != nil {
		return 0, fmt.Errorf("invalid JSON: %w", err)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	count := 0
	for cmdID, shortcut := range imported.Bindings {
		if _, exists := m.commands[cmdID]; !exists {
			continue
		}
		if defaultShortcut, ok := m.defaults[cmdID]; ok && defaultShortcut == shortcut {
			// Same as default — no need to store custom
			delete(m.custom, cmdID)
		} else {
			m.custom[cmdID] = shortcut
		}
		count++
	}

	if err := m.persistCustomBindings(); err != nil {
		return 0, err
	}
	m.rebuildActive()
	m.notifySubscribersLocked()
	return count, nil
}

// CommandPaletteEntries returns entries suitable for the Electron omnibar/Cmd+K palette.
// Each entry includes the command details plus its active shortcut.
func (m *Module) CommandPaletteEntries(search string) []PaletteEntry {
	cmds := m.FilterCommands("", "", search)

	m.mu.RLock()
	defer m.mu.RUnlock()

	entries := make([]PaletteEntry, 0, len(cmds))
	for _, cmd := range cmds {
		shortcut := m.active[cmd.ID]
		entries = append(entries, PaletteEntry{
			ID:          cmd.ID,
			Module:      cmd.Module,
			Category:    cmd.Category,
			Label:       cmd.Label,
			Description: cmd.Description,
			Shortcut:    shortcut,
		})
	}
	return entries
}

// PaletteEntry is a command palette entry with its active shortcut.
type PaletteEntry struct {
	ID          string `json:"id"`
	Module      string `json:"module"`
	Category    string `json:"category"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Shortcut    string `json:"shortcut,omitempty"`
}

// --- UIProvider interface ---

// CurrentView returns the KEYS module's current UI view.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()

	bindings := make([]Binding, 0, len(m.active))
	for cmdID, shortcut := range m.active {
		_, isCustom := m.custom[cmdID]
		bindings = append(bindings, Binding{
			Shortcut:  shortcut,
			CommandID: cmdID,
			IsCustom:  isCustom,
		})
	}
	sort.Slice(bindings, func(i, j int) bool {
		return bindings[i].CommandID < bindings[j].CommandID
	})

	rows := make([]*pb.RowData, 0, len(bindings))
	for _, b := range bindings {
		cmd := m.commands[b.CommandID]
		if cmd == nil {
			continue
		}
		source := "default"
		if b.IsCustom {
			source = "custom"
		}
		rows = append(rows, &pb.RowData{
			Values: map[string]string{
				"command":     cmd.ID,
				"label":       cmd.Label,
				"shortcut":    b.Shortcut,
				"module":      cmd.Module,
				"category":    cmd.Category,
				"source":      source,
				"description": cmd.Description,
			},
		})
	}

	conflicts := m.detectAllConflicts()
	conflictCount := len(conflicts)

	headerLevel := int32(1)
	headerContent := "KEYS \u2014 Shortcuts & Command Palette"
	statusContent := fmt.Sprintf("KEYS \u2022 %d commands \u2022 %d bindings \u2022 %d custom \u2022 %d conflicts",
		len(m.commands), len(m.active), len(m.custom), conflictCount)

	editShortcut := strPtr("Ctrl+E")
	refreshShortcut := strPtr("Ctrl+Shift+R")

	components := []*pb.UIComponent{
		{
			Id:      "keys-header",
			Type:    "header",
			Level:   &headerLevel,
			Content: &headerContent,
		},
		{
			Id:   "keys-metrics",
			Type: "metric_row",
			Metrics: []*pb.Metric{
				{Label: "Commands", Value: fmt.Sprintf("%d", len(m.commands)), Trend: "flat"},
				{Label: "Bindings", Value: fmt.Sprintf("%d", len(m.active)), Trend: "flat"},
				{Label: "Custom", Value: fmt.Sprintf("%d", len(m.custom)), Trend: "flat"},
				{Label: "Conflicts", Value: fmt.Sprintf("%d", conflictCount), Trend: conflictTrend(conflictCount)},
			},
		},
		{
			Id:   "keys-bindings-table",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "shortcut", Label: "Shortcut", Sortable: true},
				{Key: "label", Label: "Command", Sortable: true},
				{Key: "module", Label: "Module", Sortable: true},
				{Key: "category", Label: "Category", Sortable: true},
				{Key: "source", Label: "Source", Sortable: true},
				{Key: "description", Label: "Description", Sortable: false},
			},
			Rows: rows,
		},
		{
			Id:   "keys-edit-form",
			Type: "form",
			Fields: []*pb.FormField{
				{Id: "commandId", Label: "Command ID", FieldType: "text", Placeholder: strPtr("global.new-tab"), Required: true},
				{Id: "shortcut", Label: "Shortcut", FieldType: "text", Placeholder: strPtr("Ctrl+N"), Required: true},
			},
		},
		{
			Id:      "keys-status",
			Type:    "status_bar",
			Content: &statusContent,
		},
	}

	// Add conflict warnings if any
	if conflictCount > 0 {
		conflictHeader := int32(3)
		conflictTitle := fmt.Sprintf("Shortcut Conflicts (%d)", conflictCount)

		conflictRows := make([]*pb.RowData, 0, conflictCount)
		for _, c := range conflicts {
			conflictRows = append(conflictRows, &pb.RowData{
				Values: map[string]string{
					"shortcut": c.Shortcut,
					"commands": strings.Join(c.CommandIDs, ", "),
				},
			})
		}

		// Insert conflict section before the status bar
		conflictComponents := []*pb.UIComponent{
			{
				Id:      "keys-conflict-header",
				Type:    "header",
				Level:   &conflictHeader,
				Content: &conflictTitle,
			},
			{
				Id:   "keys-conflict-table",
				Type: "table",
				Columns: []*pb.TableColumn{
					{Key: "shortcut", Label: "Shortcut", Sortable: true},
					{Key: "commands", Label: "Conflicting Commands", Sortable: false},
				},
				Rows: conflictRows,
			},
		}
		// Insert before the last element (status bar)
		last := components[len(components)-1]
		components = append(components[:len(components)-1], conflictComponents...)
		components = append(components, last)
	}

	return &pb.UIViewUpdate{
		Module:     "keys",
		Components: components,
		Actions: []*pb.UIAction{
			{Id: "set-binding", Label: "Set Shortcut", Shortcut: editShortcut, Enabled: true},
			{Id: "reset-binding", Label: "Reset to Default", Enabled: true},
			{Id: "reset-all", Label: "Reset All", Enabled: true},
			{Id: "import", Label: "Import Config", Enabled: true},
			{Id: "export", Label: "Export Config", Enabled: true},
			{Id: "refresh", Label: "Refresh", Shortcut: refreshShortcut, Enabled: true},
		},
	}
}

// HandleEvent processes user interactions with the KEYS UI.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId == nil {
		return nil
	}

	switch *event.ActionId {
	case "set-binding":
		cmdID := event.Data["commandId"]
		shortcut := event.Data["shortcut"]
		if cmdID == "" || shortcut == "" {
			return fmt.Errorf("commandId and shortcut are required")
		}
		conflict, err := m.SetBinding(cmdID, shortcut)
		if err != nil {
			return err
		}
		if conflict != nil {
			return fmt.Errorf("conflict: shortcut %q is also bound to: %s",
				conflict.Shortcut, strings.Join(conflict.CommandIDs, ", "))
		}

	case "reset-binding":
		cmdID := event.Data["commandId"]
		if cmdID == "" {
			return fmt.Errorf("commandId is required")
		}
		return m.ResetBinding(cmdID)

	case "reset-all":
		return m.ResetAll()

	case "import":
		content := event.Data["content"]
		if content == "" {
			return fmt.Errorf("content is required")
		}
		_, err := m.ImportConfig(content)
		return err

	case "export":
		m.notifySubscribers()

	case "refresh":
		m.notifySubscribers()
	}

	return nil
}

// Subscribe registers a callback for view updates. Returns an unsubscribe function.
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

func (m *Module) detectAllConflicts() []Conflict {
	var conflicts []Conflict
	for shortcut, cmdIDs := range m.reverse {
		if len(cmdIDs) > 1 {
			sorted := make([]string, len(cmdIDs))
			copy(sorted, cmdIDs)
			sort.Strings(sorted)
			conflicts = append(conflicts, Conflict{
				Shortcut:   shortcut,
				CommandIDs: sorted,
			})
		}
	}
	sort.Slice(conflicts, func(i, j int) bool {
		return conflicts[i].Shortcut < conflicts[j].Shortcut
	})
	return conflicts
}

// --- Helpers ---

func strPtr(s string) *string { return &s }

func conflictTrend(count int) string {
	if count > 0 {
		return "up"
	}
	return "flat"
}

// Verify interface compliance at compile time.
var (
	_ module.Module     = (*Module)(nil)
	_ module.UIProvider = (*Module)(nil)
)
