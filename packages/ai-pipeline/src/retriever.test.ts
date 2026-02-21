import { describe, it, expect } from "vitest";
import {
  normalizeScores,
  mergeResults,
  type RawVectorHit,
  type RawFtsHit,
  type SearchResultItem,
} from "./retriever.js";

// ── Helpers ───────────────────────────────────────────────────────

function makeItem(id: string, overrides?: Partial<SearchResultItem>): SearchResultItem {
  return {
    id,
    title: `Item ${id}`,
    url: `https://example.com/${id}`,
    domain: "example.com",
    summary: `Summary for ${id}`,
    itemType: "article",
    thumbnailUrl: null,
    faviconUrl: null,
    capturedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeVectorHit(
  itemId: string,
  chunkId: string,
  score: number,
  chunkIndex = 0,
): RawVectorHit {
  return {
    itemId,
    chunkId,
    content: `Chunk content ${chunkId}`,
    chunkIndex,
    score,
    item: makeItem(itemId),
  };
}

function makeFtsHit(
  itemId: string,
  score: number,
  snippet: string | null = "matching <b>text</b>",
): RawFtsHit {
  return {
    itemId,
    score,
    snippet,
    item: makeItem(itemId),
  };
}

// ── normalizeScores ───────────────────────────────────────────────

describe("normalizeScores", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeScores([])).toEqual([]);
  });

  it("returns all zeros when all scores are zero", () => {
    expect(normalizeScores([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("normalizes a single score to 1", () => {
    expect(normalizeScores([0.5])).toEqual([1]);
  });

  it("normalizes scores to 0-1 range with max = 1", () => {
    const result = normalizeScores([2, 4, 1, 3]);
    expect(result).toEqual([0.5, 1, 0.25, 0.75]);
  });

  it("keeps scores unchanged when max is already 1", () => {
    const result = normalizeScores([0.2, 0.8, 1.0, 0.5]);
    expect(result).toEqual([0.2, 0.8, 1.0, 0.5]);
  });

  it("handles negative scores", () => {
    // Cosine similarity can produce negative values for non-normalized vectors
    const result = normalizeScores([-0.5, 0, 0.5, 1.0]);
    expect(result).toEqual([-0.5, 0, 0.5, 1.0]);
  });
});

// ── mergeResults ──────────────────────────────────────────────────

describe("mergeResults", () => {
  const vectorWeight = 0.6;
  const ftsWeight = 0.4;
  const minScore = 0.1;
  const limit = 20;

  it("returns empty array when both sources are empty", () => {
    const result = mergeResults([], [], vectorWeight, ftsWeight, minScore, limit);
    expect(result).toEqual([]);
  });

  it("returns results from vector-only hits", () => {
    const vectorHits = [makeVectorHit("item-1", "chunk-1", 0.9)];
    const result = mergeResults(vectorHits, [], vectorWeight, ftsWeight, minScore, limit);

    expect(result).toHaveLength(1);
    expect(result[0]!.item.id).toBe("item-1");
    // Single vector hit normalized to 1.0, then weighted: 0.6 * 1.0 = 0.6
    expect(result[0]!.score).toBeCloseTo(0.6);
    expect(result[0]!.snippet).toBeNull();
    expect(result[0]!.matchingChunks).toHaveLength(1);
  });

  it("returns results from FTS-only hits", () => {
    const ftsHits = [makeFtsHit("item-1", 3.5, "a <<matching>> snippet")];
    const result = mergeResults([], ftsHits, vectorWeight, ftsWeight, minScore, limit);

    expect(result).toHaveLength(1);
    expect(result[0]!.item.id).toBe("item-1");
    // Single FTS hit normalized to 1.0, then weighted: 0.4 * 1.0 = 0.4
    expect(result[0]!.score).toBeCloseTo(0.4);
    expect(result[0]!.snippet).toBe("a <<matching>> snippet");
    expect(result[0]!.matchingChunks).toHaveLength(0);
  });

  it("combines scores when item appears in both sources", () => {
    const vectorHits = [makeVectorHit("item-1", "chunk-1", 0.8)];
    const ftsHits = [makeFtsHit("item-1", 2.0)];

    const result = mergeResults(
      vectorHits,
      ftsHits,
      vectorWeight,
      ftsWeight,
      minScore,
      limit,
    );

    expect(result).toHaveLength(1);
    // Both normalized to 1.0 (single items): 0.6 * 1.0 + 0.4 * 1.0 = 1.0
    expect(result[0]!.score).toBeCloseTo(1.0);
    expect(result[0]!.matchingChunks).toHaveLength(1);
    expect(result[0]!.snippet).toBe("matching <b>text</b>");
  });

  it("sorts results by descending score", () => {
    const vectorHits = [
      makeVectorHit("item-low", "chunk-1", 0.2),
      makeVectorHit("item-high", "chunk-2", 0.9),
      makeVectorHit("item-mid", "chunk-3", 0.5),
    ];

    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      minScore,
      limit,
    );

    expect(result).toHaveLength(3);
    expect(result[0]!.item.id).toBe("item-high");
    expect(result[1]!.item.id).toBe("item-mid");
    expect(result[2]!.item.id).toBe("item-low");
  });

  it("filters out results below minScore threshold", () => {
    const vectorHits = [
      makeVectorHit("item-good", "chunk-1", 1.0),
      makeVectorHit("item-bad", "chunk-2", 0.01),
    ];

    // item-good: normalized=1.0, score = 0.6*1.0 = 0.6 (passes minScore=0.1)
    // item-bad: normalized=0.01, score = 0.6*0.01 = 0.006 (below minScore=0.1)
    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      0.1,
      limit,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.item.id).toBe("item-good");
  });

  it("respects limit parameter", () => {
    const vectorHits = Array.from({ length: 10 }, (_, i) =>
      makeVectorHit(`item-${i}`, `chunk-${i}`, 0.5 + i * 0.05),
    );

    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      0,
      3,
    );

    expect(result).toHaveLength(3);
    // Should be top 3 by score
    expect(result[0]!.item.id).toBe("item-9");
    expect(result[1]!.item.id).toBe("item-8");
    expect(result[2]!.item.id).toBe("item-7");
  });

  it("groups multiple chunks under the same item", () => {
    const vectorHits = [
      makeVectorHit("item-1", "chunk-a", 0.9, 0),
      makeVectorHit("item-1", "chunk-b", 0.7, 1),
      makeVectorHit("item-1", "chunk-c", 0.5, 2),
    ];

    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      minScore,
      limit,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.matchingChunks).toHaveLength(3);
    // Chunks sorted by score descending
    expect(result[0]!.matchingChunks[0]!.id).toBe("chunk-a");
    expect(result[0]!.matchingChunks[1]!.id).toBe("chunk-b");
    expect(result[0]!.matchingChunks[2]!.id).toBe("chunk-c");
  });

  it("limits chunks per item to 3", () => {
    const vectorHits = [
      makeVectorHit("item-1", "chunk-a", 0.9, 0),
      makeVectorHit("item-1", "chunk-b", 0.8, 1),
      makeVectorHit("item-1", "chunk-c", 0.7, 2),
      makeVectorHit("item-1", "chunk-d", 0.6, 3),
      makeVectorHit("item-1", "chunk-e", 0.5, 4),
    ];

    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      minScore,
      limit,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.matchingChunks).toHaveLength(3);
    // Should be top 3 chunks by score
    expect(result[0]!.matchingChunks[0]!.id).toBe("chunk-a");
    expect(result[0]!.matchingChunks[1]!.id).toBe("chunk-b");
    expect(result[0]!.matchingChunks[2]!.id).toBe("chunk-c");
  });

  it("uses best chunk score for item hybrid scoring", () => {
    const vectorHits = [
      makeVectorHit("item-1", "chunk-1", 1.0, 0), // best
      makeVectorHit("item-1", "chunk-2", 0.5, 1),
    ];
    const ftsHits = [makeFtsHit("item-1", 1.0)];

    const result = mergeResults(
      vectorHits,
      ftsHits,
      vectorWeight,
      ftsWeight,
      minScore,
      limit,
    );

    // Best vector chunk score = 1.0 (normalized), FTS = 1.0 (normalized)
    // hybrid = 0.6 * 1.0 + 0.4 * 1.0 = 1.0
    expect(result[0]!.score).toBeCloseTo(1.0);
  });

  it("handles custom weight configuration", () => {
    const vectorHits = [makeVectorHit("item-1", "chunk-1", 1.0)];
    const ftsHits = [makeFtsHit("item-1", 1.0)];

    // Give full weight to vector search
    const result = mergeResults(vectorHits, ftsHits, 1.0, 0.0, 0, limit);

    // hybrid = 1.0 * 1.0 + 0.0 * 1.0 = 1.0
    expect(result[0]!.score).toBeCloseTo(1.0);

    // Give full weight to FTS
    const result2 = mergeResults(vectorHits, ftsHits, 0.0, 1.0, 0, limit);

    // hybrid = 0.0 * 1.0 + 1.0 * 1.0 = 1.0
    expect(result2[0]!.score).toBeCloseTo(1.0);
  });

  it("ranks items appearing in both sources higher than single-source", () => {
    const vectorHits = [
      makeVectorHit("item-both", "chunk-1", 0.8),
      makeVectorHit("item-vector-only", "chunk-2", 1.0),
    ];
    const ftsHits = [
      makeFtsHit("item-both", 2.0),
      makeFtsHit("item-fts-only", 1.5),
    ];

    const result = mergeResults(
      vectorHits,
      ftsHits,
      vectorWeight,
      ftsWeight,
      0,
      limit,
    );

    // item-both appears in both sources, should rank highest
    expect(result[0]!.item.id).toBe("item-both");
  });

  it("preserves snippet from FTS results", () => {
    const ftsHits = [
      makeFtsHit("item-1", 1.0, "This is the <<highlighted>> snippet"),
    ];

    const result = mergeResults([], ftsHits, vectorWeight, ftsWeight, 0, limit);

    expect(result[0]!.snippet).toBe("This is the <<highlighted>> snippet");
  });

  it("sets snippet to null for vector-only results", () => {
    const vectorHits = [makeVectorHit("item-1", "chunk-1", 0.9)];

    const result = mergeResults(
      vectorHits,
      [],
      vectorWeight,
      ftsWeight,
      0,
      limit,
    );

    expect(result[0]!.snippet).toBeNull();
  });
});
