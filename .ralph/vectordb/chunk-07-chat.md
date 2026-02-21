# Chunk 07 — Chat & RAG

## RAG Pipeline

```
User Query
    ↓
Embed Query (same model as content embeddings)
    ↓
Hybrid Search (vector + FTS) → Top 10-20 chunks
    ↓
Rerank (optional, by relevance to query)
    ↓
Context Window Packing (fit chunks within model limit)
    ↓
System Prompt + Context Chunks + User Query → LLM
    ↓
Streaming Response with Citation Markers [1], [2]...
    ↓
Parse Citations → Map to Source Items
    ↓
Display Response + Clickable Citation Links
```

## System Prompt Template
```
You are Mixa, a knowledge assistant. Answer based ONLY on the provided context.
If the context doesn't contain enough information, say so.
Always cite your sources using [N] notation.

Context:
[1] {chunk from item "Article Title" - domain.com}
{chunk content}

[2] {chunk from item "Another Article" - otherdomain.com}
{chunk content}

...
```

## Chat Scoping
- Default: search ALL saved content
- User can scope to: specific project(s), specific tag(s), specific item(s)
- Scope stored in `conversations.scope` (JSONB)

## Conversation Persistence
- Conversations stored in `conversations` table
- Messages in `messages` table with role, content, citations, model_used
- Resume past conversations by loading message history
- Auto-title: generate conversation title from first user message

## Chat UI Requirements
- Full-height interface in Chat tab
- Message input at bottom (Enter to send, Shift+Enter for newline)
- Markdown rendering in responses (code blocks, lists, links, tables)
- Streaming: tokens appear as generated, typing indicator
- Citations: clickable chips below response → open source in Knowledge/Web tab
- Conversation sidebar: list of past chats, click to resume
- Scope selector: dropdown with projects/tags
