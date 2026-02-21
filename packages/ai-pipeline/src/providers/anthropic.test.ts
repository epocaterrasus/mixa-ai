import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnthropicProvider } from "./anthropic.js";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMError,
} from "./errors.js";

// Mock the @anthropic-ai/sdk module
vi.mock("@anthropic-ai/sdk", () => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  const createMock = vi.fn();
  const streamMock = vi.fn();

  class MockAnthropic {
    messages = { create: createMock, stream: streamMock };
    static APIError = MockAPIError;
  }

  return {
    default: MockAnthropic,
    __esModule: true,
    _createMock: createMock,
    _streamMock: streamMock,
    _MockAPIError: MockAPIError,
  };
});

let createMock: ReturnType<typeof vi.fn>;
let streamMock: ReturnType<typeof vi.fn>;
let MockAPIError: new (status: number, message: string) => Error & { status: number };

beforeEach(async () => {
  const mod = await import("@anthropic-ai/sdk");
  const modAny = mod as unknown as Record<string, unknown>;
  createMock = modAny["_createMock"] as ReturnType<typeof vi.fn>;
  streamMock = modAny["_streamMock"] as ReturnType<typeof vi.fn>;
  MockAPIError = modAny["_MockAPIError"] as new (status: number, message: string) => Error & { status: number };
  createMock.mockReset();
  streamMock.mockReset();
});

describe("AnthropicProvider", () => {
  const provider = new AnthropicProvider({ apiKey: "test-key" });

  describe("chat", () => {
    it("returns a chat response", async () => {
      createMock.mockResolvedValueOnce({
        content: [{ type: "text", text: "I can help with that!" }],
        model: "claude-3-5-sonnet-20241022",
        usage: { input_tokens: 12, output_tokens: 8 },
      });

      const result = await provider.chat({
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: "Help me" }],
      });

      expect(result.content).toBe("I can help with that!");
      expect(result.model).toBe("claude-3-5-sonnet-20241022");
      expect(result.usage.promptTokens).toBe(12);
      expect(result.usage.completionTokens).toBe(8);
      expect(result.usage.totalTokens).toBe(20);
    });

    it("extracts system messages and passes them separately", async () => {
      createMock.mockResolvedValueOnce({
        content: [{ type: "text", text: "response" }],
        model: "claude-3-haiku-20240307",
        usage: { input_tokens: 20, output_tokens: 5 },
      });

      await provider.chat({
        model: "claude-3-haiku-20240307",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hi" },
        ],
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are helpful.",
          messages: [{ role: "user", content: "Hi" }],
        }),
      );
    });

    it("throws LLMAuthenticationError on 401", async () => {
      createMock.mockRejectedValueOnce(
        new MockAPIError(401, "Invalid API key"),
      );

      await expect(
        provider.chat({
          model: "claude-3-haiku-20240307",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMAuthenticationError);
    });

    it("throws LLMRateLimitError on 429", async () => {
      createMock.mockRejectedValueOnce(
        new MockAPIError(429, "Rate limited"),
      );

      await expect(
        provider.chat({
          model: "claude-3-haiku-20240307",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMRateLimitError);
    });
  });

  describe("embed", () => {
    it("throws LLMError (not supported)", async () => {
      await expect(
        provider.embed({
          model: "any-model",
          input: "test",
        }),
      ).rejects.toThrow(LLMError);
    });
  });

  describe("stream", () => {
    it("yields stream chunks from Anthropic events", async () => {
      const mockStream = (async function* () {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Hello" },
        };
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: " there" },
        };
        yield { type: "message_stop" };
      })();

      streamMock.mockReturnValueOnce(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.stream({
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Hi" }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.content).toBe("Hello");
      expect(chunks[0]?.done).toBe(false);
      expect(chunks[1]?.content).toBe(" there");
      expect(chunks[2]?.done).toBe(true);
    });
  });
});
