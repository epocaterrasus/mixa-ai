import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIProvider } from "./openai.js";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMProviderUnavailableError,
} from "./errors.js";

// Mock the openai module
vi.mock("openai", () => {
  class MockAPIError extends Error {
    status: number;
    headers: Record<string, string>;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.headers = {};
      this.name = "APIError";
    }
  }

  const createMock = vi.fn();
  const embeddingsMock = vi.fn();

  class MockOpenAI {
    chat = { completions: { create: createMock } };
    embeddings = { create: embeddingsMock };
    static APIError = MockAPIError;
  }

  return {
    default: MockOpenAI,
    __esModule: true,
    // Expose mocks for test access
    _createMock: createMock,
    _embeddingsMock: embeddingsMock,
    _MockAPIError: MockAPIError,
  };
});

let createMock: ReturnType<typeof vi.fn>;
let embeddingsMock: ReturnType<typeof vi.fn>;
let MockAPIError: new (status: number, message: string) => Error & { status: number };

beforeEach(async () => {
  const mod = await import("openai");
  const modAny = mod as unknown as Record<string, unknown>;
  createMock = modAny["_createMock"] as ReturnType<typeof vi.fn>;
  embeddingsMock = modAny["_embeddingsMock"] as ReturnType<typeof vi.fn>;
  MockAPIError = modAny["_MockAPIError"] as new (status: number, message: string) => Error & { status: number };
  createMock.mockReset();
  embeddingsMock.mockReset();
});

describe("OpenAIProvider", () => {
  const provider = new OpenAIProvider({ apiKey: "test-key" });

  describe("chat", () => {
    it("returns a chat response", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: { content: "Hello! How can I help?" },
            finish_reason: "stop",
          },
        ],
        model: "gpt-4o-mini",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      });

      const result = await provider.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.content).toBe("Hello! How can I help?");
      expect(result.model).toBe("gpt-4o-mini");
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(8);
      expect(result.usage.totalTokens).toBe(18);
    });

    it("passes temperature and maxTokens", async () => {
      createMock.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        model: "gpt-4o",
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      });

      await provider.chat({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        temperature: 0.7,
        maxTokens: 100,
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 100,
        }),
      );
    });

    it("throws LLMAuthenticationError on 401", async () => {
      createMock.mockRejectedValueOnce(
        new MockAPIError(401, "Invalid API key"),
      );

      await expect(
        provider.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMAuthenticationError);
    });

    it("throws LLMRateLimitError on 429", async () => {
      createMock.mockRejectedValueOnce(
        new MockAPIError(429, "Rate limited"),
      );

      await expect(
        provider.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMRateLimitError);
    });

    it("throws LLMProviderUnavailableError on connection failure", async () => {
      createMock.mockRejectedValueOnce(
        new Error("fetch failed: ECONNREFUSED"),
      );

      await expect(
        provider.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMProviderUnavailableError);
    });
  });

  describe("embed", () => {
    it("returns embeddings for a single input", async () => {
      embeddingsMock.mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        model: "text-embedding-3-small",
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });

      const result = await provider.embed({
        model: "text-embedding-3-small",
        input: "test text",
      });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.model).toBe("text-embedding-3-small");
    });

    it("returns embeddings for multiple inputs", async () => {
      embeddingsMock.mockResolvedValueOnce({
        data: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] },
        ],
        model: "text-embedding-3-small",
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const result = await provider.embed({
        model: "text-embedding-3-small",
        input: ["text 1", "text 2"],
      });

      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2]);
      expect(result.embeddings[1]).toEqual([0.3, 0.4]);
    });
  });

  describe("stream", () => {
    it("yields stream chunks", async () => {
      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: "Hello" }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: { content: " world" }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: { content: "" }, finish_reason: "stop" }],
        };
      })();

      createMock.mockResolvedValueOnce(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.stream({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.content).toBe("Hello");
      expect(chunks[0]?.done).toBe(false);
      expect(chunks[1]?.content).toBe(" world");
      expect(chunks[2]?.done).toBe(true);
    });
  });
});
