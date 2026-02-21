import { describe, it, expect } from "vitest";
import {
  packContext,
  buildSystemPrompt,
  extractCitations,
  type ContextChunk,
} from "./pipeline.js";
import type { SearchResult, SearchResultItem, SearchResultChunk } from "./retriever.js";

// ── Helpers ───────────────────────────────────────────────────────

function makeItem(
  id: string,
  overrides?: Partial<SearchResultItem>,
): SearchResultItem {
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

function makeChunk(
  id: string,
  score: number,
  content = `Chunk content for ${id}`,
  chunkIndex = 0,
): SearchResultChunk {
  return { id, content, chunkIndex, score };
}

function makeSearchResult(
  itemId: string,
  score: number,
  chunks: SearchResultChunk[],
  overrides?: Partial<SearchResultItem>,
): SearchResult {
  return {
    item: makeItem(itemId, overrides),
    score,
    snippet: null,
    matchingChunks: chunks,
  };
}

function makeContextChunk(
  citationIndex: number,
  overrides?: Partial<ContextChunk>,
): ContextChunk {
  return {
    citationIndex,
    content: `Context content for chunk ${citationIndex}`,
    tokenCount: 10,
    itemId: `item-${citationIndex}`,
    itemTitle: `Item ${citationIndex}`,
    itemUrl: `https://example.com/${citationIndex}`,
    itemDomain: "example.com",
    chunkId: `chunk-${citationIndex}`,
    ...overrides,
  };
}

// ── packContext ───────────────────────────────────────────────────

describe("packContext", () => {
  it("returns empty array for empty results", () => {
    expect(packContext([], 4000)).toEqual([]);
  });

  it("returns empty array for results with no chunks", () => {
    const results = [makeSearchResult("item-1", 0.9, [])];
    expect(packContext(results, 4000)).toEqual([]);
  });

  it("packs a single chunk", () => {
    const results = [
      makeSearchResult("item-1", 0.9, [
        makeChunk("c1", 1.0, "Hello world"),
      ]),
    ];

    const packed = packContext(results, 4000);

    expect(packed).toHaveLength(1);
    expect(packed[0]!.citationIndex).toBe(1);
    expect(packed[0]!.content).toBe("Hello world");
    expect(packed[0]!.itemId).toBe("item-1");
    expect(packed[0]!.chunkId).toBe("c1");
  });

  it("assigns sequential citation indices", () => {
    const results = [
      makeSearchResult("item-1", 0.9, [
        makeChunk("c1", 1.0, "First"),
        makeChunk("c2", 0.8, "Second"),
      ]),
      makeSearchResult("item-2", 0.7, [
        makeChunk("c3", 0.9, "Third"),
      ]),
    ];

    const packed = packContext(results, 4000);

    expect(packed).toHaveLength(3);
    expect(packed[0]!.citationIndex).toBe(1);
    expect(packed[1]!.citationIndex).toBe(2);
    expect(packed[2]!.citationIndex).toBe(3);
  });

  it("sorts by combined score (chunk score * item score)", () => {
    const results = [
      makeSearchResult("item-low", 0.3, [
        makeChunk("c1", 1.0, "Low item, high chunk"),
      ]),
      makeSearchResult("item-high", 0.9, [
        makeChunk("c2", 0.5, "High item, medium chunk"),
      ]),
    ];

    const packed = packContext(results, 4000);

    // item-high: 0.5 * 0.9 = 0.45
    // item-low: 1.0 * 0.3 = 0.30
    expect(packed[0]!.itemId).toBe("item-high");
    expect(packed[1]!.itemId).toBe("item-low");
  });

  it("respects token budget", () => {
    // Create chunks with known content sizes
    // "Hello" ≈ 1 token, plus ~20 for header = ~21 per chunk
    // With budget of 50 tokens, only ~2 chunks should fit
    const shortContent = "A";
    const results = [
      makeSearchResult("item-1", 0.9, [
        makeChunk("c1", 1.0, shortContent),
        makeChunk("c2", 0.9, shortContent),
        makeChunk("c3", 0.8, shortContent),
        makeChunk("c4", 0.7, shortContent),
      ]),
    ];

    const packed = packContext(results, 50);

    // Each chunk takes ~21 tokens (1 for content + 20 for header estimate)
    // Budget of 50 allows ~2 chunks
    expect(packed.length).toBeLessThanOrEqual(3);
    expect(packed.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates chunks by ID", () => {
    const results = [
      makeSearchResult("item-1", 0.9, [
        makeChunk("same-chunk", 1.0, "Content"),
      ]),
      makeSearchResult("item-2", 0.8, [
        makeChunk("same-chunk", 0.9, "Content"),
      ]),
    ];

    const packed = packContext(results, 4000);

    // Should only appear once despite being in two results
    const chunkIds = packed.map((c) => c.chunkId);
    expect(new Set(chunkIds).size).toBe(chunkIds.length);
  });

  it("preserves item metadata in packed chunks", () => {
    const results = [
      makeSearchResult("item-1", 0.9, [makeChunk("c1", 1.0, "Content")], {
        title: "My Article",
        url: "https://blog.example.com/article",
        domain: "blog.example.com",
      }),
    ];

    const packed = packContext(results, 4000);

    expect(packed[0]!.itemTitle).toBe("My Article");
    expect(packed[0]!.itemUrl).toBe("https://blog.example.com/article");
    expect(packed[0]!.itemDomain).toBe("blog.example.com");
  });

  it("skips chunks that individually exceed remaining budget", () => {
    // A very large chunk that won't fit, followed by a small one that will
    const largeContent = "word ".repeat(500); // ~500 tokens
    const smallContent = "small";

    const results = [
      makeSearchResult("item-1", 0.9, [
        makeChunk("c-large", 1.0, largeContent),
        makeChunk("c-small", 0.8, smallContent),
      ]),
    ];

    const packed = packContext(results, 100);

    // Large chunk doesn't fit, small one does
    expect(packed).toHaveLength(1);
    expect(packed[0]!.chunkId).toBe("c-small");
  });
});

// ── buildSystemPrompt ─────────────────────────────────────────────

describe("buildSystemPrompt", () => {
  it("returns fallback prompt when no context", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("no saved knowledge");
  });

  it("includes citation indices and source info", () => {
    const chunks = [
      makeContextChunk(1, {
        itemTitle: "React Hooks Guide",
        itemDomain: "reactjs.org",
        content: "Hooks let you use state in function components.",
      }),
      makeContextChunk(2, {
        itemTitle: "TypeScript Handbook",
        itemDomain: "typescriptlang.org",
        content: "TypeScript adds types to JavaScript.",
      }),
    ];

    const prompt = buildSystemPrompt(chunks);

    expect(prompt).toContain("[1] (Source: React Hooks Guide");
    expect(prompt).toContain("reactjs.org");
    expect(prompt).toContain("Hooks let you use state");
    expect(prompt).toContain("[2] (Source: TypeScript Handbook");
    expect(prompt).toContain("typescriptlang.org");
    expect(prompt).toContain("TypeScript adds types");
  });

  it("handles items without domain", () => {
    const chunks = [
      makeContextChunk(1, {
        itemTitle: "Local Note",
        itemDomain: null,
        content: "Some local content.",
      }),
    ];

    const prompt = buildSystemPrompt(chunks);

    // Should use title only (no domain)
    expect(prompt).toContain("[1] (Source: Local Note)");
    expect(prompt).not.toContain("null");
  });

  it("includes instruction to cite sources", () => {
    const chunks = [makeContextChunk(1)];
    const prompt = buildSystemPrompt(chunks);

    expect(prompt).toContain("[N]");
    expect(prompt).toContain("cite");
  });
});

// ── extractCitations ──────────────────────────────────────────────

describe("extractCitations", () => {
  const chunks = [
    makeContextChunk(1, {
      itemId: "item-a",
      chunkId: "chunk-a",
      itemTitle: "Article A",
      itemUrl: "https://a.com",
      content: "Content of article A for snippet extraction.",
    }),
    makeContextChunk(2, {
      itemId: "item-b",
      chunkId: "chunk-b",
      itemTitle: "Article B",
      itemUrl: "https://b.com",
      content: "Content of article B for snippet extraction.",
    }),
    makeContextChunk(3, {
      itemId: "item-c",
      chunkId: "chunk-c",
      itemTitle: "Article C",
      itemUrl: null,
      content: "Content of article C.",
    }),
  ];

  it("extracts single citation", () => {
    const response = "According to [1], hooks are great.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(1);
    expect(citations[0]!.index).toBe(1);
    expect(citations[0]!.itemId).toBe("item-a");
    expect(citations[0]!.chunkId).toBe("chunk-a");
    expect(citations[0]!.itemTitle).toBe("Article A");
    expect(citations[0]!.itemUrl).toBe("https://a.com");
  });

  it("extracts multiple citations", () => {
    const response = "Based on [1] and [2], the answer is clear.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(2);
    expect(citations[0]!.index).toBe(1);
    expect(citations[1]!.index).toBe(2);
  });

  it("deduplicates repeated citation indices", () => {
    const response =
      "As mentioned in [1], and confirmed by [1] again, this is true.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(1);
    expect(citations[0]!.index).toBe(1);
  });

  it("ignores citation indices not in context", () => {
    const response = "According to [99], this is unknown.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(0);
  });

  it("returns empty array for response with no citations", () => {
    const response = "This is a response without any citations.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(0);
  });

  it("returns citations sorted by index", () => {
    const response = "See [3] first, then [1], and finally [2].";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(3);
    expect(citations[0]!.index).toBe(1);
    expect(citations[1]!.index).toBe(2);
    expect(citations[2]!.index).toBe(3);
  });

  it("handles null URL in citations", () => {
    const response = "According to [3], this is correct.";
    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(1);
    expect(citations[0]!.itemUrl).toBeNull();
  });

  it("extracts snippet from chunk content", () => {
    const response = "Based on [1], the answer is clear.";
    const citations = extractCitations(response, chunks);

    expect(citations[0]!.snippet).toBe(
      "Content of article A for snippet extraction.",
    );
  });

  it("truncates long snippets", () => {
    const longContent = "A".repeat(500);
    const longChunks = [
      makeContextChunk(1, { content: longContent }),
    ];

    const response = "According to [1], this is a lot of text.";
    const citations = extractCitations(response, longChunks);

    expect(citations[0]!.snippet.length).toBe(200);
  });

  it("handles citation in complex markdown", () => {
    const response = `
Here is a detailed answer:

1. First point [1]
2. Second point [2]

> As stated in the source [1], this is important.

\`\`\`
code example [3]
\`\`\`
    `;

    const citations = extractCitations(response, chunks);

    expect(citations).toHaveLength(3);
  });
});
