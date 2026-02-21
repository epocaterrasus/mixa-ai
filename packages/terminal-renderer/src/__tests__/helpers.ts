// Test helpers — factory functions for building UIComponent fixtures

import type { UIComponent, UIView, UIAction } from "@mixa-ai/types";

let idCounter = 0;

function nextId(): string {
  return `test-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/** Create a minimal UIComponent with sensible defaults */
function base(overrides: Partial<UIComponent> & Pick<UIComponent, "type">): UIComponent {
  return {
    id: nextId(),
    level: null,
    content: null,
    preformatted: null,
    columns: null,
    rows: null,
    metrics: null,
    chartType: null,
    chartData: null,
    items: null,
    fields: null,
    ...overrides,
  };
}

export function makeHeader(content: string, level = 1): UIComponent {
  return base({ type: "header", content, level });
}

export function makeTextBlock(content: string, preformatted = false): UIComponent {
  return base({ type: "text_block", content, preformatted });
}

export function makeTable(): UIComponent {
  return base({
    type: "table",
    columns: [
      { key: "name", label: "Name", sortable: true, width: null },
      { key: "value", label: "Value", sortable: true, width: null },
      { key: "status", label: "Status", sortable: false, width: 100 },
    ],
    rows: [
      { values: { name: "API_KEY", value: "sk-***", status: "active" } },
      { values: { name: "DB_HOST", value: "localhost", status: "active" } },
      { values: { name: "REDIS_URL", value: "redis://127.0.0.1", status: "stopped" } },
    ],
  });
}

export function makeCard(title: string, body: string): UIComponent {
  return base({ type: "card", content: `${title}\n${body}` });
}

export function makeChart(): UIComponent {
  return base({
    type: "chart",
    chartType: "line",
    chartData: [
      { values: { month: "Jan", revenue: "100", cost: "80" } },
      { values: { month: "Feb", revenue: "150", cost: "90" } },
      { values: { month: "Mar", revenue: "200", cost: "110" } },
    ],
  });
}

export function makeMetricRow(): UIComponent {
  return base({
    type: "metric_row",
    metrics: [
      { label: "Revenue", value: "$12,340", trend: "up", changePercent: 12.5 },
      { label: "Costs", value: "$8,200", trend: "down", changePercent: -3.2 },
      { label: "Users", value: "1,234", trend: "flat", changePercent: 0.1 },
    ],
  });
}

export function makeList(items: string[]): UIComponent {
  return base({ type: "list", items });
}

export function makeForm(): UIComponent {
  return base({
    type: "form",
    fields: [
      { id: "name", label: "Name", fieldType: "text", placeholder: "Enter name", required: true, options: null },
      { id: "env", label: "Environment", fieldType: "select", placeholder: null, required: true, options: ["dev", "staging", "prod"] },
      { id: "debug", label: "Debug mode", fieldType: "checkbox", placeholder: null, required: false, options: null },
    ],
  });
}

export function makeActionBar(): UIComponent {
  return base({ type: "action_bar" });
}

export function makeStatusBar(content: string): UIComponent {
  return base({ type: "status_bar", content });
}

export function makeAction(id: string, label: string, shortcut: string | null = null, enabled = true): UIAction {
  return { id, label, shortcut, enabled };
}

export function makeView(components: UIComponent[], actions: UIAction[] = []): UIView {
  return { module: "test-module", components, actions };
}
