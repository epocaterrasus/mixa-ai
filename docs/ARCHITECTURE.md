# Architecture

## System Overview

Mixa AI is a monorepo-based Electron desktop application with a Go sidecar engine. The system has three main runtime components:

```
┌─────────────────────────────────────────────────────────────┐
│  Electron App                                               │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │  Main Process        │    │  Renderer Process (React)  │  │
│  │                      │    │                            │  │
│  │  - tRPC Router       │◄──►│  - Zustand Stores          │  │
│  │  - Tab Manager       │IPC │  - Tab Components          │  │
│  │  - Capture Service   │    │  - Terminal Renderer        │  │
│  │  - Chat Handler      │    │  - Chat UI                  │  │
│  │  - Shell Handler     │    │  - Knowledge Browser        │  │
│  │  - Settings/Keychain │    │  - Sidebar, Omnibar         │  │
│  │  - Updater           │    │  - Dashboards               │  │
│  │  - Engine Lifecycle  │    │  - Settings UI              │  │
│  └──────────┬───────────┘    └────────────────────────────┘  │
│             │                                                │
│             │ gRPC                                           │
│             ▼                                                │
│  ┌─────────────────────┐                                    │
│  │  Fenix Go Engine     │                                    │
│  │  (child process)     │                                    │
│  │                      │                                    │
│  │  - GUARD (secrets)   │                                    │
│  │  - FORGE (Git)       │                                    │
│  │  - COST (cloud $)    │                                    │
│  │  - PULSE (uptime)    │                                    │
│  │  - KEYS (shortcuts)  │                                    │
│  │  - SYSTEM (health)   │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                │
│             ▼                                                │
│  ┌─────────────────────┐                                    │
│  │  Encrypted SQLite    │                                    │
│  │  (~/.mixa/data/)     │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────┐     ┌─────────────────────┐
│  PostgreSQL / PGlite │     │  Redis (optional)    │
│  (knowledge store)   │     │  (job queues)        │
└─────────────────────┘     └─────────────────────┘
```

## Component Architecture

### Electron Main Process

The main process (`apps/desktop/src/main/`) is the application's backbone:

**tRPC Router** — Type-safe IPC communication with the renderer. Routes: `items`, `projects`, `tags`, `search`, `chat`, `settings`, `engine`, `knowledgeStats`. Uses `electron-trpc` to bridge tRPC over `ipcMain`/`ipcRenderer`.

**Tab Manager** — Manages Electron `BrowserView` instances for web tabs. Each web tab is a separate `BrowserView` attached to the main window. Non-web tabs (terminal, chat, knowledge, settings) render as React components in the renderer.

**Engine Lifecycle** — Spawns the Go Fenix binary as a child process, manages its lifecycle (start, health check, restart on crash, graceful shutdown), and provides a gRPC client for communication.

**Capture Service** — Extracts article content from web pages using `@mixa-ai/content-processor`, stores items via tRPC, and triggers async embedding/summarization jobs.

**Chat Handler** — Manages streaming chat responses. Uses dedicated IPC channels (`chat:stream-chunk`, `chat:stream-end`) instead of tRPC for real-time token delivery.

**Shell Handler** — Creates `node-pty` pseudoterminal instances for raw shell access (bash/zsh). Communicates with the renderer's xterm.js via IPC.

**Settings/Keychain** — Stores settings at `~/.mixa/settings.json`. API keys stored separately in the OS keychain via Electron's `safeStorage`.

### Electron Renderer

The renderer (`apps/desktop/src/renderer/`) is a React 19 application:

**State Management** — Zustand stores for all application state:
- `tabs` — tab list, active tab, tab operations
- `chat` — conversations, messages, streaming state
- `engine` — engine status, module list
- `knowledge` — item list, search results
- `settings` — user preferences, provider config
- `sidebar` — collapse state, width
- `theme` — dark/light mode, accent color
- `capture` — capture toast state
- `augmented` — related items indicator
- `history` — browsing history
- `onboarding` — first-run wizard state
- `updater` — update availability, download progress

**Tab Content Routing** — Based on `TabType`:
- `web` — Managed by main process BrowserView (renderer shows toolbar only)
- `terminal` — `TerminalTab` connected via gRPC streaming or xterm.js shell
- `knowledge` — `KnowledgeTab` with grid/list browse and search
- `chat` — `ChatTab` with streaming messages and citations
- `dashboard` — Cost, health, and knowledge statistics dashboards
- `settings` — Settings panel with provider config, theme, shortcuts

### Fenix Go Engine

The engine (`engine/`) runs as a sidecar binary communicating over gRPC:

**Module System** — Pluggable architecture. Each module implements `Module` (lifecycle) and optionally `UIProvider` (declarative UI). Modules are registered at startup and managed by the `Registry`.

**Fenix UI Protocol** — Declarative component protocol. Modules emit `UIViewUpdate` messages containing an array of typed `UIComponent` values (header, table, chart, metric_row, etc.) and `UIAction` values (clickable buttons). The renderer maps these to React components via `UIViewRenderer`.

**Encrypted Storage** — Each module has its own AES-256-GCM encrypted SQLite database. Key-value storage with application-layer encryption. No CGO required (uses `modernc.org/sqlite`).

### Shared Packages

**`@mixa-ai/types`** — TypeScript type definitions shared across all packages. Defines interfaces for knowledge items, chat, tabs, engine modules, Fenix UI protocol, and settings.

**`@mixa-ai/ui`** — Design token system with semantic CSS variables (`--mixa-*`). Dark and light theme colors, spacing scale, typography, border radii, accent presets, and chart palettes.

**`@mixa-ai/ai-pipeline`** — LLM provider abstraction (BYOK), text chunking, embedding generation, hybrid search (pgvector + FTS), RAG pipeline, and auto-summarization/tagging.

**`@mixa-ai/terminal-renderer`** — React components that render Fenix UI protocol messages. Each `UIComponent` type maps to a React component (Table, Chart, MetricRow, etc.).

**`@mixa-ai/content-processor`** — Web content extraction using Mozilla Readability. HTML sanitization, code block extraction, and thumbnail detection.

**`@mixa-ai/db`** — Drizzle ORM schema and client for PostgreSQL. Tables for items, chunks (with pgvector embeddings), tags, projects, conversations, and messages.

## Data Flow

### Content Capture

```
User saves page (Cmd+S)
    │
    ▼
Renderer ──IPC──► Main Process (Capture Service)
    │
    ├── extractArticle() ── content-processor
    ├── sanitizeHtml()
    ├── extractThumbnail()
    │
    ▼
Store item in database (tRPC → items.create)
    │
    ▼
Queue embedding job (BullMQ → Redis)
    │
    ▼
Embedding worker:
    ├── chunkText() ── 512 tokens, paragraph boundaries
    ├── embedChunks() ── batched embedding via LLM provider
    └── Store chunks + vectors in DB
        │
        ▼
    Queue summarize job
        │
        ▼
    Summarize worker:
        ├── summarizeAndTag() ── cheapest LLM model
        └── Update item summary + tags in DB
```

### RAG Chat

```
User sends question
    │
    ▼
Renderer ──IPC──► Main Process (Chat Handler)
    │
    ▼
ragStream(sql, router, { query, userId, scope })
    │
    ├── hybridSearch()
    │   ├── Vector: embed query → cosine similarity on chunks
    │   └── FTS: plainto_tsquery on items
    │   └── Merge: 0.7 * vector + 0.3 * FTS
    │
    ├── packContext() ── fit top chunks into 4000-token budget
    │
    ├── LLM streaming call (temperature 0.3)
    │   └── System prompt: "cite using [N] notation"
    │
    └── extractCitations() ── map [N] to source items
        │
        ▼
Stream tokens ──IPC──► Renderer (chat:stream-chunk)
    │
    ▼
Display with markdown rendering + clickable citation chips
```

### Terminal UI Rendering

```
User opens Terminal tab → selects module (e.g., GUARD)
    │
    ▼
Renderer ──IPC──► Main Process ──gRPC──► Engine
    │                                      │
    │                              Module.CurrentView()
    │                                      │
    │                                      ▼
    │                              UIViewUpdate {
    │                                components: [
    │                                  { type: "header", ... },
    │                                  { type: "table", ... },
    │                                  { type: "metric_row", ... }
    │                                ],
    │                                actions: [
    │                                  { id: "add", label: "Add Secret" }
    │                                ]
    │                              }
    │                                      │
    ◄──────────────────────────────────────┘
    │
    ▼
UIViewRenderer maps components → React:
    Header → <Header />
    Table → <Table /> (sortable, filterable)
    MetricRow → <MetricRow /> (cards with trends)

User clicks action → UIEvent sent back → Engine handles → new UIViewUpdate
```

## Security Model

1. **Electron isolation**: `nodeIntegration: false`, `contextIsolation: true`. Renderer has no direct Node.js access.
2. **Controlled IPC**: `contextBridge` exposes only specific API methods (`window.electronAPI.*`).
3. **API key storage**: OS keychain via `safeStorage`. Never stored in settings files or logs.
4. **Content sanitization**: All captured HTML stripped of scripts, event handlers, and dangerous URI schemes.
5. **Engine encryption**: Module data encrypted with AES-256-GCM in SQLite. Keys derived from machine identity.
6. **BYOK**: All AI calls use user-provided API keys. No data sent to Mixa's servers.

## Dependency Graph

```
@mixa-ai/types           ◄── everything depends on this
    │
    ├── @mixa-ai/ui       ◄── terminal-renderer, desktop
    ├── @mixa-ai/db       ◄── desktop
    ├── @mixa-ai/ai-pipeline ◄── desktop
    ├── @mixa-ai/content-processor ◄── desktop
    └── @mixa-ai/terminal-renderer ◄── desktop
                │
                └── uses @mixa-ai/ui

apps/desktop imports all packages
engine/ is independent Go code (communicates via gRPC)
```

## Build Pipeline

```
Turborepo orchestrates TypeScript builds (respects dependency order):
  types → ui → db, ai-pipeline, content-processor → terminal-renderer → desktop

Go engine built separately via Makefile:
  engine/ → bin/fenix-{platform}-{arch}

Packaging:
  make package → build engine → stage binary → build Electron → electron-builder
```
