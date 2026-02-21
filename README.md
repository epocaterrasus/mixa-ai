# Mixa AI

Developer browser that unifies web browsing, knowledge management, infrastructure tooling, and AI assistance into one Electron-based desktop application.

```
+---------------------------------------------------------------------+
|  Mixa AI Desktop                                                     |
|  +----------+------------------------------------------------------+|
|  |          |  [<] [>] [R] [ https://example.com          ] [+]    ||
|  | Sidebar  |------------------------------------------------------||
|  |          |  Tab 1  |  Tab 2  |  Terminal  |  Chat  |  Knowledge  ||
|  | Tabs     |------------------------------------------------------||
|  | Terminal |                                                       ||
|  | Knowledge|              Browser / Tab Content                    ||
|  | Chat     |                                                       ||
|  | Settings |              (web page, terminal UI, chat,            ||
|  |          |               knowledge base, dashboards)             ||
|  |          |                                                       ||
|  +----------+------------------------------------------------------+|
+---------------------------------------------------------------------+
     |                    |
     v                    v
  Fenix Go Engine     PGlite / PostgreSQL
  (gRPC sidecar)      (knowledge store)
```

## Key Features

- **Chromium browser** with tab management, omnibar, sidebar, and navigation
- **Knowledge capture** — save web pages, highlights, and code snippets with AI-powered summarization and tagging
- **RAG chat** — ask questions about your saved knowledge with cited sources
- **Fenix terminal** — Go engine modules rendered as rich web UI (tables, charts, forms) via a declarative protocol
- **Infrastructure modules** — GUARD (secrets), FORGE (Git/GitHub), COST (cloud costs), PULSE (uptime monitoring), KEYS (shortcuts)
- **BYOK AI** — bring your own API keys for OpenAI, Anthropic, Gemini, or Ollama (local)
- **Theming** — dark/light/system themes with customizable accent colors

## Prerequisites

```bash
node --version    # 20+
pnpm --version    # 9+
go version        # 1.22+
```

Docker is optional — PGlite runs embedded inside the Electron app.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build Go engine for your platform
make build-engine

# Build all TypeScript packages
pnpm turbo build

# Start development mode
pnpm turbo dev
```

To run the Electron app in development:

```bash
cd apps/desktop
pnpm dev
```

## Project Structure

```
mixa-ai/
├── apps/
│   ├── desktop/               # Electron browser application
│   └── web/                   # Next.js marketing site
├── engine/                    # Fenix Go engine (gRPC sidecar binary)
├── packages/
│   ├── ui/                    # Shared design tokens and theme system
│   ├── types/                 # Shared TypeScript type definitions
│   ├── ai-pipeline/           # RAG pipeline, LLM providers, embeddings
│   ├── terminal-renderer/     # React components for Fenix UI protocol
│   ├── content-processor/     # Web content extraction (Readability)
│   └── db/                    # Drizzle ORM schema and migrations
├── docker/                    # Optional Docker Compose for external PostgreSQL
├── docs/                      # Architecture and protocol documentation
├── Makefile                   # Top-level build orchestration
├── turbo.json                 # Turborepo pipeline configuration
└── pnpm-workspace.yaml        # Workspace definition
```

## Build Commands

```bash
# Full build (Go + TypeScript)
make all

# Individual builds
make build-engine              # Go engine binary
pnpm turbo build               # All TypeScript packages

# Development
pnpm turbo dev                 # Start all dev servers
make dev                       # Start everything (Go + JS)

# Quality checks
pnpm turbo lint                # ESLint across all packages
pnpm turbo typecheck           # TypeScript type checking
pnpm turbo test                # Vitest across all packages
cd engine && go test ./...     # Go tests
cd engine && go vet ./...      # Go vet

# Packaging
make package                   # Build Go engine + Electron app + package
```

## Architecture

Mixa follows a **monorepo architecture** with clear separation of concerns:

- **Electron main process** hosts tRPC routers (over IPC), manages BrowserView tabs, spawns the Go engine, and handles content capture
- **Electron renderer** is a React 19 app with Zustand stores, communicating with the main process via tRPC and dedicated IPC channels for streaming
- **Fenix Go engine** runs as a sidecar process, exposing infrastructure modules over gRPC with a declarative UI protocol
- **Shared packages** provide types, UI tokens, AI pipeline, content processing, terminal rendering, and database access

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design and component interactions
- [Development Setup](docs/DEVELOPMENT.md) — full setup guide from zero to running
- [Fenix UI Protocol](docs/FENIX-UI-PROTOCOL.md) — protocol specification for engine-to-renderer communication
- [BYOK Providers](docs/BYOK.md) — how to configure each LLM provider
- [Desktop App](apps/desktop/README.md) — Electron app development
- [Go Engine](engine/README.md) — engine modules and gRPC API
- [AI Pipeline](packages/ai-pipeline/README.md) — RAG pipeline and providers
- [Terminal Renderer](packages/terminal-renderer/README.md) — UI protocol components
- [Content Processor](packages/content-processor/README.md) — web content extraction
- [Database](packages/db/README.md) — schema reference and migrations

## Commit Convention

```
type(scope): description

feat(electron): implement tab management system
feat(engine): add GUARD secrets module
fix(renderer): fix chart rendering in dark theme
chore(deps): update electron to 33.x
test(ai-pipeline): add embedding generation tests
```

## Contributing

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with tests
4. Ensure all checks pass: `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test && pnpm turbo build`
5. Submit a pull request

## License

Private — All rights reserved.
