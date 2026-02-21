# Chunk 01 — Tech Stack & Monorepo

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33+ |
| Frontend | React 19 + TypeScript + shadcn/ui + Tailwind CSS |
| Internal API | tRPC v11 (IPC transport, not HTTP) |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle ORM |
| Queue | Redis 7 + BullMQ |
| Engine | Go 1.22+ binary (Fenix) |
| Engine IPC | gRPC (protobuf) |
| Terminal renderer | Custom React components |
| Monorepo | Turborepo + pnpm |
| Go build | Makefile |
| Packaging | electron-builder |
| CI/CD | GitHub Actions |

## Monorepo Structure

```
mixa-ai/
├── apps/
│   ├── desktop/               # Electron browser app
│   └── web/                   # Next.js marketing + dashboard
├── engine/                    # Fenix Go engine (sidecar)
│   ├── cmd/fenix/main.go
│   ├── internal/              # All Go modules
│   └── pkg/proto/             # Protobuf definitions
├── packages/
│   ├── ui/                    # Shared React components (shadcn)
│   ├── types/                 # Shared TypeScript types
│   ├── ai-pipeline/           # RAG, embeddings, LLM adapters
│   ├── terminal-renderer/     # Fenix UI → React components
│   ├── content-processor/     # Web content extraction
│   └── db/                    # Drizzle schema + migrations
├── docker/                    # Docker Compose
├── Makefile                   # Go engine + turbo orchestration
└── turbo.json
```

## Key Conventions
- TypeScript strict mode everywhere, NEVER use `any`
- Electron security: contextBridge + preload, never nodeIntegration
- Go standard project layout
- All tests must pass before commit
