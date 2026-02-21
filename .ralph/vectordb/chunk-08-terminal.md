# Chunk 08 — Terminal Renderer & UI Protocol

## Fenix UI Protocol

The Go engine outputs structured JSON (via gRPC protobuf) instead of ANSI escape codes. The terminal-renderer package interprets this and renders React components.

### UIView Message
```protobuf
message UIView {
  string module = 1;           // e.g., "cost", "guard", "forge"
  repeated UIComponent components = 2;
  repeated UIAction actions = 3;
}
```

### UIComponent Types
| Type | Renders As | Interactive |
|------|-----------|-------------|
| Header | H1/H2/H3 heading | No |
| TextBlock | Paragraph or pre-formatted text | No |
| Table | Sortable, filterable data table | Yes (sort, filter, click row) |
| Card | Info card with title, content, actions | Yes (click actions) |
| MetricRow | Horizontal row of metric cards with trends | No |
| Chart | Area/bar/line/pie chart | Yes (hover tooltips, zoom) |
| List | Selectable list with keyboard navigation | Yes (select, activate) |
| Form | Input fields with validation | Yes (input, submit) |
| ActionBar | Row of buttons with keyboard shortcuts | Yes (click, shortcut) |
| StatusBar | Bottom bar with module info | No |

### UIAction
```protobuf
message UIAction {
  string id = 1;
  string label = 2;
  string shortcut = 3;
  bool enabled = 4;
}
```

### UIEvent (user → engine)
```protobuf
message UIEvent {
  string action_id = 1;
  string component_id = 2;
  string event_type = 3;       // "click", "input", "shortcut", "scroll"
  map<string, string> data = 4; // event-specific data
}
```

## Terminal Renderer Components

Each UIComponent type maps to a React component in `packages/terminal-renderer/src/components/`:

- **Table.tsx**: Uses tanstack/react-table. Columns from proto. Sort, filter, paginate.
- **Card.tsx**: Rounded card with title, body, action buttons. Click handlers.
- **Chart.tsx**: Uses recharts. Supports area, bar, line, pie. Theme-aware colors.
- **MetricRow.tsx**: Horizontal flex of metric boxes. Each has label, value, trend arrow, % change.
- **List.tsx**: Keyboard-navigable list. Arrow keys move, Enter selects.
- **Form.tsx**: Dynamic form from field definitions. Validation on submit.

## gRPC Streaming

Terminal tab opens a bidirectional gRPC stream:
- Engine → Client: UIView messages (view updates)
- Client → Engine: UIEvent messages (user interactions)
- Stream per terminal tab (each tab = one stream)

## xterm.js Fallback

For raw shell access (bash/zsh), TerminalTab can switch to xterm.js mode:
- Uses node-pty to spawn shell process
- xterm.js renders ANSI output
- Available via "Open Shell" command or Cmd+`
