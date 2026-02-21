import { describe, it, expect, vi } from "vitest";
import { embedChunks } from "./embedder.js";
import type { TextChunk } from "./chunker.js";
import type { ProviderRouter } from "./providers/router.js";
import type { LLMProviderAdapter, EmbedResponse } from "./providers/types.js";

function createMockRouter(embedFn: LLMProviderAdapter["embed"]): ProviderRouter {
  const mockProvider: LLMProviderAdapter = {
    name: "openai",
    chat: vi.fn(),
    embed: embedFn,
    stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
  };

  return {
    getEmbeddingProvider: () => mockProvider,
    getEmbeddingModel: () => "text-embedding-3-small",
    getChatProvider: vi.fn(),
    getProvider: vi.fn(),
    getActiveChatModel: vi.fn(),
  } as unknown as ProviderRouter;
}

function makeChunks(count: number): TextChunk[] {
  return Array.from({ length: count }, (_, i) => ({
    content: `Chunk content ${i}`,
    index: i,
    tokenCount: 10,
  }));
}

describe("embedChunks", () => {
  it("returns empty array for empty chunks", async () => {
    const router = createMockRouter(vi.fn());
    const result = await embedChunks(router, []);
    expect(result).toEqual([]);
  });

  it("generates embeddings for chunks", async () => {
    const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>().mockResolvedValue({
      embeddings: mockEmbeddings,
      model: "text-embedding-3-small",
      usage: { promptTokens: 20, totalTokens: 20 },
    });

    const router = createMockRouter(embedFn);
    const chunks = makeChunks(2);
    const result = await embedChunks(router, chunks);

    expect(result).toHaveLength(2);
    expect(result[0]!.chunk).toEqual(chunks[0]);
    expect(result[0]!.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result[1]!.chunk).toEqual(chunks[1]);
    expect(result[1]!.embedding).toEqual([0.4, 0.5, 0.6]);
  });

  it("processes chunks in batches", async () => {
    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>();

    // First batch: 3 chunks
    embedFn.mockResolvedValueOnce({
      embeddings: [[0.1], [0.2], [0.3]],
      model: "text-embedding-3-small",
      usage: { promptTokens: 30, totalTokens: 30 },
    });

    // Second batch: 2 chunks
    embedFn.mockResolvedValueOnce({
      embeddings: [[0.4], [0.5]],
      model: "text-embedding-3-small",
      usage: { promptTokens: 20, totalTokens: 20 },
    });

    const router = createMockRouter(embedFn);
    const chunks = makeChunks(5);
    const result = await embedChunks(router, chunks, { batchSize: 3 });

    expect(result).toHaveLength(5);
    expect(embedFn).toHaveBeenCalledTimes(2);

    // First batch should have 3 texts
    const firstCall = embedFn.mock.calls[0]!;
    expect((firstCall[0] as { input: string[] }).input).toHaveLength(3);

    // Second batch should have 2 texts
    const secondCall = embedFn.mock.calls[1]!;
    expect((secondCall[0] as { input: string[] }).input).toHaveLength(2);
  });

  it("throws if embedding response is missing entries", async () => {
    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>().mockResolvedValue({
      embeddings: [[0.1]], // Only 1 embedding for 2 chunks
      model: "text-embedding-3-small",
      usage: { promptTokens: 20, totalTokens: 20 },
    });

    const router = createMockRouter(embedFn);
    const chunks = makeChunks(2);

    await expect(embedChunks(router, chunks)).rejects.toThrow(
      "Embedding response missing for chunk index 1",
    );
  });

  it("uses correct model from router", async () => {
    const embedFn = vi.fn<(opts: { model: string; input: string | string[] }) => Promise<EmbedResponse>>().mockResolvedValue({
      embeddings: [[0.1]],
      model: "text-embedding-3-small",
      usage: { promptTokens: 10, totalTokens: 10 },
    });

    const router = createMockRouter(embedFn);
    const chunks = makeChunks(1);
    await embedChunks(router, chunks);

    expect(embedFn).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["Chunk content 0"],
    });
  });
});
