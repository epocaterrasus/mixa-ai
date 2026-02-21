# @mixa-ai/db

Database schema and client for Mixa AI's knowledge store, built with Drizzle ORM targeting PostgreSQL.

## Architecture

```
src/
├── schema/
│   ├── users.ts          # User accounts
│   ├── items.ts          # Knowledge items (articles, highlights, code, etc.)
│   ├── chunks.ts         # Text chunks with pgvector embeddings
│   ├── tags.ts           # Tags
│   ├── item-tags.ts      # Item-tag junction (with relevance score)
│   ├── projects.ts       # Projects
│   ├── item-projects.ts  # Item-project junction
│   ├── highlights.ts     # Text highlights with selector data
│   ├── conversations.ts  # Chat conversations
│   ├── messages.ts       # Chat messages (user + assistant)
│   └── index.ts          # Re-exports all tables
├── client.ts             # Drizzle client factory
├── seed.ts               # Sample data seeder
└── index.ts
```

## Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `items` | Knowledge items — articles, highlights, code, etc. |
| `chunks` | Text chunks with embedding vectors (pgvector `vector(1536)`) |
| `tags` | Topic tags with colors |
| `item_tags` | Item-tag junction with confidence `score` (0-1) |
| `projects` | Named projects for organizing items |
| `item_projects` | Item-project junction |
| `highlights` | Text selections with notes and CSS selector data |
| `conversations` | Chat conversations with JSONB scope (projects, tags, items) |
| `messages` | Chat messages with role, content, citations (JSONB), model info |

### Key Indexes

- **Full-text search**: GIN index on `to_tsvector('english', title || content_text)` for items
- **Vector search**: IVFFlat index on `chunks.embedding` with `vector_cosine_ops` for pgvector
- **Foreign keys**: B-tree indexes on all foreign key columns

### Items Table

The central table. Each item has:

- `item_type`: article, highlight, youtube, pdf, code, image, terminal
- `source_type`: manual, auto_capture, extension, terminal
- `content_text` (plain text) + `content_html` (sanitized HTML)
- `summary` (AI-generated), `word_count`, `reading_time`
- `domain`, `favicon_url`, `thumbnail_url` (extracted from source)
- `is_archived`, `is_favorite` flags

### Chunks Table

Each item is split into chunks for RAG retrieval:

- `chunk_index` — ordering within the item
- `content` — chunk text
- `token_count` — number of tokens
- `embedding` — `vector(1536)` for cosine similarity search

## Client

```typescript
import { createDbClient } from '@mixa-ai/db';

const { db, sql } = createDbClient(process.env.DATABASE_URL);
// db: Drizzle ORM instance
// sql: postgres-js connection (for raw queries)
```

Default connection: `postgres://mixa:mixa@localhost:5432/mixa`

## Commands

```bash
pnpm build            # Build the package
pnpm db:generate      # Generate Drizzle client from schema
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed sample data
pnpm db:studio        # Open Drizzle Studio (visual DB browser)
```

## Docker (Optional)

An external PostgreSQL + Redis setup is available for development:

```bash
cd docker
docker compose -f docker-compose.dev.yml up -d    # Start PostgreSQL 16 + pgvector + Redis 7
docker compose -f docker-compose.dev.yml down      # Stop
```

PGlite (embedded PostgreSQL via WASM) is the primary approach — Docker is optional.

## Dependencies

- `drizzle-orm` — TypeScript ORM
- `postgres` — PostgreSQL driver (postgres.js)
