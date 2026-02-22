// @mixa-ai/ai-pipeline — OpenAI provider adapter

import OpenAI from "openai";
import type {
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
  LLMProviderUnavailableError,
  LLMRateLimitError,
} from "./errors.js";

/** Models supported by the OpenAI adapter */
export const OPENAI_CHAT_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "o4-mini",
  "gpt-4-turbo",
] as const;

export const OPENAI_EMBEDDING_MODELS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
] as const;

export class OpenAIProvider implements LLMProviderAdapter {
  readonly name = "openai" as const;
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error("No completion choice returned");
      }

      return {
        content: choice.message.content ?? "",
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async embed(options: EmbedOptions): Promise<EmbedResponse> {
    try {
      const input = Array.isArray(options.input)
        ? options.input
        : [options.input];

      const response = await this.client.embeddings.create({
        model: options.model,
        input,
      });

      return {
        embeddings: response.data.map((d) => d.embedding),
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async *stream(options: ChatOptions): AsyncIterable<StreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content ?? "";
        const done = chunk.choices[0]?.finish_reason !== null;

        if (content || done) {
          yield { content, done };
        }
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401 || error.status === 403) {
        return new LLMAuthenticationError("openai");
      }
      if (error.status === 429) {
        const retryAfter = error.headers?.["retry-after"];
        const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        return new LLMRateLimitError("openai", retryMs);
      }
    }
    if (isConnectionError(error)) {
      return new LLMProviderUnavailableError("openai", error);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
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
