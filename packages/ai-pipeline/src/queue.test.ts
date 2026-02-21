import { describe, it, expect, vi } from "vitest";
import { chunkText } from "./chunker.js";
import { embedChunks } from "./embedder.js";
import type { ProviderRouter } from "./providers/router.js";
import type { LLMProviderAdapter, EmbedResponse } from "./providers/types.js";

/**
 * Integration-style test: content → chunk → embed → verify stored structure.
 * Does not require Redis (tests the pipeline functions directly, not BullMQ).
 */
describe("embedding pipeline integration", () => {
  it("captures content, chunks it, embeds it, and produces storable results", async () => {
    // Simulate captured web content
    const capturedContent = [
      "Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
      "Neural networks are computing systems inspired by biological neural networks in the brain.",
      "Deep learning uses multiple layers of neural networks to progressively extract higher-level features.",
      "Natural language processing enables computers to understand, interpret, and generate human language.",
      "Computer vision is a field of AI that trains computers to interpret and understand visual information.",
    ].join("\n\n");

    // Step 1: Chunk the content
    const chunks = chunkText(capturedContent, {
      targetTokens: 100,
      overlapTokens: 10,
    });

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.tokenCount).toBeGreaterThan(0);
      expect(typeof chunk.index).toBe("number");
    }

    // Step 2: Embed the chunks (mocked provider)
    const mockEmbeddings = chunks.map((_, i) =>
      Array.from({ length: 1536 }, (__, j) => (i + j) * 0.001),
    );

    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>().mockResolvedValue({
      embeddings: mockEmbeddings,
      model: "text-embedding-3-small",
      usage: { promptTokens: 100, totalTokens: 100 },
    });

    const mockProvider: LLMProviderAdapter = {
      name: "openai",
      chat: vi.fn(),
      embed: embedFn,
      stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
    };

    const mockRouter = {
      getEmbeddingProvider: () => mockProvider,
      getEmbeddingModel: () => "text-embedding-3-small",
    } as unknown as ProviderRouter;

    const embedded = await embedChunks(mockRouter, chunks);

    // Step 3: Verify the results are ready for DB insertion
    expect(embedded).toHaveLength(chunks.length);

    for (let i = 0; i < embedded.length; i++) {
      const ec = embedded[i]!;

      // Verify chunk data
      expect(ec.chunk.index).toBe(i);
      expect(ec.chunk.content.length).toBeGreaterThan(0);
      expect(ec.chunk.tokenCount).toBeGreaterThan(0);

      // Verify embedding
      expect(ec.embedding).toHaveLength(1536);
      expect(ec.embedding.every((v) => typeof v === "number")).toBe(true);
    }

    // Step 4: Verify structure matches what would be inserted into chunks table
    const dbRows = embedded.map((ec) => ({
      itemId: "test-item-uuid", // Would come from the item being processed
      chunkIndex: ec.chunk.index,
      content: ec.chunk.content,
      tokenCount: ec.chunk.tokenCount,
      embedding: ec.embedding,
    }));

    expect(dbRows).toHaveLength(chunks.length);
    for (const row of dbRows) {
      expect(row.itemId).toBe("test-item-uuid");
      expect(typeof row.chunkIndex).toBe("number");
      expect(typeof row.content).toBe("string");
      expect(typeof row.tokenCount).toBe("number");
      expect(Array.isArray(row.embedding)).toBe(true);
      expect(row.embedding).toHaveLength(1536);
    }
  });

  it("handles empty content gracefully", async () => {
    const chunks = chunkText("");
    expect(chunks).toEqual([]);
    // No need to embed empty chunks
  });

  it("handles very short content as single chunk", async () => {
    const content = "A brief note.";
    const chunks = chunkText(content);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe(content);

    // Embed single chunk
    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>().mockResolvedValue({
      embeddings: [Array.from({ length: 1536 }, () => 0.5)],
      model: "text-embedding-3-small",
      usage: { promptTokens: 5, totalTokens: 5 },
    });

    const mockProvider: LLMProviderAdapter = {
      name: "openai",
      chat: vi.fn(),
      embed: embedFn,
      stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
    };

    const mockRouter = {
      getEmbeddingProvider: () => mockProvider,
      getEmbeddingModel: () => "text-embedding-3-small",
    } as unknown as ProviderRouter;

    const embedded = await embedChunks(mockRouter, chunks);
    expect(embedded).toHaveLength(1);
    expect(embedded[0]!.embedding).toHaveLength(1536);
  });
});
