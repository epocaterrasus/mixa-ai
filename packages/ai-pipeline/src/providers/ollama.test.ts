import { describe, it, expect, vi, beforeEach } from "vitest";
import { OllamaProvider } from "./ollama.js";
import { LLMProviderUnavailableError, LLMError } from "./errors.js";

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

describe("OllamaProvider", () => {
  const provider = new OllamaProvider({ apiKey: "" });

  describe("chat", () => {
    it("returns a chat response", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: "llama3.2",
          message: { role: "assistant", content: "Hello from Ollama!" },
          done: true,
          prompt_eval_count: 15,
          eval_count: 10,
        }),
      );

      const result = await provider.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.content).toBe("Hello from Ollama!");
      expect(result.model).toBe("llama3.2");
      expect(result.usage.promptTokens).toBe(15);
      expect(result.usage.completionTokens).toBe(10);
      expect(result.usage.totalTokens).toBe(25);
    });

    it("sends request to correct URL", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: "llama3.2",
          message: { role: "assistant", content: "ok" },
          done: true,
        }),
      );

      await provider.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: "test" }],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:11434/api/chat",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("uses custom base URL", async () => {
      const customProvider = new OllamaProvider({
        apiKey: "",
        baseUrl: "http://my-ollama:11434",
      });

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: "llama3.2",
          message: { role: "assistant", content: "ok" },
          done: true,
        }),
      );

      await customProvider.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: "test" }],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://my-ollama:11434/api/chat",
        expect.anything(),
      );
    });

    it("throws LLMProviderUnavailableError on connection failure", async () => {
      fetchMock.mockRejectedValueOnce(new Error("fetch failed"));

      await expect(
        provider.chat({
          model: "llama3.2",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMProviderUnavailableError);
    });

    it("throws LLMError on HTTP error", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "model not found" }, 404),
      );

      await expect(
        provider.chat({
          model: "nonexistent",
          messages: [{ role: "user", content: "test" }],
        }),
      ).rejects.toThrow(LLMError);
    });
  });

  describe("embed", () => {
    it("returns embeddings for a single input", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: "nomic-embed-text",
          embeddings: [[0.1, 0.2, 0.3]],
          prompt_eval_count: 4,
        }),
      );

      const result = await provider.embed({
        model: "nomic-embed-text",
        input: "test text",
      });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.model).toBe("nomic-embed-text");
    });

    it("returns embeddings for multiple inputs", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: "nomic-embed-text",
          embeddings: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
          prompt_eval_count: 8,
        }),
      );

      const result = await provider.embed({
        model: "nomic-embed-text",
        input: ["text 1", "text 2"],
      });

      expect(result.embeddings).toHaveLength(2);
    });
  });

  describe("stream", () => {
    it("yields stream chunks from NDJSON response", async () => {
      const lines = [
        JSON.stringify({
          model: "llama3.2",
          message: { role: "assistant", content: "Hello" },
          done: false,
        }),
        JSON.stringify({
          model: "llama3.2",
          message: { role: "assistant", content: " world" },
          done: false,
        }),
        JSON.stringify({
          model: "llama3.2",
          message: { role: "assistant", content: "" },
          done: true,
        }),
      ].join("\n");

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines));
          controller.close();
        },
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: readable,
      } as Response);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.stream({
        model: "llama3.2",
        messages: [{ role: "user", content: "Hello" }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.content).toBe("Hello");
      expect(chunks[2]?.done).toBe(true);
    });
  });
});
