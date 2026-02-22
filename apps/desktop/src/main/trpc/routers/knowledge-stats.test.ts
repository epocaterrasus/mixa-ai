import { describe, it, expect, vi } from "vitest";

vi.mock("@mixa-ai/db", () => ({
  items: { userId: "user_id", isFavorite: "is_favorite", isArchived: "is_archived" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq-filter"),
}));

const mockSelectRows = vi.fn();

import { knowledgeStatsRouter } from "./knowledge-stats.js";
import { createCallerFactory } from "../trpc.js";

const createCaller = createCallerFactory(knowledgeStatsRouter);

function mockDb() {
  return {
    select: () => ({
      from: () => ({
        where: mockSelectRows,
      }),
    }),
  };
}

const caller = createCaller({ db: mockDb() as never, userId: "user-001" });

function makeItem(overrides: Partial<{
  id: string;
  title: string;
  url: string | null;
  domain: string | null;
  itemType: string;
  wordCount: number | null;
  readingTime: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  capturedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2, 8)}`,
    userId: "user-001",
    url: overrides.url ?? "https://example.com",
    title: overrides.title ?? "Test Item",
    description: null,
    contentText: "Some content.",
    contentHtml: null,
    itemType: overrides.itemType ?? "article",
    sourceType: "manual",
    thumbnailUrl: null,
    faviconUrl: null,
    domain: overrides.domain ?? "example.com",
    wordCount: overrides.wordCount ?? 100,
    readingTime: overrides.readingTime ?? 1,
    summary: null,
    isArchived: overrides.isArchived ?? false,
    isFavorite: overrides.isFavorite ?? false,
    capturedAt: overrides.capturedAt ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("knowledgeStatsRouter", () => {
  describe("overview", () => {
    it("returns zero stats for empty store", async () => {
      mockSelectRows.mockResolvedValue([]);

      const result = await caller.overview();
      expect(result.total).toBe(0);
      expect(result.favorites).toBe(0);
      expect(result.archived).toBe(0);
      expect(result.totalWordCount).toBe(0);
      expect(result.totalReadingTime).toBe(0);
    });

    it("counts total items", async () => {
      mockSelectRows.mockResolvedValue([makeItem(), makeItem(), makeItem()]);

      const result = await caller.overview();
      expect(result.total).toBe(3);
    });

    it("counts favorites and archived", async () => {
      mockSelectRows.mockResolvedValue([
        makeItem({ isFavorite: true }),
        makeItem({ isFavorite: true }),
        makeItem({ isArchived: true }),
        makeItem(),
      ]);

      const result = await caller.overview();
      expect(result.favorites).toBe(2);
      expect(result.archived).toBe(1);
    });

    it("computes total word count and reading time", async () => {
      const itemNullCounts = makeItem({ wordCount: null, readingTime: null });
      mockSelectRows.mockResolvedValue([
        makeItem({ wordCount: 500, readingTime: 3 }),
        makeItem({ wordCount: 300, readingTime: 2 }),
        itemNullCounts,
      ]);

      const result = await caller.overview();
      expect(result.totalWordCount).toBe(800);
      expect(result.totalReadingTime).toBe(5);
    });

    it("counts items by type", async () => {
      mockSelectRows.mockResolvedValue([
        makeItem({ itemType: "article" }),
        makeItem({ itemType: "article" }),
        makeItem({ itemType: "highlight" }),
        makeItem({ itemType: "code" }),
      ]);

      const result = await caller.overview();
      expect(result.byItemType["article"]).toBe(2);
      expect(result.byItemType["highlight"]).toBe(1);
      expect(result.byItemType["code"]).toBe(1);
    });

    it("computes top domains sorted by frequency", async () => {
      mockSelectRows.mockResolvedValue([
        makeItem({ domain: "github.com" }),
        makeItem({ domain: "github.com" }),
        makeItem({ domain: "github.com" }),
        makeItem({ domain: "stackoverflow.com" }),
        makeItem({ domain: "stackoverflow.com" }),
        makeItem({ domain: "example.com" }),
      ]);

      const result = await caller.overview();
      expect(result.topDomains[0]).toEqual({ key: "github.com", count: 3 });
      expect(result.topDomains[1]).toEqual({ key: "stackoverflow.com", count: 2 });
      expect(result.topDomains[2]).toEqual({ key: "example.com", count: 1 });
    });

    it("returns recent captures sorted newest first", async () => {
      mockSelectRows.mockResolvedValue([
        makeItem({ title: "Old", capturedAt: new Date("2026-01-01T10:00:00Z") }),
        makeItem({ title: "New", capturedAt: new Date("2026-02-21T10:00:00Z") }),
        makeItem({ title: "Mid", capturedAt: new Date("2026-02-01T10:00:00Z") }),
      ]);

      const result = await caller.overview();
      expect(result.recentCaptures[0]!.title).toBe("New");
      expect(result.recentCaptures[1]!.title).toBe("Mid");
      expect(result.recentCaptures[2]!.title).toBe("Old");
    });

    it("limits recent captures to 10", async () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => makeItem({ title: `Item ${i}` }));
      mockSelectRows.mockResolvedValue(manyItems);

      const result = await caller.overview();
      expect(result.recentCaptures).toHaveLength(10);
    });

    it("limits top domains to 10", async () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => makeItem({ domain: `domain-${i}.com` }));
      mockSelectRows.mockResolvedValue(manyItems);

      const result = await caller.overview();
      expect(result.topDomains.length).toBe(10);
    });

    it("excludes items with null domain from top domains", async () => {
      mockSelectRows.mockResolvedValue([
        makeItem({ domain: null }),
        makeItem({ domain: "example.com" }),
      ]);

      const result = await caller.overview();
      expect(result.topDomains).toHaveLength(1);
      expect(result.topDomains[0]!.key).toBe("example.com");
    });
  });
});
