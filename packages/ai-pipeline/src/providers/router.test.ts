import { describe, it, expect, vi } from "vitest";
import type { LLMConfig } from "@mixa-ai/types";
import { createProvider, ProviderRouter, DEFAULT_MODELS, DEFAULT_EMBEDDING_MODELS } from "./router.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { GeminiProvider } from "./gemini.js";
import { LLMError } from "./errors.js";

// Mock provider constructors so they don't try to instantiate real SDKs
vi.mock("openai", () => ({
  default: class { chat = { completions: { create: vi.fn() } }; embeddings = { create: vi.fn() }; },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create: vi.fn(), stream: vi.fn() }; },
}));

describe("createProvider", () => {
  it("creates OpenAI provider", () => {
    const provider = createProvider("openai", { apiKey: "test" });
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe("openai");
  });

  it("creates Anthropic provider", () => {
    const provider = createProvider("anthropic", { apiKey: "test" });
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.name).toBe("anthropic");
  });

  it("creates Ollama provider", () => {
    const provider = createProvider("ollama", { apiKey: "" });
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe("ollama");
  });

  it("creates Gemini provider", () => {
    const provider = createProvider("gemini", { apiKey: "test" });
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe("gemini");
  });
});

describe("DEFAULT_MODELS", () => {
  it("has models for all providers", () => {
    expect(DEFAULT_MODELS.openai.length).toBeGreaterThan(0);
    expect(DEFAULT_MODELS.anthropic.length).toBeGreaterThan(0);
    expect(DEFAULT_MODELS.ollama.length).toBeGreaterThan(0);
    expect(DEFAULT_MODELS.gemini.length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_EMBEDDING_MODELS", () => {
  it("has embedding models for OpenAI and Gemini", () => {
    expect(DEFAULT_EMBEDDING_MODELS.openai.length).toBeGreaterThan(0);
    expect(DEFAULT_EMBEDDING_MODELS.gemini.length).toBeGreaterThan(0);
  });

  it("has no embedding models for Anthropic", () => {
    expect(DEFAULT_EMBEDDING_MODELS.anthropic).toHaveLength(0);
  });
});

describe("ProviderRouter", () => {
  const testConfig: LLMConfig = {
    providers: [
      {
        name: "openai",
        displayName: "OpenAI",
        apiKeyConfigured: true,
        selectedModel: "gpt-4o-mini",
        availableModels: ["gpt-4o", "gpt-4o-mini"],
        isActive: true,
        baseUrl: null,
      },
      {
        name: "anthropic",
        displayName: "Anthropic",
        apiKeyConfigured: true,
        selectedModel: "claude-3-haiku-20240307",
        availableModels: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
        isActive: false,
        baseUrl: null,
      },
    ],
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
  };

  const testCredentials = {
    openai: { apiKey: "sk-test-openai" },
    anthropic: { apiKey: "sk-test-anthropic" },
  };

  it("returns the active chat provider", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    const provider = router.getChatProvider();

    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe("openai");
  });

  it("returns the embedding provider", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    const provider = router.getEmbeddingProvider();

    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("returns the active chat model name", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    expect(router.getActiveChatModel()).toBe("gpt-4o-mini");
  });

  it("returns the embedding model name", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    expect(router.getEmbeddingModel()).toBe("text-embedding-3-small");
  });

  it("caches provider instances", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    const provider1 = router.getChatProvider();
    const provider2 = router.getChatProvider();

    expect(provider1).toBe(provider2);
  });

  it("gets provider by name", () => {
    const router = new ProviderRouter(testConfig, testCredentials);
    const provider = router.getProvider("anthropic");

    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("throws when no active provider configured", () => {
    const noActiveConfig: LLMConfig = {
      ...testConfig,
      providers: testConfig.providers.map((p) => ({
        ...p,
        isActive: false,
      })),
    };
    const router = new ProviderRouter(noActiveConfig, testCredentials);

    expect(() => router.getChatProvider()).toThrow(LLMError);
  });

  it("throws when no credentials for provider", () => {
    const router = new ProviderRouter(testConfig, {});

    expect(() => router.getChatProvider()).toThrow(LLMError);
  });
});
