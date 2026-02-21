// @mixa-ai/ai-pipeline — Ollama provider adapter (local LLM)

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
  LLMError,
  LLMProviderUnavailableError,
} from "./errors.js";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

/** Models commonly available in Ollama (user can configure any installed model) */
export const OLLAMA_COMMON_MODELS = [
  "llama3.2",
  "llama3.1",
  "mistral",
  "codellama",
  "nomic-embed-text",
] as const;

/** Shape of Ollama /api/chat response */
interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

/** Shape of Ollama /api/embed response */
interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
  prompt_eval_count?: number;
}

export class OllamaProvider implements LLMProviderAdapter {
  readonly name = "ollama" as const;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const body = {
      model: options.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          num_predict: options.maxTokens,
        }),
      },
    };

    const data = await this.request<OllamaChatResponse>(
      "/api/chat",
      body,
    );

    return {
      content: data.message.content,
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }

  async embed(options: EmbedOptions): Promise<EmbedResponse> {
    const input = Array.isArray(options.input)
      ? options.input
      : [options.input];

    const data = await this.request<OllamaEmbedResponse>(
      "/api/embed",
      {
        model: options.model,
        input,
      },
    );

    return {
      embeddings: data.embeddings,
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        totalTokens: data.prompt_eval_count ?? 0,
      },
    };
  }

  async *stream(options: ChatOptions): AsyncIterable<StreamChunk> {
    const body = {
      model: options.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      options: {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          num_predict: options.maxTokens,
        }),
      },
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LLMProviderUnavailableError("ollama", error);
    }

    if (!response.ok) {
      throw new LLMError(
        `Ollama returned HTTP ${response.status}`,
        "ollama",
      );
    }

    if (!response.body) {
      throw new LLMError("Ollama response has no body", "ollama");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = JSON.parse(trimmed) as OllamaChatResponse;
          yield {
            content: parsed.message.content,
            done: parsed.done,
          };
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const parsed = JSON.parse(buffer.trim()) as OllamaChatResponse;
        yield {
          content: parsed.message.content,
          done: parsed.done,
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LLMProviderUnavailableError("ollama", error);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new LLMError(
        `Ollama returned HTTP ${response.status}: ${text}`,
        "ollama",
      );
    }

    return (await response.json()) as T;
  }
}
