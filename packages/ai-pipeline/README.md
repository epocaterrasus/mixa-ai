# @mixa-ai/ai-pipeline

RAG (Retrieval-Augmented Generation) pipeline, LLM provider abstraction, text chunking, embedding generation, and semantic search.

## Architecture

```
src/
├── providers/
│   ├── types.ts          # LLMProviderAdapter interface
│   ├── errors.ts         # LLMError hierarchy
│   ├── openai.ts         # OpenAI adapter (chat + embeddings)
│   ├── anthropic.ts      # Anthropic adapter (chat only)
│   ├── ollama.ts         # Ollama adapter (chat + embeddings)
│   ├── gemini.ts         # Gemini adapter (chat + embeddings)
│   ├── router.ts         # ProviderRouter — provider selection
│   └── index.ts
├── chunker.ts            # Text chunking (paragraph/sentence boundaries)
├── embedder.ts           # Batched embedding generation
├── retriever.ts          # Hybrid search (pgvector + PostgreSQL FTS)
├── pipeline.ts           # Full RAG pipeline orchestration
├── summarizer.ts         # AI-powered summarization + tagging
├── tag-normalizer.ts     # Tag normalization and deduplication
├── tokenizer.ts          # Token counting (js-tiktoken)
├── queue.ts              # BullMQ embedding queue
├── summarize-queue.ts    # BullMQ summarization queue
└── index.ts
```

## Provider Abstraction (BYOK)

All LLM providers implement a common interface:

```typescript
interface LLMProviderAdapter {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  chatStream?(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
  embed?(texts: string[], options?: EmbedOptions): Promise<number[][]>;
}
```

### Supported Providers

| Provider | Chat | Embeddings | Default Model |
|----------|------|------------|---------------|
| OpenAI | Yes | Yes | gpt-4o-mini |
| Anthropic | Yes | No | claude-3.5-sonnet |
| Gemini | Yes | Yes | gemini-2.0-flash |
| Ollama | Yes | Yes | llama3.2 (local) |

### Provider Router

The `ProviderRouter` lazily instantiates providers based on user settings:

```typescript
const router = new ProviderRouter(settings);
const chatProvider = router.getChatProvider();
const embedProvider = router.getEmbeddingProvider();
```

## Text Chunking

`chunkText(text, options?)` splits text into semantically meaningful chunks:

- **Target size**: 512 tokens (configurable)
- **Overlap**: 50 tokens between consecutive chunks (configurable)
- **Boundary-aware**: splits on paragraph (`\n\n`) then sentence boundaries
- **Short text**: returns a single chunk if the text fits within the target

```typescript
const chunks = chunkText(articleText, { targetTokens: 512, overlapTokens: 50 });
// Returns: TextChunk[] with { text, startOffset, endOffset, tokenCount }
```

## Embedding Generation

`embedChunks(router, chunks, options?)` generates embedding vectors:

- Batches chunks (default 20 per batch) for efficiency
- Uses the configured embedding provider (OpenAI `text-embedding-3-small` by default)
- Returns `EmbeddedChunk[]` with vector paired to each chunk

## Hybrid Search

`hybridSearch(sql, router, query, userId, options?)` combines two search strategies:

1. **Vector search**: embeds the query, searches `chunks` table using pgvector cosine distance (`<=>`)
2. **Full-text search**: PostgreSQL `tsvector`/`plainto_tsquery` with `ts_rank` scoring

Results are merged and scored: `0.7 * vectorScore + 0.3 * ftsScore` (configurable weights).

### Search Filters

- Tags (by tag ID)
- Projects (by project ID)
- Item types (article, highlight, code, etc.)
- Date range

## RAG Pipeline

`ragQuery(sql, router, options)` and `ragStream(sql, router, options)` orchestrate the full pipeline:

1. **Retrieve** — hybrid search for relevant chunks
2. **Pack context** — greedy token-budget packing (4000 tokens), sorted by relevance
3. **Prompt** — system prompt instructing the LLM to cite sources using `[N]` notation
4. **Generate** — LLM call (temperature 0.3, max 2048 tokens)
5. **Extract citations** — regex extraction of `[N]` markers mapped to source items

```typescript
const result = await ragQuery(sql, router, {
  query: "How does authentication work?",
  userId: "user-123",
  scope: { projectIds: ["proj-1"] },
});
// result.answer: string with [1], [2] citations
// result.citations: Citation[] with itemId, chunkId, snippet
```

## Auto-Summarization & Tagging

`summarizeAndTag(router, content, options?)` generates:

- **Summary**: 2-3 sentence overview of the content
- **Tags**: 3-7 topic labels with confidence scores (0-1)

Uses the cheapest available model (gpt-4o-mini, claude-3-haiku, llama3.2, or gemini-2.0-flash-lite). Returns `null` on failure (never blocks content capture).

## Job Queues

Two BullMQ queues for async processing (requires Redis):

- `EMBEDDING_QUEUE` — processes embedding generation after content capture
- `SUMMARIZE_QUEUE` — processes summarization + tagging after embeddings complete

Both support retry with exponential backoff (max 3 retries).

## Testing

```bash
pnpm test         # Run all tests (mocked HTTP responses)
pnpm typecheck    # Type check
pnpm build        # Build
```

Tests use mocked LLM responses — no API keys needed for running tests.
