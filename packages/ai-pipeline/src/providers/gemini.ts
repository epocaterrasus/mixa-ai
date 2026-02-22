// @mixa-ai/ai-pipeline — Google Gemini provider adapter

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

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

/** Models supported by the Gemini adapter */
export const GEMINI_CHAT_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
] as const;

export const GEMINI_EMBEDDING_MODELS = [
  "text-embedding-004",
] as const;

/** Gemini API content part */
interface GeminiPart {
  text: string;
}

/** Gemini API content */
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** Gemini generateContent response */
interface GeminiGenerateResponse {
  candidates: Array<{
    content: { parts: GeminiPart[] };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

/** Gemini embedContent response */
interface GeminiEmbedResponse {
  embedding: { values: number[] };
}

/** Gemini batchEmbedContents response */
interface GeminiBatchEmbedResponse {
  embeddings: Array<{ values: number[] }>;
}

export class GeminiProvider implements LLMProviderAdapter {
  readonly name = "gemini" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? GEMINI_BASE_URL).replace(/\/+$/, "");
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { systemInstruction, contents } = convertMessages(options.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          maxOutputTokens: options.maxTokens,
        }),
      },
    };

    if (systemInstruction) {
      body["systemInstruction"] = {
        parts: [{ text: systemInstruction }],
      };
    }

    const data = await this.request<GeminiGenerateResponse>(
      `/models/${options.model}:generateContent`,
      body,
    );

    const candidate = data.candidates[0];
    if (!candidate) {
      throw new LLMError("No candidate returned from Gemini", "gemini");
    }

    const text = candidate.content.parts
      .map((p) => p.text)
      .join("");

    return {
      content: text,
      model: data.modelVersion ?? options.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async embed(options: EmbedOptions): Promise<EmbedResponse> {
    const inputs = Array.isArray(options.input)
      ? options.input
      : [options.input];

    if (inputs.length === 1) {
      const data = await this.request<GeminiEmbedResponse>(
        `/models/${options.model}:embedContent`,
        {
          content: { parts: [{ text: inputs[0] }] },
        },
      );

      return {
        embeddings: [data.embedding.values],
        model: options.model,
        usage: { promptTokens: 0, totalTokens: 0 },
      };
    }

    const data = await this.request<GeminiBatchEmbedResponse>(
      `/models/${options.model}:batchEmbedContents`,
      {
        requests: inputs.map((text) => ({
          model: `models/${options.model}`,
          content: { parts: [{ text }] },
        })),
      },
    );

    return {
      embeddings: data.embeddings.map((e) => e.values),
      model: options.model,
      usage: { promptTokens: 0, totalTokens: 0 },
    };
  }

  async *stream(options: ChatOptions): AsyncIterable<StreamChunk> {
    const { systemInstruction, contents } = convertMessages(options.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          maxOutputTokens: options.maxTokens,
        }),
      },
    };

    if (systemInstruction) {
      body["systemInstruction"] = {
        parts: [{ text: systemInstruction }],
      };
    }

    const url = `${this.baseUrl}/models/${options.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LLMProviderUnavailableError("gemini", error);
    }

    if (!response.ok) {
      this.handleHttpError(response.status);
    }

    if (!response.body) {
      throw new LLMError("Gemini streaming response has no body", "gemini");
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
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const parsed = JSON.parse(json) as GeminiGenerateResponse;
          const candidate = parsed.candidates[0];
          if (!candidate) continue;

          const text = candidate.content.parts
            .map((p) => p.text)
            .join("");

          const done =
            candidate.finishReason !== null &&
            candidate.finishReason !== "" &&
            candidate.finishReason !== "STOP" ? false :
            candidate.finishReason === "STOP";

          yield { content: text, done };
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: "", done: true };
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LLMProviderUnavailableError("gemini", error);
    }

    if (!response.ok) {
      this.handleHttpError(response.status);
    }

    return (await response.json()) as T;
  }

  private handleHttpError(status: number): never {
    if (status === 401 || status === 403) {
      throw new LLMAuthenticationError("gemini");
    }
    if (status === 429) {
      throw new LLMRateLimitError("gemini");
    }
    throw new LLMError(`Gemini returned HTTP ${status}`, "gemini");
  }
}

/** Convert ChatMessage[] to Gemini's content format, extracting system messages */
function convertMessages(messages: ChatMessage[]): {
  systemInstruction: string | undefined;
  contents: GeminiContent[];
} {
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const systemInstruction =
    systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join("\n\n")
      : undefined;

  const contents: GeminiContent[] = nonSystemMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return { systemInstruction, contents };
}
