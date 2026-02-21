import { describe, it, expect } from "vitest";
import {
  itemsPerDay,
  itemsPerWeek,
  topDomains,
  itemTypeDistribution,
  tagFrequency,
  readingStats,
  buildCaptureBarChart,
  buildDomainBarChart,
  buildTypesPieChart,
  buildTagBarChart,
  formatNumber,
  formatReadingTime,
  type DashboardItem,
} from "./knowledge-dashboard-helpers";

// ─── Factory ─────────────────────────────────────────────────────

function makeItem(overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    capturedAt: "capturedAt" in overrides ? overrides.capturedAt! : "2026-02-21T10:00:00Z",
    domain: "domain" in overrides ? overrides.domain! : "example.com",
    itemType: "itemType" in overrides ? overrides.itemType! : "article",
    wordCount: "wordCount" in overrides ? overrides.wordCount! : 500,
    readingTime: "readingTime" in overrides ? overrides.readingTime! : 3,
    tags: overrides.tags ?? [],
    title: overrides.title ?? "Test Article",
    url: "url" in overrides ? overrides.url! : "https://example.com/test",
    faviconUrl: overrides.faviconUrl ?? null,
  };
}

// ─── itemsPerDay ─────────────────────────────────────────────────

describe("itemsPerDay", () => {
  it("groups items by date", () => {
    const items = [
      makeItem({ capturedAt: "2026-02-20T10:00:00Z" }),
      makeItem({ capturedAt: "2026-02-20T14:00:00Z" }),
      makeItem({ capturedAt: "2026-02-21T09:00:00Z" }),
    ];
    const result = itemsPerDay(items);
    expect(result).toEqual([
      { date: "2026-02-20", count: 2 },
      { date: "2026-02-21", count: 1 },
    ]);
  });

  it("returns sorted by date ascending", () => {
    const items = [
      makeItem({ capturedAt: "2026-02-21T10:00:00Z" }),
      makeItem({ capturedAt: "2026-02-19T10:00:00Z" }),
      makeItem({ capturedAt: "2026-02-20T10:00:00Z" }),
    ];
    const result = itemsPerDay(items);
    expect(result.map((r) => r.date)).toEqual(["2026-02-19", "2026-02-20", "2026-02-21"]);
  });

  it("returns empty for no items", () => {
    expect(itemsPerDay([])).toEqual([]);
  });
});

// ─── itemsPerWeek ────────────────────────────────────────────────

describe("itemsPerWeek", () => {
  it("groups items by ISO week", () => {
    const items = [
      makeItem({ capturedAt: "2026-02-20T10:00:00Z" }),
      makeItem({ capturedAt: "2026-02-21T10:00:00Z" }),
      makeItem({ capturedAt: "2026-03-01T10:00:00Z" }),
    ];
    const result = itemsPerWeek(items);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((r) => r.count > 0)).toBe(true);
  });

  it("returns empty for no items", () => {
    expect(itemsPerWeek([])).toEqual([]);
  });
});

// ─── topDomains ──────────────────────────────────────────────────

describe("topDomains", () => {
  it("returns domains sorted by frequency", () => {
    const items = [
      makeItem({ domain: "github.com" }),
      makeItem({ domain: "github.com" }),
      makeItem({ domain: "github.com" }),
      makeItem({ domain: "stackoverflow.com" }),
      makeItem({ domain: "stackoverflow.com" }),
      makeItem({ domain: "example.com" }),
    ];
    const result = topDomains(items);
    expect(result[0]).toEqual({ domain: "github.com", count: 3 });
    expect(result[1]).toEqual({ domain: "stackoverflow.com", count: 2 });
    expect(result[2]).toEqual({ domain: "example.com", count: 1 });
  });

  it("respects limit parameter", () => {
    const items = [
      makeItem({ domain: "a.com" }),
      makeItem({ domain: "b.com" }),
      makeItem({ domain: "c.com" }),
    ];
    const result = topDomains(items, 2);
    expect(result).toHaveLength(2);
  });

  it("skips items without domain", () => {
    const items = [
      makeItem({ domain: "a.com" }),
      makeItem({ domain: null }),
    ];
    const result = topDomains(items);
    expect(result).toHaveLength(1);
  });

  it("returns empty for no items", () => {
    expect(topDomains([])).toEqual([]);
  });
});

// ─── itemTypeDistribution ────────────────────────────────────────

describe("itemTypeDistribution", () => {
  it("counts items by type", () => {
    const items = [
      makeItem({ itemType: "article" }),
      makeItem({ itemType: "article" }),
      makeItem({ itemType: "highlight" }),
      makeItem({ itemType: "code" }),
    ];
    const result = itemTypeDistribution(items);
    expect(result[0]).toEqual({ type: "article", count: 2 });
    expect(result).toHaveLength(3);
  });

  it("sorts by count descending", () => {
    const items = [
      makeItem({ itemType: "code" }),
      makeItem({ itemType: "article" }),
      makeItem({ itemType: "article" }),
    ];
    const result = itemTypeDistribution(items);
    expect(result[0]!.type).toBe("article");
    expect(result[1]!.type).toBe("code");
  });

  it("returns empty for no items", () => {
    expect(itemTypeDistribution([])).toEqual([]);
  });
});

// ─── tagFrequency ────────────────────────────────────────────────

describe("tagFrequency", () => {
  it("counts tag usage across items", () => {
    const items = [
      makeItem({ tags: [{ name: "react" }, { name: "typescript" }] }),
      makeItem({ tags: [{ name: "react" }, { name: "go" }] }),
      makeItem({ tags: [{ name: "react" }] }),
    ];
    const result = tagFrequency(items);
    expect(result[0]).toEqual({ tag: "react", count: 3 });
    expect(result[1]).toEqual({ tag: "typescript", count: 1 });
  });

  it("respects limit", () => {
    const items = [
      makeItem({ tags: [{ name: "a" }, { name: "b" }, { name: "c" }] }),
    ];
    const result = tagFrequency(items, 2);
    expect(result).toHaveLength(2);
  });

  it("handles items with no tags", () => {
    const items = [makeItem({ tags: [] }), makeItem({ tags: [] })];
    const result = tagFrequency(items);
    expect(result).toEqual([]);
  });

  it("returns empty for no items", () => {
    expect(tagFrequency([])).toEqual([]);
  });
});

// ─── readingStats ────────────────────────────────────────────────

describe("readingStats", () => {
  it("computes aggregate reading stats", () => {
    const items = [
      makeItem({ wordCount: 1000, readingTime: 5 }),
      makeItem({ wordCount: 500, readingTime: 3 }),
      makeItem({ wordCount: 200, readingTime: 1 }),
    ];
    const result = readingStats(items);
    expect(result).toEqual({
      totalWords: 1700,
      totalReadingMinutes: 9,
      avgWordsPerItem: 567,
      itemsWithContent: 3,
    });
  });

  it("handles items with null wordCount", () => {
    const items = [
      makeItem({ wordCount: 1000, readingTime: 5 }),
      makeItem({ wordCount: null, readingTime: null }),
    ];
    const result = readingStats(items);
    expect(result.totalWords).toBe(1000);
    expect(result.itemsWithContent).toBe(1);
    expect(result.avgWordsPerItem).toBe(1000);
  });

  it("handles zero wordCount", () => {
    const items = [
      makeItem({ wordCount: 0, readingTime: 0 }),
    ];
    const result = readingStats(items);
    expect(result.totalWords).toBe(0);
    expect(result.itemsWithContent).toBe(0);
    expect(result.avgWordsPerItem).toBe(0);
  });

  it("returns zero stats for empty items", () => {
    const result = readingStats([]);
    expect(result).toEqual({
      totalWords: 0,
      totalReadingMinutes: 0,
      avgWordsPerItem: 0,
      itemsWithContent: 0,
    });
  });
});

// ─── Chart builders ──────────────────────────────────────────────

describe("buildCaptureBarChart", () => {
  it("creates a bar chart UIComponent from date counts", () => {
    const data = [
      { date: "2026-02-20", count: 3 },
      { date: "2026-02-21", count: 5 },
    ];
    const result = buildCaptureBarChart(data);
    expect(result.id).toBe("knowledge-capture-chart");
    expect(result.type).toBe("chart");
    expect(result.chartType).toBe("bar");
    expect(result.chartData).toHaveLength(2);
    expect(result.chartData![0]!.values["date"]).toBe("2026-02-20");
    expect(result.chartData![0]!.values["count"]).toBe("3");
  });

  it("handles empty data", () => {
    const result = buildCaptureBarChart([]);
    expect(result.chartData).toEqual([]);
  });
});

describe("buildDomainBarChart", () => {
  it("creates a bar chart for domain frequency", () => {
    const data = [{ domain: "github.com", count: 10 }];
    const result = buildDomainBarChart(data);
    expect(result.id).toBe("knowledge-domain-chart");
    expect(result.chartType).toBe("bar");
    expect(result.chartData![0]!.values["domain"]).toBe("github.com");
  });
});

describe("buildTypesPieChart", () => {
  it("creates a pie chart for item types", () => {
    const data = [
      { type: "article", count: 10 },
      { type: "highlight", count: 5 },
    ];
    const result = buildTypesPieChart(data);
    expect(result.id).toBe("knowledge-types-chart");
    expect(result.chartType).toBe("pie");
    expect(result.chartData).toHaveLength(2);
  });
});

describe("buildTagBarChart", () => {
  it("creates a bar chart for tag frequency", () => {
    const data = [{ tag: "react", count: 15 }];
    const result = buildTagBarChart(data);
    expect(result.id).toBe("knowledge-tags-chart");
    expect(result.chartType).toBe("bar");
    expect(result.chartData![0]!.values["tag"]).toBe("react");
  });
});

// ─── Formatting ──────────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats numbers with commas", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
});

describe("formatReadingTime", () => {
  it("formats minutes under 60 as just minutes", () => {
    expect(formatReadingTime(30)).toBe("30m");
    expect(formatReadingTime(1)).toBe("1m");
  });

  it("formats hours and minutes", () => {
    expect(formatReadingTime(90)).toBe("1h 30m");
    expect(formatReadingTime(125)).toBe("2h 5m");
  });

  it("formats even hours without minutes", () => {
    expect(formatReadingTime(60)).toBe("1h");
    expect(formatReadingTime(120)).toBe("2h");
  });
});
