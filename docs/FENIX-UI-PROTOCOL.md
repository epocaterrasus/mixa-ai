# Fenix UI Protocol

The Fenix UI Protocol is a declarative component protocol for rendering Go engine module output as rich web UI in the Electron renderer. Instead of traditional terminal text output, engine modules emit structured `UIViewUpdate` messages containing typed components that map to React components.

## Overview

```
Go Engine Module                    Electron Renderer
┌────────────────┐                  ┌────────────────┐
│                │   UIViewUpdate   │                │
│  GUARD Module  │ ──── gRPC ────► │  UIViewRenderer │
│                │                  │       │        │
│  CurrentView() │                  │       ▼        │
│       │        │                  │  ┌──────────┐  │
│       ▼        │                  │  │ Header   │  │
│  UIViewUpdate  │                  │  │ Table    │  │
│  {             │   UIEventReq    │  │ Chart    │  │
│    components  │ ◄── gRPC ────── │  │ MetricRow│  │
│    actions     │                  │  │ Form     │  │
│  }             │                  │  │ ...      │  │
│                │                  │  └──────────┘  │
└────────────────┘                  └────────────────┘
```

## Protocol Definition

Defined in `engine/api/proto/fenix.proto`:

### UIViewUpdate

The top-level message sent from engine to renderer:

```protobuf
message UIViewUpdate {
  string module = 1;                    // Module name (e.g., "guard", "forge")
  repeated UIComponent components = 2;  // Ordered list of UI components
  repeated UIAction actions = 3;        // Available user actions
}
```

### UIComponent

Each component has a `type` field and type-specific optional fields:

```protobuf
message UIComponent {
  string type = 1;        // Component type identifier
  string id = 2;          // Unique component ID

  // Type-specific fields (only one set per component):
  HeaderData header = 10;
  TextBlockData text_block = 11;
  TableData table = 12;
  CardData card = 13;
  MetricRowData metric_row = 14;
  ChartData chart = 15;
  ListData list = 16;
  FormData form = 17;
  ActionBarData action_bar = 18;
  StatusBarData status_bar = 19;
}
```

### UIAction

Available actions the user can trigger:

```protobuf
message UIAction {
  string id = 1;          // Action identifier (e.g., "add", "delete", "refresh")
  string label = 2;       // Display label
  string shortcut = 3;    // Keyboard shortcut hint (e.g., "Ctrl+N")
  bool enabled = 4;       // Whether the action is currently available
}
```

### UIEventRequest

Sent from renderer to engine when the user interacts:

```protobuf
message UIEventRequest {
  string module = 1;       // Target module
  string event_type = 2;   // "click", "input", "shortcut", "scroll"
  string action_id = 3;    // Which action was triggered
  string component_id = 4; // Which component was interacted with
  map<string, string> data = 5;  // Event-specific data
}
```

## Component Types

### header

Page or section heading.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Heading text |
| `level` | int32 | Heading level (1-6, maps to h1-h6) |
| `subtitle` | string | Optional subtitle text |

**React**: Renders as `<h1>`-`<h6>` with optional subtitle.

### text_block

Paragraph or preformatted text.

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Text content |
| `format` | string | `"plain"` or `"pre"` (preformatted/monospace) |

**React**: Renders as `<p>` or `<pre>` depending on format.

### table

Sortable, filterable data table.

| Field | Type | Description |
|-------|------|-------------|
| `columns` | TableColumn[] | Column definitions (key, label, width) |
| `rows` | RowData[] | Row data (map of column key → cell value) |

**React**: Sortable columns (click header), text filter, monospace cells, row click fires UIEvent with `rowIndex`.

### metric_row

Horizontal row of metric cards with trend indicators.

| Field | Type | Description |
|-------|------|-------------|
| `metrics` | Metric[] | Array of metric values |

Each `Metric`:
| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Metric name |
| `value` | string | Display value |
| `trend` | string | `"up"`, `"down"`, or `"flat"` |
| `trend_value` | string | Trend description (e.g., "+5%") |

**React**: Renders as a row of cards with colored trend arrows.

### chart

Data visualization chart.

| Field | Type | Description |
|-------|------|-------------|
| `chart_type` | string | `"area"`, `"bar"`, `"line"`, `"pie"` |
| `title` | string | Chart title |
| `data` | ChartDataPoint[] | Data points |

Each `ChartDataPoint`:
| Field | Type | Description |
|-------|------|-------------|
| `label` | string | X-axis label |
| `values` | map<string, double> | Named values (first key = X axis, rest = series) |

**React**: Rendered via recharts. Area charts include gradient fill. Pie charts show labels. 10-color palette.

### list

Selectable item list with keyboard navigation.

| Field | Type | Description |
|-------|------|-------------|
| `items` | ListItem[] | List entries |

Each `ListItem`:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Item identifier |
| `label` | string | Display text |
| `description` | string | Secondary text |
| `icon` | string | Icon identifier |

**React**: Clickable list items. Click fires UIEvent with item `id`.

### form

Input form with typed fields.

| Field | Type | Description |
|-------|------|-------------|
| `fields` | FormField[] | Form field definitions |
| `submit_action` | string | Action ID to trigger on submit |

Each `FormField`:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Field name (key) |
| `label` | string | Display label |
| `type` | string | `"text"`, `"number"`, `"password"`, `"select"` |
| `value` | string | Current/default value |
| `placeholder` | string | Placeholder text |
| `options` | string[] | Options for select fields |
| `required` | bool | Whether the field is required |

**React**: Renders labeled inputs. Submit fires UIEvent with form data in `data` map.

### action_bar

Horizontal bar of action buttons.

| Field | Type | Description |
|-------|------|-------------|
| `actions` | UIAction[] | Buttons to render |

**React**: Row of styled buttons. Disabled buttons are visually muted. Click fires UIEvent with `action_id`.

### status_bar

Bottom information bar.

| Field | Type | Description |
|-------|------|-------------|
| `items` | StatusItem[] | Status segments |

Each `StatusItem`:
| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Status text |
| `value` | string | Status value |

**React**: Horizontal bar at bottom with label-value pairs.

### card

Information card with optional actions.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Card title |
| `content` | string | Card body text |
| `actions` | UIAction[] | Card-specific actions |

**React**: Bordered card with title, content, and action buttons.

## Event Flow

### User interaction cycle

1. Engine module emits `UIViewUpdate` via gRPC server stream
2. Renderer's `UIViewRenderer` maps components to React components
3. User interacts (clicks button, submits form, sorts table)
4. Renderer sends `UIEventRequest` via gRPC `SendEvent`
5. Engine module's `HandleEvent()` processes the event and updates internal state
6. Engine emits a new `UIViewUpdate` via the subscription
7. Renderer re-renders with updated components

### Event types

| Type | When | Typical data |
|------|------|-------------|
| `click` | Button or action clicked | `action_id` |
| `input` | Form submitted | Field name-value pairs |
| `shortcut` | Keyboard shortcut pressed | `action_id` |
| `scroll` | Scroll position changed | Scroll offset |

## Example: GUARD Module View

```json
{
  "module": "guard",
  "components": [
    {
      "type": "header",
      "header": { "title": "GUARD — Secrets Manager", "level": 1 }
    },
    {
      "type": "text_block",
      "text_block": { "content": "Environment: development", "format": "plain" }
    },
    {
      "type": "metric_row",
      "metric_row": {
        "metrics": [
          { "label": "Secrets", "value": "12", "trend": "up", "trend_value": "+2" },
          { "label": "Environment", "value": "dev", "trend": "flat" },
          { "label": "Environments", "value": "3", "trend": "flat" }
        ]
      }
    },
    {
      "type": "table",
      "table": {
        "columns": [
          { "key": "key", "label": "Key" },
          { "key": "value", "label": "Value" },
          { "key": "source", "label": "Source" }
        ],
        "rows": [
          { "values": { "key": "DATABASE_URL", "value": "••••••••", "source": "manual" } },
          { "key": "API_KEY", "value": "••••••••", "source": "env-file" }
        ]
      }
    }
  ],
  "actions": [
    { "id": "add", "label": "Add Secret", "shortcut": "Ctrl+N", "enabled": true },
    { "id": "refresh", "label": "Refresh", "shortcut": "Ctrl+R", "enabled": true },
    { "id": "switch-env", "label": "Switch Env", "enabled": true }
  ]
}
```

## TypeScript Types

The TypeScript side of the protocol is defined in `packages/types/src/protocol.ts`:

```typescript
interface UIView {
  module: string;
  components: UIComponent[];
  actions: UIAction[];
}

interface UIEvent {
  module: string;
  actionId: string;
  componentId?: string;
  eventType: 'click' | 'input' | 'shortcut' | 'scroll';
  data?: Record<string, string>;
}
```

## Adding a New Module

1. Create `engine/internal/modules/mymodule/mymodule.go`
2. Implement `module.Module` interface (`Name`, `DisplayName`, `Description`, `Start`, `Stop`)
3. Implement `module.UIProvider` interface (`CurrentView`, `HandleEvent`, `Subscribe`)
4. Register in `cmd/fenix/main.go`: `registry.Register(mymodule.New(store))`
5. The module's UI will automatically be available in the Terminal tab via the module selector
