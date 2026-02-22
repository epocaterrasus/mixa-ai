// @mixa-ai/ai-pipeline — LLM provider common interface

import type { LLMProviderName } from "@mixa-ai/types";

/** Configuration to instantiate an LLM provider */
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  /** Custom fetch implementation (e.g. Electron net.fetch) to bypass node-fetch issues */
  fetch?: typeof globalThis.fetch;
}

/** A message in a chat conversation */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Options for a chat completion request */
export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/** Response from a chat completion request */
export interface ChatResponse {
  content: string;
  model: string;
  usage: TokenUsage;
}

/** Token usage information */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Options for an embedding request */
export interface EmbedOptions {
  model: string;
  input: string | string[];
}

/** Response from an embedding request */
export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/** A chunk of streaming response */
export interface StreamChunk {
  content: string;
  done: boolean;
}

/** Common interface all LLM provider adapters must implement */
export interface LLMProviderAdapter {
  readonly name: LLMProviderName;

  /** Send a chat completion request and get a full response */
  chat(options: ChatOptions): Promise<ChatResponse>;

  /** Generate embeddings for input text(s) */
  embed(options: EmbedOptions): Promise<EmbedResponse>;

  /** Stream a chat completion response token-by-token */
  stream(options: ChatOptions): AsyncIterable<StreamChunk>;
}
