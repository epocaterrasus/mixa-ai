// Package system implements the System Info engine module. It provides a
// read-only dashboard showing engine version, uptime, and registered module
// status. This serves as both a useful diagnostic tool and a reference
// implementation of the module.UIProvider interface.
package system

import (
	"fmt"
	"sync"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Module implements the system info module showing engine status.
type Module struct {
	registry  *module.Registry
	version   string
	startTime time.Time

	mu          sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

// New creates a new system module.
func New(registry *module.Registry, version string) *Module {
	return &Module{
		registry:    registry,
		version:     version,
		startTime:   time.Now(),
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
}

func (m *Module) Name() string        { return "system" }
func (m *Module) DisplayName() string { return "System Info" }
func (m *Module) Description() string { return "Engine status, version, and module overview" }
func (m *Module) Start() error        { return nil }
func (m *Module) Stop() error         { return nil }

// CurrentView returns the system status view snapshot.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	uptime := time.Since(m.startTime)
	modules := m.registry.List()

	runningCount := 0
	for _, info := range modules {
		if info.Status == module.StatusRunning {
			runningCount++
		}
	}

	rows := make([]*pb.RowData, 0, len(modules))
	for _, info := range modules {
		rows = append(rows, &pb.RowData{
			Values: map[string]string{
				"name":        info.Module.Name(),
				"displayName": info.Module.DisplayName(),
				"status":      string(info.Status),
				"description": info.Module.Description(),
			},
		})
	}

	headerLevel := int32(1)
	subHeaderLevel := int32(2)
	headerContent := "Fenix Engine"
	modulesHeader := "Registered Modules"
	statusContent := fmt.Sprintf("Fenix Engine %s \u2022 %d modules loaded", m.version, len(modules))

	return &pb.UIViewUpdate{
		Module: "system",
		Components: []*pb.UIComponent{
			{
				Id:      "system-header",
				Type:    "header",
				Level:   &headerLevel,
				Content: &headerContent,
			},
			{
				Id:   "system-metrics",
				Type: "metric_row",
				Metrics: []*pb.Metric{
					{
						Label: "Version",
						Value: m.version,
						Trend: "flat",
					},
					{
						Label: "Uptime",
						Value: formatDuration(uptime),
						Trend: "up",
					},
					{
						Label: "Modules",
						Value: fmt.Sprintf("%d/%d running", runningCount, len(modules)),
						Trend: "flat",
					},
				},
			},
			{
				Id:      "system-modules-header",
				Type:    "header",
				Level:   &subHeaderLevel,
				Content: &modulesHeader,
			},
			{
				Id:   "system-modules-table",
				Type: "table",
				Columns: []*pb.TableColumn{
					{Key: "name", Label: "Name", Sortable: true},
					{Key: "displayName", Label: "Display Name", Sortable: true},
					{Key: "status", Label: "Status", Sortable: true},
					{Key: "description", Label: "Description", Sortable: false},
				},
				Rows: rows,
			},
			{
				Id:      "system-status-bar",
				Type:    "status_bar",
				Content: &statusContent,
			},
		},
		Actions: []*pb.UIAction{
			{
				Id:      "refresh",
				Label:   "Refresh",
				Shortcut: strPtr("Ctrl+R"),
				Enabled: true,
			},
		},
	}
}

// HandleEvent processes user events. The system module supports "refresh"
// which re-sends the current view to all subscribers.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId != nil && *event.ActionId == "refresh" {
		m.notifySubscribers()
	}
	return nil
}

// Subscribe registers a callback for view updates. Returns an unsubscribe function.
func (m *Module) Subscribe(fn func(*pb.UIViewUpdate)) func() {
	m.mu.Lock()
	id := m.nextSubID
	m.nextSubID++
	m.subscribers[id] = fn
	m.mu.Unlock()

	return func() {
		m.mu.Lock()
		delete(m.subscribers, id)
		m.mu.Unlock()
	}
}

func (m *Module) notifySubscribers() {
	view := m.CurrentView()
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, fn := range m.subscribers {
		fn(view)
	}
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
	}
	return fmt.Sprintf("%dh %dm", int(d.Hours()), int(d.Minutes())%60)
}

func strPtr(s string) *string { return &s }
