import { describe, it, expect } from "vitest";
import type { UIComponent, UIView } from "@mixa-ai/types";
import {
  findComponent,
  parseUptimeRows,
  parseSSLRows,
  parseIncidents,
  getStatusColor,
  getSSLAlertColor,
  getStatusLabel,
  calculateHealthScore,
} from "./health-helpers";

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
    module: "pulse",
    components,
    actions: [],
  };
}

// ─── findComponent ──────────────────────────────────────────────

describe("findComponent", () => {
  it("finds a component by id", () => {
    const target = makeComponent({ id: "pulse-metrics", type: "metric_row" });
    const view = makeView([
      makeComponent({ id: "header" }),
      target,
      makeComponent({ id: "table" }),
    ]);

    expect(findComponent(view, "pulse-metrics")).toBe(target);
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

// ─── parseUptimeRows ────────────────────────────────────────────

describe("parseUptimeRows", () => {
  it("parses uptime table rows into structured data", () => {
    const table = makeComponent({
      rows: [
        {
          values: {
            id: "ep-1",
            name: "API",
            url: "https://api.example.com",
            status: "up",
            uptime_24h: "99.50%",
            uptime_7d: "98.20%",
            uptime_30d: "99.90%",
            p50: "45ms",
            p95: "120ms",
            p99: "250ms",
          },
        },
      ],
    });

    const result = parseUptimeRows(table);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "ep-1",
      name: "API",
      url: "https://api.example.com",
      status: "up",
      uptime24h: "99.50%",
      uptime7d: "98.20%",
      uptime30d: "99.90%",
      p50: "45ms",
      p95: "120ms",
      p99: "250ms",
    });
  });

  it("handles down status", () => {
    const table = makeComponent({
      rows: [
        {
          values: {
            id: "ep-2",
            name: "Web",
            url: "https://example.com",
            status: "down",
            uptime_24h: "50.00%",
            uptime_7d: "90.00%",
            uptime_30d: "95.00%",
            p50: "100ms",
            p95: "500ms",
            p99: "1000ms",
          },
        },
      ],
    });

    const result = parseUptimeRows(table);
    expect(result[0]!.status).toBe("down");
  });

  it("handles unknown status", () => {
    const table = makeComponent({
      rows: [
        { values: { id: "ep-3", name: "New", url: "https://new.com", status: "unknown" } },
      ],
    });

    const result = parseUptimeRows(table);
    expect(result[0]!.status).toBe("unknown");
  });

  it("handles missing status value", () => {
    const table = makeComponent({
      rows: [
        { values: { id: "ep-4", name: "Test" } },
      ],
    });

    const result = parseUptimeRows(table);
    expect(result[0]!.status).toBe("unknown");
  });

  it("defaults missing fields", () => {
    const table = makeComponent({
      rows: [{ values: {} }],
    });

    const result = parseUptimeRows(table);
    expect(result[0]).toEqual({
      id: "",
      name: "Unknown",
      url: "",
      status: "unknown",
      uptime24h: "\u2014",
      uptime7d: "\u2014",
      uptime30d: "\u2014",
      p50: "\u2014",
      p95: "\u2014",
      p99: "\u2014",
    });
  });

  it("returns empty array for undefined component", () => {
    expect(parseUptimeRows(undefined)).toEqual([]);
  });

  it("returns empty array for null rows", () => {
    const table = makeComponent({ rows: null });
    expect(parseUptimeRows(table)).toEqual([]);
  });

  it("returns empty array for empty rows", () => {
    const table = makeComponent({ rows: [] });
    expect(parseUptimeRows(table)).toEqual([]);
  });

  it("parses multiple rows", () => {
    const table = makeComponent({
      rows: [
        { values: { id: "ep-1", name: "API", url: "https://api.example.com", status: "up" } },
        { values: { id: "ep-2", name: "Web", url: "https://example.com", status: "down" } },
      ],
    });

    const result = parseUptimeRows(table);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("API");
    expect(result[1]!.name).toBe("Web");
  });
});

// ─── parseSSLRows ───────────────────────────────────────────────

describe("parseSSLRows", () => {
  it("parses SSL table rows into structured data", () => {
    const table = makeComponent({
      rows: [
        {
          values: {
            name: "API",
            issuer: "Let's Encrypt",
            expires: "2025-06-15T00:00:00Z",
            days_left: "120",
            alert: "ok",
          },
        },
      ],
    });

    const result = parseSSLRows(table);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "API",
      issuer: "Let's Encrypt",
      expires: "2025-06-15T00:00:00Z",
      daysLeft: 120,
      alertLevel: "ok",
    });
  });

  it("parses critical alert level", () => {
    const table = makeComponent({
      rows: [
        { values: { name: "API", issuer: "LE", expires: "", days_left: "5", alert: "critical" } },
      ],
    });

    const result = parseSSLRows(table);
    expect(result[0]!.alertLevel).toBe("critical");
  });

  it("parses warning alert level", () => {
    const table = makeComponent({
      rows: [
        { values: { name: "API", issuer: "LE", expires: "", days_left: "12", alert: "warning" } },
      ],
    });

    const result = parseSSLRows(table);
    expect(result[0]!.alertLevel).toBe("warning");
  });

  it("parses caution alert level", () => {
    const table = makeComponent({
      rows: [
        { values: { name: "API", issuer: "LE", expires: "", days_left: "25", alert: "caution" } },
      ],
    });

    const result = parseSSLRows(table);
    expect(result[0]!.alertLevel).toBe("caution");
  });

  it("defaults unknown alert level to ok", () => {
    const table = makeComponent({
      rows: [
        { values: { name: "API", issuer: "LE", expires: "", days_left: "200", alert: "bogus" } },
      ],
    });

    const result = parseSSLRows(table);
    expect(result[0]!.alertLevel).toBe("ok");
  });

  it("returns empty array for undefined component", () => {
    expect(parseSSLRows(undefined)).toEqual([]);
  });

  it("returns empty array for null rows", () => {
    const table = makeComponent({ rows: null });
    expect(parseSSLRows(table)).toEqual([]);
  });

  it("defaults missing fields", () => {
    const table = makeComponent({
      rows: [{ values: {} }],
    });

    const result = parseSSLRows(table);
    expect(result[0]).toEqual({
      name: "Unknown",
      issuer: "Unknown",
      expires: "",
      daysLeft: 0,
      alertLevel: "ok",
    });
  });
});

// ─── parseIncidents ─────────────────────────────────────────────

describe("parseIncidents", () => {
  it("parses incident list items", () => {
    const list = makeComponent({
      items: [
        "\u{1F534} 2025-01-15T12:00:00Z API \u2014 Connection timeout",
        "\u{1F7E2} 2025-01-15T12:05:00Z API \u2014 Recovered",
      ],
    });

    const result = parseIncidents(list);
    expect(result).toHaveLength(2);
    expect(result[0]!.icon).toBe("error");
    expect(result[1]!.icon).toBe("success");
  });

  it("returns empty array for undefined component", () => {
    expect(parseIncidents(undefined)).toEqual([]);
  });

  it("returns empty array for null items", () => {
    const list = makeComponent({ items: null });
    expect(parseIncidents(list)).toEqual([]);
  });

  it("returns empty array for empty items", () => {
    const list = makeComponent({ items: [] });
    expect(parseIncidents(list)).toEqual([]);
  });

  it("preserves full text of incident", () => {
    const text = "\u{1F534} 2025-01-15T12:00:00Z My API \u2014 Connection refused";
    const list = makeComponent({ items: [text] });

    const result = parseIncidents(list);
    expect(result[0]!.text).toBe(text);
  });
});

// ─── getStatusColor ─────────────────────────────────────────────

describe("getStatusColor", () => {
  it("returns green for up", () => {
    expect(getStatusColor("up")).toBe("#22c55e");
  });

  it("returns red for down", () => {
    expect(getStatusColor("down")).toBe("#ef4444");
  });

  it("returns gray for unknown", () => {
    expect(getStatusColor("unknown")).toBe("#6b7280");
  });
});

// ─── getSSLAlertColor ───────────────────────────────────────────

describe("getSSLAlertColor", () => {
  it("returns red for critical", () => {
    expect(getSSLAlertColor("critical")).toBe("#ef4444");
  });

  it("returns orange for warning", () => {
    expect(getSSLAlertColor("warning")).toBe("#f97316");
  });

  it("returns amber for caution", () => {
    expect(getSSLAlertColor("caution")).toBe("#f59e0b");
  });

  it("returns green for ok", () => {
    expect(getSSLAlertColor("ok")).toBe("#22c55e");
  });
});

// ─── getStatusLabel ─────────────────────────────────────────────

describe("getStatusLabel", () => {
  it("returns Healthy for up", () => {
    expect(getStatusLabel("up")).toBe("Healthy");
  });

  it("returns Down for down", () => {
    expect(getStatusLabel("down")).toBe("Down");
  });

  it("returns Unknown for unknown", () => {
    expect(getStatusLabel("unknown")).toBe("Unknown");
  });
});

// ─── calculateHealthScore ───────────────────────────────────────

describe("calculateHealthScore", () => {
  it("returns 100 for empty rows", () => {
    expect(calculateHealthScore([])).toBe(100);
  });

  it("returns 100 when all endpoints are up", () => {
    const rows = [
      { id: "1", name: "A", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "2", name: "B", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
    ];
    expect(calculateHealthScore(rows)).toBe(100);
  });

  it("returns 0 when all endpoints are down", () => {
    const rows = [
      { id: "1", name: "A", url: "", status: "down" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "2", name: "B", url: "", status: "down" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
    ];
    expect(calculateHealthScore(rows)).toBe(0);
  });

  it("returns 50 when half are up", () => {
    const rows = [
      { id: "1", name: "A", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "2", name: "B", url: "", status: "down" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
    ];
    expect(calculateHealthScore(rows)).toBe(50);
  });

  it("treats unknown as not up", () => {
    const rows = [
      { id: "1", name: "A", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "2", name: "B", url: "", status: "unknown" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
    ];
    expect(calculateHealthScore(rows)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    const rows = [
      { id: "1", name: "A", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "2", name: "B", url: "", status: "up" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
      { id: "3", name: "C", url: "", status: "down" as const, uptime24h: "", uptime7d: "", uptime30d: "", p50: "", p95: "", p99: "" },
    ];
    expect(calculateHealthScore(rows)).toBe(67);
  });
});
