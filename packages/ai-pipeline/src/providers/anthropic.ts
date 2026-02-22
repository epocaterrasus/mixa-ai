// @mixa-ai/ai-pipeline — Anthropic provider adapter

import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  EmbedOptions,
  EmbedResponse,
  LLMProviderAdapter,
  ProviderConfig,
  StreamChunk,
} from "./types.js";
import {
  LLMAuthenticationError,
  LLMError,
  LLMProviderUnavailableError,
  LLMRateLimitError,
} from "./errors.js";

/** Models supported by the Anthropic adapter */
export const ANTHROPIC_CHAT_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "claude-haiku-4-20250414",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-3-haiku-20240307",
] as const;

export class AnthropicProvider implements LLMProviderAdapter {
  readonly name = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl ?? undefined,
    });
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const { systemMessage, messages } = extractSystemMessage(
        options.messages,
      );

      const response = await this.client.messages.create({
        model: options.model,
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        system: systemMessage,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
      });

      const textBlock = response.content.find((c) => c.type === "text");

      return {
        content: textBlock ? textBlock.text : "",
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async embed(_options: EmbedOptions): Promise<EmbedResponse> {
    throw new LLMError(
      "Anthropic does not support embedding generation — use OpenAI or Ollama for embeddings",
      "anthropic",
    );
  }

  async *stream(options: ChatOptions): AsyncIterable<StreamChunk> {
    try {
      const { systemMessage, messages } = extractSystemMessage(
        options.messages,
      );

      const stream = this.client.messages.stream({
        model: options.model,
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        system: systemMessage,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { content: event.delta.text, done: false };
        }
        if (event.type === "message_stop") {
          yield { content: "", done: true };
        }
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401 || error.status === 403) {
        return new LLMAuthenticationError("anthropic");
      }
      if (error.status === 429) {
        return new LLMRateLimitError("anthropic");
      }
    }
    if (isConnectionError(error)) {
      return new LLMProviderUnavailableError("anthropic", error);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}

/** Extract system message from message array (Anthropic uses a separate system param) */
function extractSystemMessage(messages: ChatMessage[]): {
  systemMessage: string | undefined;
  messages: ChatMessage[];
} {
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  return {
    systemMessage:
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join("\n\n")
        : undefined,
    messages: nonSystemMessages,
  };
}

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed")
  );
}
