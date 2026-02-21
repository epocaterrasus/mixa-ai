// @mixa-ai/ai-pipeline — Provider router (selects provider based on user settings)

import type { LLMProviderName, LLMConfig } from "@mixa-ai/types";
import type { LLMProviderAdapter, ProviderConfig } from "./types.js";
import { OpenAIProvider, OPENAI_CHAT_MODELS, OPENAI_EMBEDDING_MODELS } from "./openai.js";
import { AnthropicProvider, ANTHROPIC_CHAT_MODELS } from "./anthropic.js";
import { OllamaProvider, OLLAMA_COMMON_MODELS } from "./ollama.js";
import { GeminiProvider, GEMINI_CHAT_MODELS, GEMINI_EMBEDDING_MODELS } from "./gemini.js";
import { LLMError } from "./errors.js";

/** Map of provider name to factory function */
const PROVIDER_FACTORIES: Record<
  LLMProviderName,
  (config: ProviderConfig) => LLMProviderAdapter
> = {
  openai: (config) => new OpenAIProvider(config),
  anthropic: (config) => new AnthropicProvider(config),
  ollama: (config) => new OllamaProvider(config),
  gemini: (config) => new GeminiProvider(config),
};

/** Default available models per provider */
export const DEFAULT_MODELS: Record<LLMProviderName, readonly string[]> = {
  openai: OPENAI_CHAT_MODELS,
  anthropic: ANTHROPIC_CHAT_MODELS,
  ollama: OLLAMA_COMMON_MODELS,
  gemini: GEMINI_CHAT_MODELS,
};

/** Default embedding models per provider */
export const DEFAULT_EMBEDDING_MODELS: Record<LLMProviderName, readonly string[]> = {
  openai: OPENAI_EMBEDDING_MODELS,
  anthropic: [],
  ollama: ["nomic-embed-text"],
  gemini: GEMINI_EMBEDDING_MODELS,
};

/** Create a provider adapter from a provider name and config */
export function createProvider(
  name: LLMProviderName,
  config: ProviderConfig,
): LLMProviderAdapter {
  const factory = PROVIDER_FACTORIES[name];
  return factory(config);
}

/** Provider credentials keyed by provider name */
export type ProviderCredentials = Partial<
  Record<LLMProviderName, ProviderConfig>
>;

/**
 * Provider router that selects the correct provider based on LLM configuration.
 * Maintains a cache of instantiated providers.
 */
export class ProviderRouter {
  private readonly providers = new Map<LLMProviderName, LLMProviderAdapter>();
  private readonly credentials: ProviderCredentials;
  private readonly config: LLMConfig;

  constructor(config: LLMConfig, credentials: ProviderCredentials) {
    this.config = config;
    this.credentials = credentials;
  }

  /** Get the active chat provider based on config */
  getChatProvider(): LLMProviderAdapter {
    const activeProvider = this.config.providers.find((p) => p.isActive);
    if (!activeProvider) {
      throw new LLMError("No active LLM provider configured", "openai");
    }
    return this.getOrCreate(activeProvider.name);
  }

  /** Get the embedding provider based on config */
  getEmbeddingProvider(): LLMProviderAdapter {
    return this.getOrCreate(this.config.embeddingProvider);
  }

  /** Get a specific provider by name */
  getProvider(name: LLMProviderName): LLMProviderAdapter {
    return this.getOrCreate(name);
  }

  /** Get the active chat model name */
  getActiveChatModel(): string {
    const activeProvider = this.config.providers.find((p) => p.isActive);
    if (!activeProvider) {
      throw new LLMError("No active LLM provider configured", "openai");
    }
    return activeProvider.selectedModel;
  }

  /** Get the configured embedding model */
  getEmbeddingModel(): string {
    return this.config.embeddingModel;
  }

  private getOrCreate(name: LLMProviderName): LLMProviderAdapter {
    const cached = this.providers.get(name);
    if (cached) return cached;

    const creds = this.credentials[name];
    if (!creds) {
      throw new LLMError(
        `No credentials configured for provider "${name}"`,
        name,
      );
    }

    const provider = createProvider(name, creds);
    this.providers.set(name, provider);
    return provider;
  }
}
