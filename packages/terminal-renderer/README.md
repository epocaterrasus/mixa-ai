# @mixa-ai/terminal-renderer

React components that render the Fenix UI protocol — transforming declarative `UIView` messages from the Go engine into interactive web UI (tables, charts, forms, metric cards, etc.).

## Architecture

```
src/
├── UIViewRenderer.tsx         # Top-level renderer dispatching to components
├── styles.ts                  # Re-exports theme token helpers
├── components/
│   ├── Header.tsx             # h1-h6 headings
│   ├── TextBlock.tsx          # Paragraph and preformatted text
│   ├── Table.tsx              # Sortable, filterable data table
│   ├── Chart.tsx              # Area/bar/line/pie charts (recharts)
│   ├── MetricRow.tsx          # Metric cards with trend indicators
│   ├── List.tsx               # Selectable item list with keyboard nav
│   ├── Form.tsx               # Input form with typed fields
│   ├── ActionBar.tsx          # Horizontal action button bar
│   ├── StatusBar.tsx          # Bottom status/info bar
│   ├── Card.tsx               # Info card with actions
│   └── index.ts
└── __tests__/
    ├── UIViewRenderer.test.tsx
    └── components.test.tsx
```

## Usage

```tsx
import { UIViewRenderer } from '@mixa-ai/terminal-renderer';
import type { UIView, UIEvent } from '@mixa-ai/types';

function TerminalTab({ view }: { view: UIView }) {
  const handleEvent = (event: UIEvent) => {
    // Send event back to Go engine via gRPC
    sendToEngine(event);
  };

  return <UIViewRenderer view={view} onEvent={handleEvent} />;
}
```

## Component Catalog

### Table

Sortable, filterable data table with monospace data cells.

- Click column headers to sort (ascending, descending, none)
- Text filter across all cell values
- Row click fires a `UIEvent` with `rowIndex`
- Keyboard accessible: Enter/Space to sort columns

### Chart

Powered by recharts. Supports four chart types:

- **Area** — AreaChart with gradient fill
- **Bar** — BarChart
- **Line** — LineChart
- **Pie** — PieChart with labels

Uses a 10-color palette starting with `#6366f1`. Data parsed from `ChartDataPoint.values` map.

### MetricRow

Horizontal row of metric cards showing key values with optional trend indicators (up/down/flat).

### List

Selectable item list with keyboard navigation. Clicking an item fires a `UIEvent`.

### Form

Renders input forms from a `FormField[]` definition. Supports text, number, password, and select field types.

### ActionBar

Horizontal bar of action buttons. Each button has a label, optional shortcut hint, and enabled/disabled state.

### StatusBar

Bottom status bar showing module information.

### Card & Header & TextBlock

Standard content components for headings, paragraphs, and info cards.

## Theming

All components respect the active theme via CSS custom properties (`--mixa-*` tokens from `@mixa-ai/ui`). Components render correctly in both dark and light themes.

## Testing

```bash
pnpm test         # Run component tests
pnpm typecheck    # Type check
pnpm build        # Build
```

## Dependencies

- `react` 19 (peer dependency)
- `recharts` — chart rendering
- `@mixa-ai/types` — Fenix UI protocol types
- `@mixa-ai/ui` — theme tokens
