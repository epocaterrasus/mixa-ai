// @mixa-ai/ai-pipeline — RAG, embeddings, LLM adapters

export {
  // Types
  type ProviderConfig,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
  type TokenUsage,
  type EmbedOptions,
  type EmbedResponse,
  type StreamChunk,
  type LLMProviderAdapter,
  type ProviderCredentials,
  // Errors
  LLMError,
  LLMProviderUnavailableError,
  LLMRateLimitError,
  LLMAuthenticationError,
  // Providers
  OpenAIProvider,
  OPENAI_CHAT_MODELS,
  OPENAI_EMBEDDING_MODELS,
  AnthropicProvider,
  ANTHROPIC_CHAT_MODELS,
  OllamaProvider,
  OLLAMA_COMMON_MODELS,
  GeminiProvider,
  GEMINI_CHAT_MODELS,
  GEMINI_EMBEDDING_MODELS,
  // Router
  createProvider,
  ProviderRouter,
  DEFAULT_MODELS,
  DEFAULT_EMBEDDING_MODELS,
} from "./providers/index.js";
