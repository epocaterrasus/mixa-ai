// Pure helper functions for the Knowledge Stats Dashboard.
// Compute statistics from an array of knowledge items.

import type { UIComponent, ChartDataPoint } from "@mixa-ai/types";

/** Minimal item shape needed for dashboard stats */
export interface DashboardItem {
  capturedAt: string;
  domain: string | null;
  itemType: string;
  wordCount: number | null;
  readingTime: number | null;
  tags: ReadonlyArray<{ name: string }>;
  title: string;
  url: string | null;
  faviconUrl: string | null;
}

// ─── Items per day/week ──────────────────────────────────────────

export interface DateCount {
  date: string;
  count: number;
}

/** Group items by capture date (YYYY-MM-DD) and return daily counts, sorted ascending */
export function itemsPerDay(items: readonly DashboardItem[]): DateCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const day = item.capturedAt.slice(0, 10); // YYYY-MM-DD
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Group items by ISO week (YYYY-Www) and return weekly counts, sorted ascending */
export function itemsPerWeek(items: readonly DashboardItem[]): DateCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const d = new Date(item.capturedAt);
    const week = isoWeek(d);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function isoWeek(d: Date): string {
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// ─── Domain frequency ────────────────────────────────────────────

export interface DomainCount {
  domain: string;
  count: number;
}

/** Return top N most-saved domains, sorted by count descending */
export function topDomains(
  items: readonly DashboardItem[],
  limit: number = 10,
): DomainCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.domain) {
      counts.set(item.domain, (counts.get(item.domain) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Item type distribution ──────────────────────────────────────

export interface TypeCount {
  type: string;
  count: number;
}

/** Count items by itemType, sorted by count descending */
export function itemTypeDistribution(items: readonly DashboardItem[]): TypeCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.itemType, (counts.get(item.itemType) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Tag frequency ───────────────────────────────────────────────

export interface TagCount {
  tag: string;
  count: number;
}

/** Count tag usage across all items, sorted by count descending */
export function tagFrequency(
  items: readonly DashboardItem[],
  limit: number = 15,
): TagCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const t of item.tags) {
      counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Reading stats ───────────────────────────────────────────────

export interface ReadingStats {
  totalWords: number;
  totalReadingMinutes: number;
  avgWordsPerItem: number;
  itemsWithContent: number;
}

/** Compute aggregate reading statistics */
export function readingStats(items: readonly DashboardItem[]): ReadingStats {
  let totalWords = 0;
  let totalReadingMinutes = 0;
  let itemsWithContent = 0;

  for (const item of items) {
    if (item.wordCount !== null && item.wordCount > 0) {
      totalWords += item.wordCount;
      itemsWithContent += 1;
    }
    if (item.readingTime !== null && item.readingTime > 0) {
      totalReadingMinutes += item.readingTime;
    }
  }

  return {
    totalWords,
    totalReadingMinutes,
    avgWordsPerItem: itemsWithContent > 0 ? Math.round(totalWords / itemsWithContent) : 0,
    itemsWithContent,
  };
}

// ─── Chart builders ──────────────────────────────────────────────

/** Build a UIComponent bar chart from date/count data */
export function buildCaptureBarChart(data: readonly DateCount[]): UIComponent {
  const chartData: ChartDataPoint[] = data.map((d) => ({
    values: { date: d.date, count: String(d.count) },
  }));

  return {
    id: "knowledge-capture-chart",
    type: "chart",
    level: null,
    content: null,
    preformatted: null,
    columns: null,
    rows: null,
    metrics: null,
    chartType: "bar",
    chartData,
    items: null,
    fields: null,
  };
}

/** Build a UIComponent bar chart for domain frequency */
export function buildDomainBarChart(data: readonly DomainCount[]): UIComponent {
  const chartData: ChartDataPoint[] = data.map((d) => ({
    values: { domain: d.domain, count: String(d.count) },
  }));

  return {
    id: "knowledge-domain-chart",
    type: "chart",
    level: null,
    content: null,
    preformatted: null,
    columns: null,
    rows: null,
    metrics: null,
    chartType: "bar",
    chartData,
    items: null,
    fields: null,
  };
}

/** Build a UIComponent pie chart for item type distribution */
export function buildTypesPieChart(data: readonly TypeCount[]): UIComponent {
  const chartData: ChartDataPoint[] = data.map((d) => ({
    values: { type: d.type, count: String(d.count) },
  }));

  return {
    id: "knowledge-types-chart",
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

/** Build a UIComponent bar chart for tag frequency */
export function buildTagBarChart(data: readonly TagCount[]): UIComponent {
  const chartData: ChartDataPoint[] = data.map((d) => ({
    values: { tag: d.tag, count: String(d.count) },
  }));

  return {
    id: "knowledge-tags-chart",
    type: "chart",
    level: null,
    content: null,
    preformatted: null,
    columns: null,
    rows: null,
    metrics: null,
    chartType: "bar",
    chartData,
    items: null,
    fields: null,
  };
}

// ─── Formatting ──────────────────────────────────────────────────

/** Format large numbers with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format minutes into a human-readable string */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}
