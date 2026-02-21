// @mixa-ai/ai-pipeline — LLM provider error types

import type { LLMProviderName } from "@mixa-ai/types";

/** Base error for all LLM provider issues */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderName,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/** Provider is unavailable (connection refused, timeout, DNS failure) */
export class LLMProviderUnavailableError extends LLMError {
  constructor(provider: LLMProviderName, cause?: unknown) {
    super(`LLM provider "${provider}" is unavailable`, provider, cause);
    this.name = "LLMProviderUnavailableError";
  }
}

/** Rate limit exceeded (HTTP 429) */
export class LLMRateLimitError extends LLMError {
  constructor(
    provider: LLMProviderName,
    public readonly retryAfterMs?: number,
  ) {
    super(`LLM provider "${provider}" rate limit exceeded`, provider);
    this.name = "LLMRateLimitError";
  }
}

/** Invalid or missing API key (HTTP 401/403) */
export class LLMAuthenticationError extends LLMError {
  constructor(provider: LLMProviderName) {
    super(
      `LLM provider "${provider}" authentication failed — check your API key`,
      provider,
    );
    this.name = "LLMAuthenticationError";
  }
}
