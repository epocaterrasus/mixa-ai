import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiProvider } from "./gemini.js";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMProviderUnavailableError,
} from "./errors.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe("GeminiProvider", () => {
  const provider = new GeminiProvider({ apiKey: "test-gemini-key" });

  describe("chat", () => {
    it("returns a chat response", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "Hello from Gemini!" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 8,
            candidatesTokenCount: 5,
            totalTokenCount: 13,
          },
          modelVersion: "gemini-2.0-flash",
        }),
      );

      const result = await provider.chat({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.content).toBe("Hello from Gemini!");
      expect(result.model).toBe("gemini-2.0-flash");
      expect(result.usage.promptTokens).toBe(8);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(13);
    });

    it("sends API key as query parameter", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "ok" }] },
              finishReason: "STOP",
            },
          ],
        }),
      );

      await provider.chat({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "test" }],
      });

      const url = fetchMock.mock.calls[0]?.[0] as string;
      expect(url).toContain("key=test-gemini-key");
      expect(url).toContain("models/gemini-2.0-flash:generateContent");
    });

    it("converts system messages to systemInstruction", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "response" }] },
              finishReason: "STOP",
            },
          ],
        }),
      );

      await provider.chat({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: "Be helpful." },
          { role: "user", content: "Hi" },
        ],
      });

      const body = JSON.parse(
        fetchMock.mock.calls[0]?.[1]?.body as string,
      ) as Record<string, unknown>;
      expect(body["systemInstruction"]).toEqual({
        parts: [{ text: "Be helpful." }],
      });
    });

    it("converts assistant role to model role", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "response" }] },
              finishReason: "STOP",
            },
          ],
        }),
      );

      await provider.chat({
        model: "gemini-2.0-flash",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "How are you?" },
        ],
      });

      const body = JSON.parse(
        fetchMock.mock.calls[0]?.[1]?.body as string,
      ) as { contents: Array<{ role: string }> };
      expect(body.contents[1]?.role).toBe("model");
    });

    it("throws LLMAuthenticationError on 401", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

      await expect(
        provider.chat({
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMAuthenticationError);
    });

    it("throws LLMRateLimitError on 429", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));

      await expect(
        provider.chat({
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMRateLimitError);
    });

    it("throws LLMProviderUnavailableError on connection failure", async () => {
      fetchMock.mockRejectedValueOnce(new Error("fetch failed"));

      await expect(
        provider.chat({
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMProviderUnavailableError);
    });
  });

  describe("embed", () => {
    it("returns embedding for single input", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          embedding: { values: [0.1, 0.2, 0.3] },
        }),
      );

      const result = await provider.embed({
        model: "text-embedding-004",
        input: "test text",
      });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    });

    it("returns embeddings for multiple inputs via batchEmbedContents", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          embeddings: [
            { values: [0.1, 0.2] },
            { values: [0.3, 0.4] },
          ],
        }),
      );

      const result = await provider.embed({
        model: "text-embedding-004",
        input: ["text 1", "text 2"],
      });

      expect(result.embeddings).toHaveLength(2);

      const url = fetchMock.mock.calls[0]?.[0] as string;
      expect(url).toContain("batchEmbedContents");
    });
  });
});
