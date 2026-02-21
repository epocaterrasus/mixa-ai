# Chunk 06 — AI Pipeline (RAG, Embeddings, LLM)

**CRITICAL: Mixa provides ZERO AI compute. All AI features use whatever LLM the user plugs in via their own API keys or local models. If no LLM is configured, AI features are simply disabled — the app still works for browsing, terminal, canvas, etc.**

## LLM Provider Abstraction (BYOK — Mandatory)

### Interface
```typescript
interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
  embed(texts: string[]): Promise<number[][]>;
}
```

### Supported Providers
| Provider | Models | Embedding |
|----------|--------|-----------|
| OpenAI | gpt-4o, gpt-4o-mini | text-embedding-3-small (1536d) |
| Anthropic | claude-3.5-sonnet, claude-3-haiku | Via OpenAI or voyage |
| Ollama (local) | Any pulled model | nomic-embed-text |
| Gemini | gemini-2.0-flash | text-embedding-004 |

### API Key Storage
- Keys stored in Electron safeStorage (OS keychain)
- Never logged, never transmitted to Mixa servers
- Validated on save (test API call)

## Text Chunking
- Target: 512 tokens per chunk with 50 token overlap
- Respect paragraph and sentence boundaries
- Token counting via tiktoken (cl100k_base tokenizer)
- Each chunk gets embedding vector (1536 dimensions)

## Embedding Pipeline
1. Content captured → item created in DB
2. BullMQ job queued: `embed-item`
3. Worker: split content → chunk → embed each chunk via provider
4. Store chunks + embeddings in `chunks` table (pgvector)
5. Queue next job: `summarize-tag-item`

## Auto-Summarize + Auto-Tag
1. BullMQ job: `summarize-tag-item`
2. Worker: send content to LLM with structured prompt
3. LLM returns JSON: { summary: string, tags: string[] }
4. Summary stored in `items.summary`
5. Tags created/matched in `tags` table, linked via `item_tags` with confidence score
6. Uses cheapest model (gpt-4o-mini or haiku)

## Hybrid Search
- **Vector search**: embed query → cosine similarity against chunks.embedding → top K
- **Full-text search**: PostgreSQL tsvector with ts_rank
- **Hybrid scoring**: weighted combination (default: 0.7 vector + 0.3 FTS)
- **Filters**: tags, projects, date range, item_type
- **Performance target**: <500ms for 10,000 items
