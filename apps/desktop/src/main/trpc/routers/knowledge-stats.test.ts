import { describe, it, expect, beforeEach } from "vitest";
import { captureStore, type CapturedItem } from "../../capture/service.js";
import { knowledgeStatsRouter } from "./knowledge-stats.js";

// Create a tRPC caller for testing
import { createCallerFactory } from "../trpc.js";
const createCaller = createCallerFactory(knowledgeStatsRouter);
const caller = createCaller({});

function makeItem(overrides: Partial<CapturedItem> = {}): CapturedItem {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2, 8)}`,
    url: "url" in overrides ? overrides.url! : "https://example.com",
    title: overrides.title ?? "Test Item",
    description: overrides.description ?? null,
    contentText: overrides.contentText ?? "Some content here.",
    contentHtml: overrides.contentHtml ?? null,
    itemType: overrides.itemType ?? "article",
    sourceType: overrides.sourceType ?? "manual",
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    faviconUrl: overrides.faviconUrl ?? null,
    domain: "domain" in overrides ? overrides.domain! : "example.com",
    wordCount: "wordCount" in overrides ? overrides.wordCount! : 100,
    readingTime: "readingTime" in overrides ? overrides.readingTime! : 1,
    isArchived: overrides.isArchived ?? false,
    isFavorite: overrides.isFavorite ?? false,
    capturedAt: overrides.capturedAt ?? new Date().toISOString(),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

describe("knowledgeStatsRouter", () => {
  beforeEach(() => {
    for (const item of captureStore.getAll()) {
      captureStore.delete(item.id);
    }
  });

  describe("overview", () => {
    it("returns zero stats for empty store", async () => {
      const result = await caller.overview();
      expect(result.total).toBe(0);
      expect(result.favorites).toBe(0);
      expect(result.archived).toBe(0);
      expect(result.totalWordCount).toBe(0);
      expect(result.totalReadingTime).toBe(0);
      expect(result.capturesByDay).toEqual([]);
      expect(result.byItemType).toEqual({});
      expect(result.topDomains).toEqual([]);
      expect(result.recentCaptures).toEqual([]);
    });

    it("counts total items", async () => {
      captureStore.add(makeItem());
      captureStore.add(makeItem());
      captureStore.add(makeItem());

      const result = await caller.overview();
      expect(result.total).toBe(3);
    });

    it("counts favorites and archived", async () => {
      captureStore.add(makeItem({ isFavorite: true }));
      captureStore.add(makeItem({ isFavorite: true }));
      captureStore.add(makeItem({ isArchived: true }));
      captureStore.add(makeItem());

      const result = await caller.overview();
      expect(result.favorites).toBe(2);
      expect(result.archived).toBe(1);
    });

    it("computes total word count and reading time", async () => {
      captureStore.add(makeItem({ wordCount: 500, readingTime: 3 }));
      captureStore.add(makeItem({ wordCount: 300, readingTime: 2 }));
      captureStore.add(makeItem({ wordCount: null, readingTime: null }));

      const result = await caller.overview();
      expect(result.totalWordCount).toBe(800);
      expect(result.totalReadingTime).toBe(5);
    });

    it("computes captures by day for recent items", async () => {
      const today = new Date().toISOString().slice(0, 10);
      captureStore.add(makeItem({ capturedAt: `${today}T10:00:00Z` }));
      captureStore.add(makeItem({ capturedAt: `${today}T14:00:00Z` }));

      const result = await caller.overview();
      expect(result.capturesByDay.length).toBeGreaterThanOrEqual(1);
      const todayEntry = result.capturesByDay.find((d) => d.date === today);
      expect(todayEntry?.count).toBe(2);
    });

    it("excludes old items from captures by day", async () => {
      const old = new Date();
      old.setDate(old.getDate() - 60);
      captureStore.add(makeItem({ capturedAt: old.toISOString() }));

      const result = await caller.overview();
      expect(result.capturesByDay).toEqual([]);
    });

    it("counts items by type", async () => {
      captureStore.add(makeItem({ itemType: "article" }));
      captureStore.add(makeItem({ itemType: "article" }));
      captureStore.add(makeItem({ itemType: "highlight" }));
      captureStore.add(makeItem({ itemType: "code" }));

      const result = await caller.overview();
      expect(result.byItemType["article"]).toBe(2);
      expect(result.byItemType["highlight"]).toBe(1);
      expect(result.byItemType["code"]).toBe(1);
    });

    it("computes top domains sorted by frequency", async () => {
      captureStore.add(makeItem({ domain: "github.com" }));
      captureStore.add(makeItem({ domain: "github.com" }));
      captureStore.add(makeItem({ domain: "github.com" }));
      captureStore.add(makeItem({ domain: "stackoverflow.com" }));
      captureStore.add(makeItem({ domain: "stackoverflow.com" }));
      captureStore.add(makeItem({ domain: "example.com" }));

      const result = await caller.overview();
      expect(result.topDomains[0]).toEqual({ key: "github.com", count: 3 });
      expect(result.topDomains[1]).toEqual({ key: "stackoverflow.com", count: 2 });
      expect(result.topDomains[2]).toEqual({ key: "example.com", count: 1 });
    });

    it("limits top domains to 10", async () => {
      for (let i = 0; i < 15; i++) {
        captureStore.add(makeItem({ domain: `domain-${i}.com` }));
      }

      const result = await caller.overview();
      expect(result.topDomains.length).toBe(10);
    });

    it("excludes items with null domain from top domains", async () => {
      captureStore.add(makeItem({ domain: null }));
      captureStore.add(makeItem({ domain: "example.com" }));

      const result = await caller.overview();
      expect(result.topDomains).toHaveLength(1);
      expect(result.topDomains[0]!.key).toBe("example.com");
    });

    it("returns recent captures sorted newest first", async () => {
      captureStore.add(makeItem({ title: "Old", capturedAt: "2026-01-01T10:00:00Z" }));
      captureStore.add(makeItem({ title: "New", capturedAt: "2026-02-21T10:00:00Z" }));
      captureStore.add(makeItem({ title: "Mid", capturedAt: "2026-02-01T10:00:00Z" }));

      const result = await caller.overview();
      expect(result.recentCaptures[0]!.title).toBe("New");
      expect(result.recentCaptures[1]!.title).toBe("Mid");
      expect(result.recentCaptures[2]!.title).toBe("Old");
    });

    it("limits recent captures to 10", async () => {
      for (let i = 0; i < 15; i++) {
        captureStore.add(makeItem({ title: `Item ${i}` }));
      }

      const result = await caller.overview();
      expect(result.recentCaptures).toHaveLength(10);
    });

    it("includes expected fields in recent captures", async () => {
      captureStore.add(makeItem({
        id: "test-id",
        title: "Test Title",
        url: "https://test.com/article",
        domain: "test.com",
        itemType: "article",
        wordCount: 500,
        readingTime: 3,
      }));

      const result = await caller.overview();
      const capture = result.recentCaptures[0]!;
      expect(capture.id).toBe("test-id");
      expect(capture.title).toBe("Test Title");
      expect(capture.url).toBe("https://test.com/article");
      expect(capture.domain).toBe("test.com");
      expect(capture.itemType).toBe("article");
      expect(capture.wordCount).toBe(500);
      expect(capture.readingTime).toBe(3);
    });
  });
});
