// Pure helper functions for the Cost Dashboard
// Extracted for testability.

import type { UIComponent, UIView } from "@mixa-ai/types";

/** Find a component in a UIView by its id */
export function findComponent(
  view: UIView,
  id: string,
): UIComponent | undefined {
  return view.components.find((c) => c.id === id);
}

/** Find all cost-alert header components in a UIView */
export function findAlertComponents(view: UIView): UIComponent[] {
  return view.components.filter(
    (c) => c.type === "header" && c.id.startsWith("cost-alert"),
  );
}

export interface BudgetAlertData {
  scope: string;
  spent: string;
  limit: string;
  utilization: number;
  level: string;
}

/** Parse budget alert header components into structured data */
export function parseBudgetAlerts(
  alertComponents: UIComponent[],
): BudgetAlertData[] {
  return alertComponents.map((c) => {
    const text = c.content ?? "";
    // Format: "Budget Alert (scope): $X.XX of $Y.YY spent (Z%)"
    const scopeMatch = text.match(/\(([^)]+)\)/);
    const amountsMatch = text.match(/(\$[\d,.]+)\s+of\s+(\$[\d,.]+)/);
    const pctMatch = text.match(/(\d+)%/);

    const scope = scopeMatch?.[1] ?? "unknown";
    const spent = amountsMatch?.[1] ?? "$0.00";
    const limit = amountsMatch?.[2] ?? "$0.00";
    const pct = pctMatch?.[1] ? parseInt(pctMatch[1], 10) / 100 : 0;

    let level = "ok";
    if (pct >= 1.0) level = "exceeded";
    else if (pct >= 0.9) level = "critical";
    else if (pct >= 0.8) level = "warning";

    return { scope, spent, limit, utilization: pct, level };
  });
}

/** Build a pie-chart UIComponent from the breakdown table data */
export function buildProviderPieComponent(
  tableComponent: UIComponent,
): UIComponent {
  const rows = tableComponent.rows ?? [];
  const providerTotals = new Map<string, number>();

  for (const row of rows) {
    const provider = row.values["provider"] ?? "unknown";
    const amountStr = (row.values["amount"] ?? "$0.00").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr) || 0;
    providerTotals.set(
      provider,
      (providerTotals.get(provider) ?? 0) + amount,
    );
  }

  const chartData = Array.from(providerTotals.entries()).map(
    ([provider, amount]) => ({
      values: { provider, amount: amount.toFixed(2) },
    }),
  );

  return {
    id: "cost-provider-pie",
    type: "chart",
    level: null,
    content: null,
    preformatted: null,
    columns: null,
    rows: null,
    metrics: null,
    chartType: "pie",
    chartData,
    items: null,
    fields: null,
  };
}

/** Return CSS color for a budget alert level */
export function getBudgetColor(level: string): string {
  switch (level) {
    case "exceeded":
      return "#ef4444";
    case "critical":
      return "#f97316";
    case "warning":
      return "#f59e0b";
    default:
      return "#22c55e";
  }
}
