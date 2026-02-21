# Mixa AI — Claude Code Context

## What is Mixa AI?

Mixa AI is a **developer browser** — an Electron-based desktop application built on Chromium that unifies web browsing, knowledge management, infrastructure tooling, and AI assistance into a single experience.

**Core thesis:** The browser is the developer's most-used app, but it knows nothing about their work. The terminal is the developer's most powerful tool, but it's trapped in 1970s rendering. Mixa merges them: a browser that understands your stack, a terminal that renders like a web app, and an AI layer that connects everything.

## Key Concepts

- **Tab types**: Web (Chromium pages), Terminal (web-rendered Fenix engine), Knowledge (saved items), Chat (RAG), Dashboard (infra viz), Settings
- **Fenix Engine**: Go binary running as a local sidecar, providing infrastructure modules (secrets, Git, costs, health, etc.) via gRPC
- **Fenix UI Protocol**: Structured JSON protocol from Go engine → React components (tables, charts, cards — not ANSI codes)
- **Knowledge capture**: One-click save from any web page, AI auto-organize, semantic search, RAG chat
- **BYOK**: Bring Your Own Key — users configure their own LLM providers (OpenAI, Anthropic, Ollama, Gemini)

## Tech Stack

- **Desktop**: Electron 33+ (Chromium), React 19, TypeScript, shadcn/ui + Tailwind
- **API**: tRPC v11 (IPC-based, not HTTP)
- **Database**: PostgreSQL 16 + pgvector, Drizzle ORM
- **Queue**: Redis + BullMQ
- **Engine**: Go 1.22+, gRPC, encrypted SQLite
- **Monorepo**: Turborepo + pnpm
- **Terminal renderer**: Custom React components
- **AI**: LLM provider abstraction with OpenAI/Anthropic/Ollama/Gemini adapters

## Project Structure

```
mixa-ai/
├── .ralph/                    # AI orchestration brain (Ralph Wiggum system)
├── apps/desktop/              # Electron browser app
├── apps/web/                  # Next.js marketing + hosted dashboard
├── engine/                    # Fenix Go engine (sidecar binary)
├── packages/ui/               # Shared React components
├── packages/types/            # Shared TypeScript types
├── packages/ai-pipeline/      # RAG, embeddings, LLM adapters
├── packages/terminal-renderer/ # Web-based terminal renderer
├── packages/content-processor/ # Web content extraction
├── packages/db/               # Drizzle schema + migrations
├── docker/                    # Docker Compose files
├── scripts/ralph.sh           # Ralph Wiggum autonomous build loop
├── AGENTS.md                  # Build/test commands
└── Makefile                   # Top-level build orchestration
```

## Ralph Wiggum System

This project uses autonomous AI development via the Ralph Wiggum loop:
- `.ralph/prd.json` — 40 tasks with acceptance criteria
- `.ralph/IMPLEMENTATION_PLAN.md` — priority-ordered task board
- `.ralph/agents/TEAM.md` — 6 agent roles (context-switching hats)
- `scripts/ralph.sh` — bash loop that runs Claude Code iterations

Run `./scripts/ralph.sh 20 build` to start autonomous development.

## Current Phase

Phase 0-1: Foundation + Browser MVP. Setting up monorepo, shared types, database, Electron shell, and Go engine skeleton.

## Key Documents

- `docs/prd/PRD.md` — Full product requirements (unified vision)
- `.ralph/prd.json` — Structured task list (40 tasks)
- `.ralph/IMPLEMENTATION_PLAN.md` — Current sprint priorities
- `AGENTS.md` — Build/test commands for all packages
