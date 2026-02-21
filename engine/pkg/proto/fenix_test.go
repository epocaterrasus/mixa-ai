package proto

import (
	"testing"

	"google.golang.org/protobuf/proto"
)

// TestUIViewUpdateRoundTrip verifies that a UIViewUpdate with all component
// types can be serialized to wire format and deserialized back without data loss.
func TestUIViewUpdateRoundTrip(t *testing.T) {
	level := int32(1)
	content := "GUARD — Secrets Manager"
	preformatted := false
	chartType := "bar"
	shortcut := "Cmd+N"
	placeholder := "e.g. DATABASE_URL"
	width := int32(200)

	original := &UIViewUpdate{
		Module: "guard",
		Components: []*UIComponent{
			{
				Id:      "header-1",
				Type:    "header",
				Level:   &level,
				Content: &content,
			},
			{
				Id:      "text-1",
				Type:    "text_block",
				Content: &content,
				Preformatted: &preformatted,
			},
			{
				Id:   "table-1",
				Type: "table",
				Columns: []*TableColumn{
					{Key: "key", Label: "Key", Sortable: true, Width: &width},
					{Key: "value", Label: "Value", Sortable: false},
					{Key: "env", Label: "Environment", Sortable: true},
				},
				Rows: []*RowData{
					{Values: map[string]string{"key": "DATABASE_URL", "value": "****", "env": "production"}},
					{Values: map[string]string{"key": "API_KEY", "value": "****", "env": "staging"}},
				},
			},
			{
				Id:   "metrics-1",
				Type: "metric_row",
				Metrics: []*Metric{
					{Label: "Total Secrets", Value: "42", Trend: "up", ChangePercent: 5.2},
					{Label: "Environments", Value: "3", Trend: "flat", ChangePercent: 0},
					{Label: "Last Rotated", Value: "2h ago", Trend: "down", ChangePercent: -10},
				},
			},
			{
				Id:        "chart-1",
				Type:      "chart",
				ChartType: &chartType,
				ChartData: []*ChartDataPoint{
					{Values: map[string]string{"date": "2025-01-01", "count": "10"}},
					{Values: map[string]string{"date": "2025-01-02", "count": "15"}},
					{Values: map[string]string{"date": "2025-01-03", "count": "12"}},
				},
			},
			{
				Id:    "list-1",
				Type:  "list",
				Items: []string{"production", "staging", "development"},
			},
			{
				Id:   "form-1",
				Type: "form",
				Fields: []*FormField{
					{Id: "key", Label: "Secret Key", FieldType: "text", Placeholder: &placeholder, Required: true},
					{Id: "value", Label: "Secret Value", FieldType: "password", Required: true},
					{Id: "env", Label: "Environment", FieldType: "select", Required: true, Options: []string{"production", "staging", "development"}},
				},
			},
			{
				Id:      "card-1",
				Type:    "card",
				Content: &content,
			},
			{
				Id:   "actionbar-1",
				Type: "action_bar",
			},
			{
				Id:      "statusbar-1",
				Type:    "status_bar",
				Content: &content,
			},
		},
		Actions: []*UIAction{
			{Id: "add-secret", Label: "Add Secret", Shortcut: &shortcut, Enabled: true},
			{Id: "refresh", Label: "Refresh", Enabled: true},
			{Id: "delete", Label: "Delete Selected", Enabled: false},
		},
	}

	// Marshal to wire format.
	data, err := proto.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	if len(data) == 0 {
		t.Fatal("expected non-empty serialized data")
	}

	// Unmarshal back.
	decoded := &UIViewUpdate{}
	if err := proto.Unmarshal(data, decoded); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}

	// Verify top-level fields.
	if decoded.Module != "guard" {
		t.Fatalf("module: want %q, got %q", "guard", decoded.Module)
	}
	if len(decoded.Components) != 10 {
		t.Fatalf("components: want 10, got %d", len(decoded.Components))
	}
	if len(decoded.Actions) != 3 {
		t.Fatalf("actions: want 3, got %d", len(decoded.Actions))
	}

	// Verify header component.
	header := decoded.Components[0]
	if header.GetId() != "header-1" || header.GetType() != "header" {
		t.Fatalf("header: id=%q type=%q", header.GetId(), header.GetType())
	}
	if header.GetLevel() != 1 {
		t.Fatalf("header level: want 1, got %d", header.GetLevel())
	}
	if header.GetContent() != "GUARD — Secrets Manager" {
		t.Fatalf("header content: got %q", header.GetContent())
	}

	// Verify table component.
	table := decoded.Components[2]
	if len(table.Columns) != 3 {
		t.Fatalf("table columns: want 3, got %d", len(table.Columns))
	}
	if table.Columns[0].GetKey() != "key" || !table.Columns[0].GetSortable() {
		t.Fatalf("table column 0: key=%q sortable=%v", table.Columns[0].GetKey(), table.Columns[0].GetSortable())
	}
	if table.Columns[0].GetWidth() != 200 {
		t.Fatalf("table column 0 width: want 200, got %d", table.Columns[0].GetWidth())
	}
	if len(table.Rows) != 2 {
		t.Fatalf("table rows: want 2, got %d", len(table.Rows))
	}
	if table.Rows[0].Values["key"] != "DATABASE_URL" {
		t.Fatalf("table row 0 key: got %q", table.Rows[0].Values["key"])
	}

	// Verify metric_row component.
	metricRow := decoded.Components[3]
	if len(metricRow.Metrics) != 3 {
		t.Fatalf("metrics: want 3, got %d", len(metricRow.Metrics))
	}
	m := metricRow.Metrics[0]
	if m.Label != "Total Secrets" || m.Value != "42" || m.Trend != "up" || m.ChangePercent != 5.2 {
		t.Fatalf("metric 0: label=%q value=%q trend=%q change=%.1f", m.Label, m.Value, m.Trend, m.ChangePercent)
	}

	// Verify chart component.
	chart := decoded.Components[4]
	if chart.GetChartType() != "bar" {
		t.Fatalf("chart type: want %q, got %q", "bar", chart.GetChartType())
	}
	if len(chart.ChartData) != 3 {
		t.Fatalf("chart data: want 3, got %d", len(chart.ChartData))
	}
	if chart.ChartData[1].Values["count"] != "15" {
		t.Fatalf("chart data[1] count: got %q", chart.ChartData[1].Values["count"])
	}

	// Verify list component.
	list := decoded.Components[5]
	if len(list.Items) != 3 {
		t.Fatalf("list items: want 3, got %d", len(list.Items))
	}
	if list.Items[0] != "production" {
		t.Fatalf("list item 0: got %q", list.Items[0])
	}

	// Verify form component.
	form := decoded.Components[6]
	if len(form.Fields) != 3 {
		t.Fatalf("form fields: want 3, got %d", len(form.Fields))
	}
	f := form.Fields[0]
	if f.Id != "key" || f.FieldType != "text" || !f.Required {
		t.Fatalf("form field 0: id=%q type=%q required=%v", f.Id, f.FieldType, f.Required)
	}
	if f.GetPlaceholder() != "e.g. DATABASE_URL" {
		t.Fatalf("form field 0 placeholder: got %q", f.GetPlaceholder())
	}
	if len(form.Fields[2].Options) != 3 {
		t.Fatalf("form field 2 options: want 3, got %d", len(form.Fields[2].Options))
	}

	// Verify actions.
	a0 := decoded.Actions[0]
	if a0.Id != "add-secret" || a0.Label != "Add Secret" || !a0.Enabled {
		t.Fatalf("action 0: id=%q label=%q enabled=%v", a0.Id, a0.Label, a0.Enabled)
	}
	if a0.GetShortcut() != "Cmd+N" {
		t.Fatalf("action 0 shortcut: got %q", a0.GetShortcut())
	}
	if decoded.Actions[2].Enabled {
		t.Fatal("action 2 should be disabled")
	}
}

// TestUIEventRequestRoundTrip verifies UIEventRequest serialization.
func TestUIEventRequestRoundTrip(t *testing.T) {
	actionID := "delete-secret"
	componentID := "table-1"

	original := &UIEventRequest{
		Module:      "guard",
		ActionId:    &actionID,
		ComponentId: &componentID,
		EventType:   "click",
		Data:        map[string]string{"row": "0", "key": "DATABASE_URL"},
	}

	data, err := proto.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	decoded := &UIEventRequest{}
	if err := proto.Unmarshal(data, decoded); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}

	if decoded.Module != "guard" {
		t.Fatalf("module: got %q", decoded.Module)
	}
	if decoded.GetActionId() != "delete-secret" {
		t.Fatalf("action_id: got %q", decoded.GetActionId())
	}
	if decoded.GetComponentId() != "table-1" {
		t.Fatalf("component_id: got %q", decoded.GetComponentId())
	}
	if decoded.EventType != "click" {
		t.Fatalf("event_type: got %q", decoded.EventType)
	}
	if decoded.Data["key"] != "DATABASE_URL" {
		t.Fatalf("data[key]: got %q", decoded.Data["key"])
	}
}

// TestEmptyUIViewUpdate verifies that an empty view update round-trips correctly.
func TestEmptyUIViewUpdate(t *testing.T) {
	original := &UIViewUpdate{
		Module:     "system",
		Components: []*UIComponent{},
		Actions:    []*UIAction{},
	}

	data, err := proto.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	decoded := &UIViewUpdate{}
	if err := proto.Unmarshal(data, decoded); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}

	if decoded.Module != "system" {
		t.Fatalf("module: got %q", decoded.Module)
	}
	if len(decoded.Components) != 0 {
		t.Fatalf("components: want 0, got %d", len(decoded.Components))
	}
	if len(decoded.Actions) != 0 {
		t.Fatalf("actions: want 0, got %d", len(decoded.Actions))
	}
}

// TestComponentTypesCoverage ensures every documented component type can be
// created and serialized without error.
func TestComponentTypesCoverage(t *testing.T) {
	types := []string{
		"header", "text_block", "table", "card", "metric_row",
		"chart", "list", "form", "action_bar", "status_bar",
	}

	for _, ct := range types {
		t.Run(ct, func(t *testing.T) {
			comp := &UIComponent{
				Id:   ct + "-test",
				Type: ct,
			}

			data, err := proto.Marshal(comp)
			if err != nil {
				t.Fatalf("Marshal(%s): %v", ct, err)
			}

			decoded := &UIComponent{}
			if err := proto.Unmarshal(data, decoded); err != nil {
				t.Fatalf("Unmarshal(%s): %v", ct, err)
			}

			if decoded.Type != ct {
				t.Fatalf("type: want %q, got %q", ct, decoded.Type)
			}
		})
	}
}
