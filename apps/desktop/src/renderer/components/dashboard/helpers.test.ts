import { describe, it, expect } from "vitest";
import type { UIComponent, UIView } from "@mixa-ai/types";
import {
  findComponent,
  findAlertComponents,
  parseBudgetAlerts,
  buildProviderPieComponent,
  getBudgetColor,
} from "./helpers";

// ─── Factory helpers ────────────────────────────────────────────

function makeComponent(overrides: Partial<UIComponent> = {}): UIComponent {
  return {
    id: overrides.id ?? "test-component",
    type: overrides.type ?? "text_block",
    level: overrides.level ?? null,
    content: overrides.content ?? null,
    preformatted: overrides.preformatted ?? null,
    columns: overrides.columns ?? null,
    rows: overrides.rows ?? null,
    metrics: overrides.metrics ?? null,
    chartType: overrides.chartType ?? null,
    chartData: overrides.chartData ?? null,
    items: overrides.items ?? null,
    fields: overrides.fields ?? null,
  };
}

function makeView(components: UIComponent[]): UIView {
  return {
    module: "cost",
    components,
    actions: [],
  };
}

// ─── findComponent ──────────────────────────────────────────────

describe("findComponent", () => {
  it("finds a component by id", () => {
    const target = makeComponent({ id: "cost-metrics", type: "metric_row" });
    const view = makeView([
      makeComponent({ id: "header" }),
      target,
      makeComponent({ id: "table" }),
    ]);

    expect(findComponent(view, "cost-metrics")).toBe(target);
  });

  it("returns undefined for missing id", () => {
    const view = makeView([makeComponent({ id: "header" })]);
    expect(findComponent(view, "nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty components", () => {
    const view = makeView([]);
    expect(findComponent(view, "any")).toBeUndefined();
  });
});

// ─── findAlertComponents ────────────────────────────────────────

describe("findAlertComponents", () => {
  it("finds header components with cost-alert prefix", () => {
    const alert1 = makeComponent({ id: "cost-alert-1", type: "header", content: "Alert 1" });
    const alert2 = makeComponent({ id: "cost-alert-2", type: "header", content: "Alert 2" });
    const view = makeView([
      makeComponent({ id: "cost-metrics", type: "metric_row" }),
      alert1,
      makeComponent({ id: "other-header", type: "header" }),
      alert2,
    ]);

    const result = findAlertComponents(view);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(alert1);
    expect(result[1]).toBe(alert2);
  });

  it("returns empty array when no alerts exist", () => {
    const view = makeView([
      makeComponent({ id: "cost-metrics", type: "metric_row" }),
      makeComponent({ id: "regular-header", type: "header" }),
    ]);

    expect(findAlertComponents(view)).toEqual([]);
  });

  it("excludes non-header components with cost-alert prefix", () => {
    const view = makeView([
      makeComponent({ id: "cost-alert-text", type: "text_block" }),
    ]);

    expect(findAlertComponents(view)).toEqual([]);
  });
});

// ─── parseBudgetAlerts ──────────────────────────────────────────

describe("parseBudgetAlerts", () => {
  it("parses a standard budget alert", () => {
    const alert = makeComponent({
      id: "cost-alert-1",
      type: "header",
      content: "Budget Alert (total): $450.00 of $500.00 spent (90%)",
    });

    const result = parseBudgetAlerts([alert]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      scope: "total",
      spent: "$450.00",
      limit: "$500.00",
      utilization: 0.9,
      level: "critical",
    });
  });

  it("classifies level as ok for <80%", () => {
    const alert = makeComponent({
      content: "Budget Alert (provider:aws): $300.00 of $500.00 spent (60%)",
    });

    const result = parseBudgetAlerts([alert]);
    expect(result[0]!.level).toBe("ok");
    expect(result[0]!.utilization).toBe(0.6);
  });

  it("classifies level as warning for 80-89%", () => {
    const alert = makeComponent({
      content: "Budget Alert (total): $400.00 of $500.00 spent (80%)",
    });

    const result = parseBudgetAlerts([alert]);
    expect(result[0]!.level).toBe("warning");
  });

  it("classifies level as critical for 90-99%", () => {
    const alert = makeComponent({
      content: "Budget Alert (total): $475.00 of $500.00 spent (95%)",
    });

    const result = parseBudgetAlerts([alert]);
    expect(result[0]!.level).toBe("critical");
  });

  it("classifies level as exceeded for 100%+", () => {
    const alert = makeComponent({
      content: "Budget Alert (total): $550.00 of $500.00 spent (110%)",
    });

    const result = parseBudgetAlerts([alert]);
    expect(result[0]!.level).toBe("exceeded");
  });

  it("handles missing content gracefully", () => {
    const alert = makeComponent({ content: null });

    const result = parseBudgetAlerts([alert]);
    expect(result[0]).toEqual({
      scope: "unknown",
      spent: "$0.00",
      limit: "$0.00",
      utilization: 0,
      level: "ok",
    });
  });

  it("parses multiple alerts", () => {
    const alerts = [
      makeComponent({
        content: "Budget Alert (total): $200.00 of $500.00 spent (40%)",
      }),
      makeComponent({
        content: "Budget Alert (provider:digitalocean): $180.00 of $200.00 spent (90%)",
      }),
    ];

    const result = parseBudgetAlerts(alerts);
    expect(result).toHaveLength(2);
    expect(result[0]!.scope).toBe("total");
    expect(result[0]!.level).toBe("ok");
    expect(result[1]!.scope).toBe("provider:digitalocean");
    expect(result[1]!.level).toBe("critical");
  });

  it("returns empty array for empty input", () => {
    expect(parseBudgetAlerts([])).toEqual([]);
  });
});

// ─── buildProviderPieComponent ──────────────────────────────────

describe("buildProviderPieComponent", () => {
  it("aggregates costs per provider into pie chart data", () => {
    const table = makeComponent({
      rows: [
        { values: { provider: "digitalocean", service: "Droplets", amount: "$100.00" } },
        { values: { provider: "digitalocean", service: "Spaces", amount: "$50.00" } },
        { values: { provider: "aws", service: "EC2", amount: "$200.00" } },
      ],
    });

    const result = buildProviderPieComponent(table);
    expect(result.id).toBe("cost-provider-pie");
    expect(result.type).toBe("chart");
    expect(result.chartType).toBe("pie");
    expect(result.chartData).toHaveLength(2);

    const doEntry = result.chartData!.find((d) => d.values["provider"] === "digitalocean");
    const awsEntry = result.chartData!.find((d) => d.values["provider"] === "aws");
    expect(doEntry!.values["amount"]).toBe("150.00");
    expect(awsEntry!.values["amount"]).toBe("200.00");
  });

  it("handles empty rows", () => {
    const table = makeComponent({ rows: [] });
    const result = buildProviderPieComponent(table);
    expect(result.chartData).toEqual([]);
  });

  it("handles null rows", () => {
    const table = makeComponent({ rows: null });
    const result = buildProviderPieComponent(table);
    expect(result.chartData).toEqual([]);
  });

  it("handles amounts with commas", () => {
    const table = makeComponent({
      rows: [
        { values: { provider: "aws", service: "EC2", amount: "$1,234.56" } },
      ],
    });

    const result = buildProviderPieComponent(table);
    expect(result.chartData![0]!.values["amount"]).toBe("1234.56");
  });

  it("defaults missing provider to unknown", () => {
    const table = makeComponent({
      rows: [{ values: { service: "S3", amount: "$10.00" } }],
    });

    const result = buildProviderPieComponent(table);
    expect(result.chartData![0]!.values["provider"]).toBe("unknown");
  });

  it("defaults missing amount to 0", () => {
    const table = makeComponent({
      rows: [{ values: { provider: "aws" } }],
    });

    const result = buildProviderPieComponent(table);
    expect(result.chartData![0]!.values["amount"]).toBe("0.00");
  });
});

// ─── getBudgetColor ─────────────────────────────────────────────

describe("getBudgetColor", () => {
  it("returns red for exceeded", () => {
    expect(getBudgetColor("exceeded")).toBe("#ef4444");
  });

  it("returns orange for critical", () => {
    expect(getBudgetColor("critical")).toBe("#f97316");
  });

  it("returns amber for warning", () => {
    expect(getBudgetColor("warning")).toBe("#f59e0b");
  });

  it("returns green for ok", () => {
    expect(getBudgetColor("ok")).toBe("#22c55e");
  });

  it("returns green for unknown levels", () => {
    expect(getBudgetColor("something-else")).toBe("#22c55e");
  });
});
