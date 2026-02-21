import { describe, it, expect, vi } from "vitest";
import { summarizeAndTag } from "./summarizer.js";
import type { ProviderRouter } from "./providers/router.js";
import type { LLMProviderAdapter, ChatResponse } from "./providers/types.js";

function createMockRouter(
  chatResponse: ChatResponse,
): ProviderRouter {
  const mockProvider: LLMProviderAdapter = {
    name: "openai",
    chat: vi.fn().mockResolvedValue(chatResponse),
    embed: vi.fn(),
    stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
  };

  return {
    getChatProvider: () => mockProvider,
    getActiveChatModel: () => "gpt-4o-mini",
  } as unknown as ProviderRouter;
}

function createFailingRouter(error: Error): ProviderRouter {
  const mockProvider: LLMProviderAdapter = {
    name: "openai",
    chat: vi.fn().mockRejectedValue(error),
    embed: vi.fn(),
    stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
  };

  return {
    getChatProvider: () => mockProvider,
    getActiveChatModel: () => "gpt-4o-mini",
  } as unknown as ProviderRouter;
}

describe("summarizeAndTag", () => {
  it("returns summary and normalized tags from LLM response", async () => {
    const router = createMockRouter({
      content: JSON.stringify({
        summary:
          "This article discusses machine learning techniques for natural language processing.",
        tags: [
          { name: "Machine Learning", score: 0.95 },
          { name: "NLP", score: 0.9 },
          { name: "AI", score: 0.85 },
        ],
      }),
      model: "gpt-4o-mini",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    const result = await summarizeAndTag(router, "Some article about ML and NLP...");

    expect(result).not.toBeNull();
    expect(result!.summary).toBe(
      "This article discusses machine learning techniques for natural language processing.",
    );
    expect(result!.tags.length).toBeGreaterThanOrEqual(3);
    expect(result!.tags[0]!.name).toBe("machine-learning");
    expect(result!.tags[0]!.score).toBe(0.95);
  });

  it("handles LLM response wrapped in markdown code fences", async () => {
    const router = createMockRouter({
      content:
        '```json\n{"summary": "A brief summary.", "tags": [{"name": "test", "score": 0.8}]}\n```',
      model: "gpt-4o-mini",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    });

    const result = await summarizeAndTag(router, "Some content");

    expect(result).not.toBeNull();
    expect(result!.summary).toBe("A brief summary.");
    expect(result!.tags).toHaveLength(1);
    expect(result!.tags[0]!.name).toBe("test");
  });

  it("returns null for empty content", async () => {
    const router = createMockRouter({
      content: "{}",
      model: "gpt-4o-mini",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const result = await summarizeAndTag(router, "");
    expect(result).toBeNull();
  });

  it("returns null for whitespace-only content", async () => {
    const router = createMockRouter({
      content: "{}",
      model: "gpt-4o-mini",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const result = await summarizeAndTag(router, "   \n  \t  ");
    expect(result).toBeNull();
  });

  it("gracefully returns null when LLM call fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const router = createFailingRouter(new Error("API key invalid"));

    const result = await summarizeAndTag(router, "Some content");

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("summarizeAndTag failed"),
    );

    consoleSpy.mockRestore();
  });

  it("gracefully returns null when LLM returns invalid JSON", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const router = createMockRouter({
      content: "This is not JSON at all",
      model: "gpt-4o-mini",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    });

    const result = await summarizeAndTag(router, "Some content");

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("gracefully returns null when LLM returns JSON without required fields", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const router = createMockRouter({
      content: '{"foo": "bar"}',
      model: "gpt-4o-mini",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    });

    const result = await summarizeAndTag(router, "Some content");

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("truncates content exceeding maxContentLength", async () => {
    const chatFn = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: "Summary of truncated content.",
        tags: [{ name: "test", score: 0.9 }],
      }),
      model: "gpt-4o-mini",
      usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130 },
    });

    const mockProvider: LLMProviderAdapter = {
      name: "openai",
      chat: chatFn,
      embed: vi.fn(),
      stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
    };

    const router = {
      getChatProvider: () => mockProvider,
      getActiveChatModel: () => "gpt-4o-mini",
    } as unknown as ProviderRouter;

    const longContent = "A".repeat(20000);
    await summarizeAndTag(router, longContent, { maxContentLength: 500 });

    const callArgs = chatFn.mock.calls[0]![0] as { messages: Array<{ content: string }> };
    const userMessage = callArgs.messages[1]!.content;
    expect(userMessage).toContain("[Content truncated...]");
    expect(userMessage.length).toBeLessThan(longContent.length);
  });

  it("includes title in the prompt when provided", async () => {
    const chatFn = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        summary: "A summary.",
        tags: [{ name: "test", score: 0.9 }],
      }),
      model: "gpt-4o-mini",
      usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130 },
    });

    const mockProvider: LLMProviderAdapter = {
      name: "openai",
      chat: chatFn,
      embed: vi.fn(),
      stream: vi.fn() as unknown as LLMProviderAdapter["stream"],
    };

    const router = {
      getChatProvider: () => mockProvider,
      getActiveChatModel: () => "gpt-4o-mini",
    } as unknown as ProviderRouter;

    await summarizeAndTag(router, "Content here", {
      title: "My Article Title",
    });

    const callArgs = chatFn.mock.calls[0]![0] as { messages: Array<{ content: string }> };
    const userMessage = callArgs.messages[1]!.content;
    expect(userMessage).toContain("Title: My Article Title");
  });

  it("handles tags without score field (defaults to 0.5)", async () => {
    const router = createMockRouter({
      content: JSON.stringify({
        summary: "A summary.",
        tags: [
          { name: "no-score-tag" },
          { name: "has-score", score: 0.9 },
        ],
      }),
      model: "gpt-4o-mini",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    });

    const result = await summarizeAndTag(router, "Content");

    expect(result).not.toBeNull();
    expect(result!.tags).toHaveLength(2);

    const noScoreTag = result!.tags.find((t) => t.name === "no-score-tag");
    expect(noScoreTag).toBeDefined();
    expect(noScoreTag!.score).toBe(0.5);
  });
});
