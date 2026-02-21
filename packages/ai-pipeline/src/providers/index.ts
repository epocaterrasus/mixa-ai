// @mixa-ai/ai-pipeline — Providers barrel export

export type {
  ProviderConfig,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  TokenUsage,
  EmbedOptions,
  EmbedResponse,
  StreamChunk,
  LLMProviderAdapter,
} from "./types.js";

export {
  LLMError,
  LLMProviderUnavailableError,
  LLMRateLimitError,
  LLMAuthenticationError,
} from "./errors.js";

export { OpenAIProvider, OPENAI_CHAT_MODELS, OPENAI_EMBEDDING_MODELS } from "./openai.js";
export { AnthropicProvider, ANTHROPIC_CHAT_MODELS } from "./anthropic.js";
export { OllamaProvider, OLLAMA_COMMON_MODELS } from "./ollama.js";
export { GeminiProvider, GEMINI_CHAT_MODELS, GEMINI_EMBEDDING_MODELS } from "./gemini.js";

export {
  createProvider,
  ProviderRouter,
  DEFAULT_MODELS,
  DEFAULT_EMBEDDING_MODELS,
} from "./router.js";
export type { ProviderCredentials } from "./router.js";
