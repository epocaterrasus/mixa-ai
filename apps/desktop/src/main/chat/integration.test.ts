/**
 * Integration test for the chat pipeline with a real Anthropic API key.
 *
 * Run with:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm vitest run src/main/chat/integration.test.ts
 *
 * Skipped automatically when no API key is provided.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderRouter,
  type ProviderCredentials,
  type ChatMessage,
  ragStream,
  packContext,
  buildSystemPrompt,
  extractCitations,
} from "@mixa-ai/ai-pipeline";
import type { LLMConfig } from "@mixa-ai/types";

const API_KEY = process.env["ANTHROPIC_API_KEY"] ?? "";
const shouldRun = API_KEY.length > 0;

const TEST_LLM_CONFIG: LLMConfig = {
  providers: [
    {
      name: "anthropic",
      displayName: "Anthropic",
      apiKeyConfigured: true,
      selectedModel: "claude-sonnet-4-20250514",
      availableModels: ["claude-sonnet-4-20250514"],
      isActive: true,
      baseUrl: null,
    },
  ],
  embeddingProvider: "openai",
  embeddingModel: "text-embedding-3-small",
};

function buildRouter(): ProviderRouter {
  const credentials: ProviderCredentials = {
    anthropic: { apiKey: API_KEY },
  };
  return new ProviderRouter(TEST_LLM_CONFIG, credentials);
}

describe.skipIf(!shouldRun)("Chat pipeline — Anthropic integration", () => {
  it("should get a response from Anthropic via direct chat", async () => {
    const router = buildRouter();
    const provider = router.getChatProvider();
    const model = router.getActiveChatModel();

    const messages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant. Reply in one short sentence." },
      { role: "user", content: "What is 2 + 2?" },
    ];

    const response = await provider.chat({
      model,
      messages,
      temperature: 0,
      maxTokens: 100,
    });

    console.log("Direct chat response:", response.content);
    console.log("Model used:", response.model);
    console.log("Tokens:", response.usage);

    expect(response.content).toBeTruthy();
    expect(response.content.toLowerCase()).toContain("4");
    expect(response.model).toContain("claude");
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  }, 30_000);

  it("should stream tokens from Anthropic", async () => {
    const router = buildRouter();
    const provider = router.getChatProvider();
    const model = router.getActiveChatModel();

    const messages: ChatMessage[] = [
      { role: "system", content: "Reply in one sentence." },
      { role: "user", content: "Say hello." },
    ];

    let fullContent = "";
    let chunkCount = 0;
    let gotDone = false;

    for await (const chunk of provider.stream({
      model,
      messages,
      temperature: 0,
      maxTokens: 100,
    })) {
      fullContent += chunk.content;
      chunkCount++;
      if (chunk.done) gotDone = true;
    }

    console.log("Streamed response:", fullContent);
    console.log("Chunks received:", chunkCount);

    expect(fullContent).toBeTruthy();
    expect(chunkCount).toBeGreaterThan(1);
    expect(gotDone).toBe(true);
  }, 30_000);

  it("should handle conversation history (multi-turn)", async () => {
    const router = buildRouter();
    const provider = router.getChatProvider();
    const model = router.getActiveChatModel();

    const messages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant. Reply in one short sentence." },
      { role: "user", content: "My name is Edgar." },
      { role: "assistant", content: "Nice to meet you, Edgar!" },
      { role: "user", content: "What is my name?" },
    ];

    const response = await provider.chat({
      model,
      messages,
      temperature: 0,
      maxTokens: 100,
    });

    console.log("Multi-turn response:", response.content);

    expect(response.content.toLowerCase()).toContain("edgar");
  }, 30_000);

  it("should build system prompt and extract citations from packed context", () => {
    const contextChunks = packContext(
      [
        {
          item: {
            id: "item-1",
            title: "TypeScript Handbook",
            url: "https://typescriptlang.org/docs",
            domain: "typescriptlang.org",
            summary: "TypeScript documentation",
            itemType: "page",
            thumbnailUrl: null,
            faviconUrl: null,
            capturedAt: new Date(),
          },
          score: 0.9,
          snippet: null,
          matchingChunks: [
            {
              id: "chunk-1",
              content: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
              chunkIndex: 0,
              score: 0.95,
            },
          ],
        },
      ],
      4000,
    );

    expect(contextChunks.length).toBe(1);
    expect(contextChunks[0]!.citationIndex).toBe(1);

    const systemPrompt = buildSystemPrompt(contextChunks);
    expect(systemPrompt).toContain("[1]");
    expect(systemPrompt).toContain("TypeScript Handbook");

    const response = "TypeScript is great [1] for type safety.";
    const citations = extractCitations(response, contextChunks);
    expect(citations).toHaveLength(1);
    expect(citations[0]!.itemTitle).toBe("TypeScript Handbook");
  });

  it("should stream a response with the RAG system prompt (no DB)", async () => {
    const router = buildRouter();
    const provider = router.getChatProvider();
    const model = router.getActiveChatModel();

    // Simulate what ragStream does but without the DB retrieval step
    const systemPrompt = buildSystemPrompt([]);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Hello, do you have any knowledge saved for me?" },
    ];

    let fullContent = "";

    for await (const chunk of provider.stream({
      model,
      messages,
      temperature: 0.3,
      maxTokens: 200,
    })) {
      fullContent += chunk.content;
    }

    console.log("RAG prompt (no context) response:", fullContent);

    expect(fullContent).toBeTruthy();
    // When no context is available, the AI should indicate it has no saved knowledge
    expect(fullContent.length).toBeGreaterThan(20);
  }, 30_000);
});
