// @mixa-ai/ai-pipeline — RAG chat pipeline
// Orchestrates: query → retrieve → pack context → generate → extract citations

import type postgres from "postgres";
import type { ChatScope, Citation } from "@mixa-ai/types";
import type { ProviderRouter } from "./providers/router.js";
import type { ChatMessage } from "./providers/types.js";
import {
  hybridSearch,
  type SearchResult,
  type SearchOptions,
  type SearchResultChunk,
} from "./retriever.js";
import { countTokens } from "./tokenizer.js";

// ── Public types ──────────────────────────────────────────────────

/** Configuration for a RAG query */
export interface RAGOptions {
  /** The user's question or prompt */
  query: string;
  /** The user ID for scoping search to their content */
  userId: string;
  /** Optional scope to limit retrieval to specific projects/tags */
  scope?: ChatScope;
  /** Previous messages for multi-turn conversation context */
  chatHistory?: ChatMessage[];
  /** Maximum tokens to allocate for context chunks (default: 4000) */
  maxContextTokens?: number;
  /** Maximum chunks to retrieve before packing (default: 20) */
  maxRetrievedChunks?: number;
}

/** A context chunk with its citation index and source metadata */
export interface ContextChunk {
  /** Citation index: [1], [2], etc. */
  citationIndex: number;
  /** The chunk text content */
  content: string;
  /** Token count for this chunk */
  tokenCount: number;
  /** Source item ID */
  itemId: string;
  /** Source item title */
  itemTitle: string;
  /** Source item URL */
  itemUrl: string | null;
  /** Source item domain */
  itemDomain: string | null;
  /** Chunk ID */
  chunkId: string;
}

/** Full response from a non-streaming RAG query */
export interface RAGResponse {
  /** The generated response content */
  content: string;
  /** Extracted citations mapped to source items */
  citations: Citation[];
  /** The model used for generation */
  modelUsed: string;
  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Number of context chunks included in the prompt */
  contextChunkCount: number;
}

/** A chunk of a streaming RAG response */
export interface RAGStreamChunk {
  /** The token text */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Citations — only present on the final chunk */
  citations?: Citation[];
}

// ── Constants ─────────────────────────────────────────────────────

const DEFAULT_MAX_CONTEXT_TOKENS = 4000;
const DEFAULT_MAX_RETRIEVED_CHUNKS = 20;
const CITATION_SNIPPET_LENGTH = 200;
const HEADER_TOKEN_ESTIMATE = 20;

const SYSTEM_PROMPT_PREFIX = `You are Mixa, a knowledge assistant. Answer based ONLY on the provided context.
If the context doesn't contain enough information, say so honestly.
Always cite your sources using [N] notation, where N corresponds to the numbered sources below.
Do not fabricate information beyond what is provided.

Context:
`;

const NO_CONTEXT_PROMPT =
  "You are Mixa, a knowledge assistant. The user has no saved knowledge matching this query. Let them know you have no relevant context to draw from, and suggest they save some content first.";

// ── Context window packing ────────────────────────────────────────

/**
 * Pack search result chunks into a context window within the token budget.
 *
 * Strategy:
 * 1. Collect all chunks from search results
 * 2. Score each chunk by (chunk relevance × item relevance)
 * 3. Greedily pack highest-scored chunks within token budget
 * 4. Assign citation indices [1], [2], etc.
 */
export function packContext(
  results: SearchResult[],
  maxTokens: number,
): ContextChunk[] {
  // Flatten all chunks with their parent item metadata
  const candidates: Array<{
    chunk: SearchResultChunk;
    item: SearchResult["item"];
    combinedScore: number;
  }> = [];

  for (const result of results) {
    for (const chunk of result.matchingChunks) {
      candidates.push({
        chunk,
        item: result.item,
        combinedScore: chunk.score * result.score,
      });
    }
  }

  // Sort by combined score descending
  candidates.sort((a, b) => b.combinedScore - a.combinedScore);

  // Greedily pack chunks within token budget
  const packed: ContextChunk[] = [];
  let remainingTokens = maxTokens;
  const seenChunkIds = new Set<string>();
  let citationIndex = 1;

  for (const candidate of candidates) {
    if (seenChunkIds.has(candidate.chunk.id)) continue;

    const chunkTokens = countTokens(candidate.chunk.content);
    const totalNeeded = chunkTokens + HEADER_TOKEN_ESTIMATE;

    if (totalNeeded > remainingTokens) continue;

    packed.push({
      citationIndex,
      content: candidate.chunk.content,
      tokenCount: chunkTokens,
      itemId: candidate.item.id,
      itemTitle: candidate.item.title,
      itemUrl: candidate.item.url,
      itemDomain: candidate.item.domain,
      chunkId: candidate.chunk.id,
    });

    seenChunkIds.add(candidate.chunk.id);
    remainingTokens -= totalNeeded;
    citationIndex++;
  }

  return packed;
}

// ── System prompt construction ────────────────────────────────────

/**
 * Build the system prompt with numbered context sources.
 * Each source is prefixed with [N] and includes the item title + domain.
 */
export function buildSystemPrompt(contextChunks: ContextChunk[]): string {
  if (contextChunks.length === 0) {
    return NO_CONTEXT_PROMPT;
  }

  let prompt = SYSTEM_PROMPT_PREFIX;

  for (const chunk of contextChunks) {
    const source = chunk.itemDomain
      ? `${chunk.itemTitle} \u2014 ${chunk.itemDomain}`
      : chunk.itemTitle;

    prompt += `[${chunk.citationIndex}] (Source: ${source})\n`;
    prompt += `${chunk.content}\n\n`;
  }

  return prompt;
}

// ── Citation extraction ───────────────────────────────────────────

/**
 * Extract citation markers [1], [2], etc. from the LLM response
 * and map them to the corresponding source items/chunks.
 */
export function extractCitations(
  response: string,
  contextChunks: ContextChunk[],
): Citation[] {
  const citationPattern = /\[(\d+)\]/g;
  const seenIndices = new Set<number>();

  let match: RegExpExecArray | null;
  while ((match = citationPattern.exec(response)) !== null) {
    const indexStr = match[1];
    if (indexStr) {
      seenIndices.add(parseInt(indexStr, 10));
    }
  }

  const citations: Citation[] = [];

  for (const index of seenIndices) {
    const chunk = contextChunks.find((c) => c.citationIndex === index);
    if (!chunk) continue;

    citations.push({
      index,
      itemId: chunk.itemId,
      chunkId: chunk.chunkId,
      itemTitle: chunk.itemTitle,
      itemUrl: chunk.itemUrl,
      snippet: chunk.content.slice(0, CITATION_SNIPPET_LENGTH),
    });
  }

  return citations.sort((a, b) => a.index - b.index);
}

// ── Search options from scope ─────────────────────────────────────

function scopeToSearchOptions(
  scope: ChatScope | undefined,
  maxChunks: number,
): SearchOptions {
  const searchOptions: SearchOptions = {
    limit: maxChunks,
    minScore: 0.1,
  };

  if (scope) {
    if (scope.tagIds.length > 0) {
      searchOptions.tagIds = scope.tagIds;
    }
    if (scope.projectIds.length > 0) {
      searchOptions.projectIds = scope.projectIds;
    }
  }

  return searchOptions;
}

// ── Build message array ───────────────────────────────────────────

function buildMessages(
  systemPrompt: string,
  chatHistory: ChatMessage[] | undefined,
  userQuery: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (chatHistory) {
    messages.push(...chatHistory);
  }

  messages.push({ role: "user", content: userQuery });

  return messages;
}

// ── Main pipeline: non-streaming ──────────────────────────────────

/**
 * Perform a RAG query: retrieve → pack context → generate → extract citations.
 *
 * The pipeline:
 * 1. Runs hybrid search to find relevant chunks from the knowledge base
 * 2. Packs the best chunks within the context window token limit
 * 3. Constructs a system prompt with numbered sources
 * 4. Sends the prompt + chat history + user query to the LLM
 * 5. Extracts citations from the response
 * 6. Returns the response with citations and usage metadata
 */
export async function ragQuery(
  sqlClient: postgres.Sql,
  router: ProviderRouter,
  options: RAGOptions,
): Promise<RAGResponse> {
  const maxContextTokens =
    options.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const maxChunks =
    options.maxRetrievedChunks ?? DEFAULT_MAX_RETRIEVED_CHUNKS;

  // 1. Retrieve relevant chunks
  const searchOptions = scopeToSearchOptions(options.scope, maxChunks);
  const searchResults = await hybridSearch(
    sqlClient,
    router,
    options.query,
    options.userId,
    searchOptions,
  );

  // 2. Pack context within token limit
  const contextChunks = packContext(searchResults, maxContextTokens);

  // 3. Build messages
  const systemPrompt = buildSystemPrompt(contextChunks);
  const messages = buildMessages(
    systemPrompt,
    options.chatHistory,
    options.query,
  );

  // 4. Generate response
  const model = router.getActiveChatModel();
  const provider = router.getChatProvider();

  const response = await provider.chat({
    model,
    messages,
    temperature: 0.3,
    maxTokens: 2048,
  });

  // 5. Extract citations
  const citations = extractCitations(response.content, contextChunks);

  return {
    content: response.content,
    citations,
    modelUsed: response.model,
    usage: {
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
    },
    contextChunkCount: contextChunks.length,
  };
}

// ── Main pipeline: streaming ──────────────────────────────────────

/**
 * Stream a RAG response token-by-token.
 *
 * Same pipeline as ragQuery, but yields tokens as they arrive from the LLM.
 * The final chunk includes extracted citations.
 */
export async function* ragStream(
  sqlClient: postgres.Sql,
  router: ProviderRouter,
  options: RAGOptions,
): AsyncGenerator<RAGStreamChunk> {
  const maxContextTokens =
    options.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const maxChunks =
    options.maxRetrievedChunks ?? DEFAULT_MAX_RETRIEVED_CHUNKS;

  // 1. Retrieve relevant chunks
  const searchOptions = scopeToSearchOptions(options.scope, maxChunks);
  const searchResults = await hybridSearch(
    sqlClient,
    router,
    options.query,
    options.userId,
    searchOptions,
  );

  // 2. Pack context within token limit
  const contextChunks = packContext(searchResults, maxContextTokens);

  // 3. Build messages
  const systemPrompt = buildSystemPrompt(contextChunks);
  const messages = buildMessages(
    systemPrompt,
    options.chatHistory,
    options.query,
  );

  // 4. Stream response
  const model = router.getActiveChatModel();
  const provider = router.getChatProvider();

  let fullContent = "";

  for await (const chunk of provider.stream({
    model,
    messages,
    temperature: 0.3,
    maxTokens: 2048,
  })) {
    fullContent += chunk.content;

    if (chunk.done) {
      const citations = extractCitations(fullContent, contextChunks);
      yield { content: chunk.content, done: true, citations };
    } else {
      yield { content: chunk.content, done: false };
    }
  }
}
