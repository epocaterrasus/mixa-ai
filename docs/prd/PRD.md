# Mixa AI — Product Requirements Document

> **Status:** Draft v3.0 — Unified Vision + Local-First + Integrations
> **Last updated:** 2026-02-21
> **Authors:** Edgar (Fenix AI vision) + Mija (Knowledge Browser vision)

---

## 1. Overview

### The Problem

Developers live in two worlds: the **browser** (docs, PRs, dashboards, Stack Overflow, research) and the **terminal** (code, deploy, debug, infrastructure). They constantly context-switch between them. Meanwhile, the knowledge they consume while browsing — articles, documentation, tutorials, architecture patterns — disappears into a graveyard of bookmarks and closed tabs.

Current tools force a choice:
- **Browsers** (Chrome, Arc) — great for browsing, zero infrastructure awareness
- **Terminals** (iTerm, Warp) — great for commands, zero browsing context
- **Knowledge tools** (Notion, Obsidian, Pocket) — require manual organization effort
- **AI assistants** (ChatGPT, Claude) — smart but have no memory of what YOU care about and no visibility into YOUR stack
- **Dev dashboards** (Grafana, Vercel, AWS Console) — scattered across dozens of tabs

No single tool closes the full loop: **browse → capture → understand → build → deploy → monitor → remember**.

### What Mixa AI Is

Mixa AI is a **developer browser** — an Electron-based desktop application built on Chromium that unifies web browsing, knowledge management, infrastructure tooling, and AI assistance into a single experience. It treats web pages, terminal sessions, and developer dashboards as equal citizens in a tabbed interface.

At its core:
- **Browse the web** like any browser, but with ambient knowledge capture and AI assistance
- **Open terminal tabs** that render beautifully with web technologies — clickable infrastructure cards, inline charts, drag-and-drop interfaces — powered by the Fenix Go engine running locally
- **Capture anything** you encounter while browsing — articles, code snippets, videos, PDFs — into an AI-organized personal knowledge base
- **Chat with everything** — your browsing history, saved knowledge, AND your live infrastructure — through a unified RAG interface
- **Monitor your stack** through native dashboard tabs that show costs, health, deployments, and more
- **Run web apps in isolation** — multiple WhatsApp Web accounts, Google Meet with smart controls, each in its own session partition
- **Draw and collaborate** — built-in Excalidraw-style whiteboard as a native tab type, shareable with others
- **Share workspaces** — simple Clerk-based invite system to let others join your browser workspace

### Core Thesis

> The browser is the developer's most-used application, but it knows nothing about their work. The terminal is the developer's most powerful tool, but it's trapped in a 1970s rendering paradigm. Mixa merges them: a browser that understands your stack, a terminal that renders like a web app, and an AI layer that connects everything.

### Positioning

"Your stack, your knowledge, one browser." — Mixa is the first browser built for developers who want their tools to actually talk to each other.

---

## 2. Goals & Non-Goals

### Goals
- **Unified workspace**: web browsing, terminal, knowledge base, and dashboards in one app — no context switching
- **Zero-friction knowledge capture**: save content with one click or passively while browsing
- **AI-powered auto-organization**: users never manually tag, folder, or categorize anything
- **Web-rendered terminal**: Fenix TUI output rendered as HTML/CSS — clickable elements, inline charts, hover tooltips, drag-and-drop — things terminals physically cannot do
- **Infrastructure awareness**: the browser knows about your servers, databases, secrets, deployments, and costs
- **Conversational retrieval**: chat with your knowledge base AND your infrastructure simultaneously
- **100% local-first**: all data lives on the user's machine. No cloud databases managed by Mixa. Zero server infrastructure for user data.
- **BYOK everywhere**: users bring their own LLM API keys, their own storage providers for backup, their own Doppler tokens. Mixa only validates a licensing token via Clerk.
- **Web app isolation**: run multiple instances of web apps (WhatsApp Web, etc.) in separate session partitions — like incognito but persistent
- **Built-in collaboration**: simple workspace sharing via Clerk invite links, built-in Excalidraw-style whiteboard
- **Privacy-first**: BYOK, local model support (Ollama), user-managed backups to their own providers
- **Open-source core**: MIT-licensed browser shell, open plugin system

### Non-Goals (for v1)
- Replacing VS Code or any IDE — Mixa is not a code editor
- Mobile app — desktop-first, mobile comes later
- Managing cloud infrastructure for users — users back up to their own providers (S3, Dropbox, iCloud, Google Drive)
- Building a Chromium fork — we use Electron's embedded Chromium as-is
- Full parity with all 22 Fenix modules on day one — we ship core modules first and expand
- Running our own databases or storage for user data — Clerk handles only licensing verification

---

## 3. User Personas

### 3.1 The Full-Stack Developer
- Splits day between browser (docs, PRs, dashboards) and terminal (build, deploy, debug)
- Has 30+ tabs open: GitHub, Vercel, AWS Console, Stack Overflow, random docs
- Wants: one app instead of browser + terminal + dashboard tabs scattered everywhere
- Currently uses: Chrome + iTerm + Notion/bookmarks + multiple SaaS dashboards

### 3.2 The Curious Researcher / Builder
- Reads 20-50 articles per week, constantly researching tools, patterns, architectures
- Thinks "I read something about this..." but can't find it
- Wants: passive capture, semantic search, "just ask it" retrieval
- Currently uses: Pocket, bookmarks, random notes files

### 3.3 The DevOps / Platform Engineer
- Manages infrastructure across multiple providers (DO, AWS, Hetzner)
- Monitors deployments, costs, health checks across projects
- Wants: unified infrastructure view without 10 different dashboards
- Currently uses: Grafana + provider consoles + CLI tools + Slack alerts

### 3.4 The Privacy-Conscious Developer
- Refuses to send browsing data or infrastructure details to third-party clouds
- Wants full control: local models, local storage, own API keys
- Would self-host the backend and connect their own LLM
- Currently uses: Firefox + Ollama + Obsidian + terminal-only workflows

---

## 4. Tab Types

Mixa's core UX innovation is that everything is a tab. Each tab has a type:

| Tab Type | Description | Examples |
|----------|-------------|----------|
| **Web** | Standard Chromium web page | Any URL, Google, GitHub, docs |
| **App** | Isolated web app in its own session partition | WhatsApp Web, Slack, Gmail — can run multiple accounts simultaneously |
| **Terminal** | Web-rendered terminal session connected to Fenix engine | Infrastructure management, Git ops, secrets, SSH |
| **Knowledge** | Views into your personal knowledge base | Saved items browser, knowledge graph, reader view |
| **Chat** | AI conversation grounded in your knowledge + infrastructure | "What did I read about Postgres tuning?" / "Show me my AWS costs" |
| **Canvas** | Built-in Excalidraw-style whiteboard | Architecture diagrams, brainstorming, shareable drawings |
| **Dashboard** | Rich data visualizations for infrastructure | Cost breakdown, health status, deployment history |
| **Settings** | App and service configuration | LLM providers, Fenix engine config, themes, shortcuts |

Tabs can be organized into **Spaces** (like Arc's spaces) — e.g., "Work", "Side Project", "Research".

**Tab Management** (from TabFlow):
- Cross-tab search with fuzzy + AI matching
- Tab groups: named, colored groups
- Sessions: save and restore tab setups (like browser profiles)
- Forever history: permanent searchable tab history (never lose a closed tab)
- Tab reminders: "Watch Later" with time-based notifications
- Auto-categorization by domain, project, or AI-detected topic
- Simple mode / Power mode: reduce cognitive load for casual users, show everything for power users
- Media bar: indicator showing active calls (Google Meet) and playing audio across tabs

---

## 5. Functional Requirements

### 5.1 Electron Browser Shell

| ID | Requirement | Priority |
|----|-------------|----------|
| SHELL-01 | Chromium-based web browsing with standard browser features (tabs, navigation, history, bookmarks) | P0 |
| SHELL-02 | Tab system supporting all tab types (Web, Terminal, Knowledge, Chat, Dashboard, Settings) | P0 |
| SHELL-03 | Omnibar: URL bar + command palette + search unified in one input | P0 |
| SHELL-04 | Spaces for organizing tabs by context (work, personal, project-specific) | P1 |
| SHELL-05 | Sidebar showing tab tree, spaces, and quick-access panels | P0 |
| SHELL-06 | Split view: two tabs side-by-side (e.g., web page + terminal) | P1 |
| SHELL-07 | Keyboard-first navigation with customizable shortcuts | P0 |
| SHELL-08 | System tray icon with notification badges (alerts, health, costs) | P2 |
| SHELL-09 | Auto-update mechanism (Electron autoUpdater) | P1 |
| SHELL-10 | Cross-platform: macOS (primary), Linux, Windows | P0 (mac), P1 (linux/win) |

### 5.2 Knowledge Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| CAP-01 | One-click save of current page (full content extraction via Readability) | P0 |
| CAP-02 | Text selection → right-click → "Save to Mixa" with highlighted text preserved | P0 |
| CAP-03 | YouTube video capture with transcript extraction and timestamp bookmarks | P1 |
| CAP-04 | PDF content extraction when viewing PDFs | P1 |
| CAP-05 | Screenshot/image capture with OCR text extraction | P2 |
| CAP-06 | Auto-capture mode: passively save pages where user spends >N minutes (opt-in) | P2 |
| CAP-07 | Code block detection and syntax-aware saving from any webpage | P1 |
| CAP-08 | Keyboard shortcut for all capture actions | P0 |
| CAP-09 | "Related from your knowledge" indicator on browsed pages | P1 |
| CAP-10 | Capture from terminal output (save command output, error logs, etc.) | P1 |

### 5.3 AI Processing Pipeline

**Critical: Mixa provides ZERO AI compute.** All AI features use whatever LLM the user plugs in via their own API keys or local models. We are a pipeline, not a provider. If the user hasn't configured an LLM, AI features are simply unavailable (the app still works for browsing, terminal, canvas, etc.).

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Auto-summarization of captured content (using user's configured LLM) | P0 |
| AI-02 | Auto-tagging with AI-generated topic labels (using user's configured LLM) | P0 |
| AI-03 | Concept/entity extraction for knowledge graph edges | P1 |
| AI-04 | Embedding generation for semantic search (using user's configured embedding model) | P0 |
| AI-05 | Cross-content relationship detection (linking related saves) | P1 |
| AI-06 | Support multiple LLM backends: OpenAI, Anthropic, Ollama (local), Gemini — user picks and configures | P0 |
| AI-07 | Infrastructure-aware context: AI can reference live infra state from Fenix engine | P1 |
| AI-08 | Graceful degradation: if no LLM configured, all AI features disabled but app works fully for browsing/terminal/canvas | P0 |

### 5.4 Knowledge Base & Search

| ID | Requirement | Priority |
|----|-------------|----------|
| KB-01 | PostgreSQL + pgvector for content storage and vector search | P0 |
| KB-02 | Full-text search across all saved content (FTS5 or pg_trgm) | P0 |
| KB-03 | Semantic similarity search via embeddings | P0 |
| KB-04 | Visual knowledge graph explorer (interactive node/edge view) | P2 |
| KB-05 | Collections/spaces for manual grouping (optional) | P1 |
| KB-06 | Data export: Markdown, JSON, Obsidian-compatible format | P1 |
| KB-07 | Reader view for saved articles (clean, distraction-free reading) | P1 |
| KB-08 | Persistent highlights across saved pages | P1 |

### 5.5 Chat Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| CHAT-01 | RAG-based chat grounded in user's saved content + infrastructure state | P0 |
| CHAT-02 | Source citations in chat responses (clickable links to original saved items) | P0 |
| CHAT-03 | Chat scoping: query all content, or filter to specific tags/collections/projects | P1 |
| CHAT-04 | Context-aware chat: "Ask about this page" using current tab + knowledge base | P1 |
| CHAT-05 | Conversation history with ability to resume past chats | P1 |
| CHAT-06 | Infrastructure queries: "What's my AWS bill this month?" routed through Fenix engine | P1 |
| CHAT-07 | Streaming responses with proper markdown rendering | P0 |

### 5.6 Web-Rendered Terminal

| ID | Requirement | Priority |
|----|-------------|----------|
| TERM-01 | Terminal tab type that connects to the Fenix Go engine via IPC/gRPC | P0 |
| TERM-02 | Render Fenix TUI output as HTML/CSS instead of ANSI escape codes | P0 |
| TERM-03 | Clickable elements: infrastructure cards, links, action buttons | P0 |
| TERM-04 | Inline charts and visualizations for COST, PULSE, STATS modules | P1 |
| TERM-05 | Hover tooltips on infrastructure elements (server details, secret values masked) | P1 |
| TERM-06 | Drag-and-drop for applicable interfaces (PLAY API builder, PIPE pipeline editor) | P2 |
| TERM-07 | Keyboard navigation matching Fenix TUI shortcuts | P0 |
| TERM-08 | Multiple terminal sessions in separate tabs | P0 |
| TERM-09 | Terminal output searchable and capturable to knowledge base | P1 |
| TERM-10 | Fallback to xterm.js for raw shell access (bash/zsh) | P1 |

### 5.7 Fenix Engine (Go Binary)

| ID | Requirement | Priority |
|----|-------------|----------|
| ENGINE-01 | Go binary runs as a local sidecar process, started/managed by Electron | P0 |
| ENGINE-02 | gRPC or WebSocket API for Electron ↔ Go communication | P0 |
| ENGINE-03 | Module: KNOW — AI context engine, document indexing, vector search | P0 |
| ENGINE-04 | Module: GUARD — Secrets & env management (Doppler, vault, env switching) | P0 |
| ENGINE-05 | Module: SHIP — Infrastructure: SSH, tunnels, basic Docker, deploy | P1 |
| ENGINE-06 | Module: FORGE — Git & GitHub: repos, PRs, issues, file browsing | P0 |
| ENGINE-07 | Module: KEYS — Customizable shortcuts and command palette | P0 |
| ENGINE-08 | Module: DATA — Database management, schema viewer, NL→SQL | P1 |
| ENGINE-09 | Module: PIPE — CI/CD pipeline dashboard, Docker management | P1 |
| ENGINE-10 | Module: COST — Cloud cost tracker, per-provider breakdown | P1 |
| ENGINE-11 | Module: PULSE — Health & uptime pinger, SSL/domain tracker | P1 |
| ENGINE-12 | Module: PLAY — API playground, request builder, collections | P2 |
| ENGINE-13 | Module: SNAP — Snippets & runbooks, saved commands | P1 |
| ENGINE-14 | Module: ALERT — Notifications: Slack, Discord, macOS push, email | P2 |
| ENGINE-15 | Module: STATS — Personal dev analytics, activity tracking | P2 |
| ENGINE-16 | Module: SCOUT — Automation: Apify, scraping, micro-tools | P2 |
| ENGINE-17 | Module: MEMORY — Conversation backup, context recall | P1 |
| ENGINE-18 | Encrypted SQLite storage for all engine data (AES-256-GCM) | P0 |
| ENGINE-19 | Plugin system via hashicorp/go-plugin (gRPC) for community extensions | P2 |
| ENGINE-20 | MCP server for Claude Code / external AI tool integration | P1 |

### 5.8 Dashboard Tabs

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-01 | Cost dashboard: per-provider breakdown, trend charts, budget alerts | P1 |
| DASH-02 | Health dashboard: uptime grid, SSL expiry, incident timeline | P1 |
| DASH-03 | Deployment dashboard: recent deploys, status, rollback actions | P1 |
| DASH-04 | Database dashboard: schema viewer, query runner, migration status | P2 |
| DASH-05 | Knowledge dashboard: recent saves, trending topics, stats | P1 |

### 5.9 Web App Isolation (App Tabs)

| ID | Requirement | Priority |
|----|-------------|----------|
| APP-01 | App tabs use Electron session partitions — isolated cookies, storage, and auth per app instance | P0 |
| APP-02 | Run multiple WhatsApp Web accounts simultaneously (each in its own partition) | P0 |
| APP-03 | Google Meet integration: detect active Meet tabs, show in media bar, mute/unmute from media bar | P1 |
| APP-04 | App tab templates: preconfigured templates for popular web apps (WhatsApp, Slack, Discord, Gmail, Notion, Meet) | P1 |
| APP-05 | Persistent sessions: app tab sessions survive app restart (cookies, localStorage preserved per partition) | P0 |
| APP-06 | App tabs show in sidebar with custom icons and labels | P0 |
| APP-07 | Notification bridging: web push notifications from app tabs surface as native macOS/OS notifications | P2 |

### 5.10 Canvas (Visual Workspace + Whiteboard)

The Canvas is NOT just a drawing tool — it's a **visual workspace** where you can embed live browser tabs, add notes around them, draw diagrams connecting concepts, and create spatial layouts of your research/work. Think Excalidraw meets a mood board meets a spatial browser.

| ID | Requirement | Priority |
|----|-------------|----------|
| CANVAS-01 | Built-in Excalidraw-based whiteboard as a native tab type | P1 |
| CANVAS-02 | **Embed browser tabs INTO the canvas** — drag a tab from the tab bar into the canvas, and it renders as a live/snapshot web view that you can annotate around | P1 |
| CANVAS-03 | Add sticky notes, text blocks, and freeform drawing around embedded tabs | P1 |
| CANVAS-04 | Draw arrows, connectors, and diagrams between embedded elements (tabs, notes, images) | P1 |
| CANVAS-05 | Create new canvas from omnibar command or sidebar | P1 |
| CANVAS-06 | Canvas files stored locally, exportable as PNG/SVG/JSON | P1 |
| CANVAS-07 | Share canvas via workspace sharing (see Collaboration section) | P2 |
| CANVAS-08 | Paste screenshots, images, and links from web tabs directly into canvas | P1 |
| CANVAS-09 | Canvas library: save and reuse templates (architecture diagrams, flowcharts) | P2 |
| CANVAS-10 | Embedded tabs can be live (interactive webview) or snapshot (static screenshot with link) | P1 |
| CANVAS-11 | Spatial zoom: zoom out to see full canvas, zoom into an embedded tab to interact with it | P1 |

### 5.11 Collaboration & Workspace Sharing

| ID | Requirement | Priority |
|----|-------------|----------|
| COLLAB-01 | Clerk-based authentication for workspace identity (lightweight — licensing only by default) | P0 |
| COLLAB-02 | Generate shareable invite link for workspace (Clerk organization invite) | P1 |
| COLLAB-03 | Shared canvases: real-time collaborative drawing on Canvas tabs | P2 |
| COLLAB-04 | Shared knowledge projects: invite others to view/contribute to a knowledge collection | P2 |
| COLLAB-05 | No complex invitation flows — single link to join, Clerk handles auth | P1 |
| COLLAB-06 | Workspace roles: owner, member (simple, no granular permissions in v1) | P1 |

### 5.12 Tab Management (from TabFlow)

| ID | Requirement | Priority |
|----|-------------|----------|
| TAB-01 | Cross-tab fuzzy search across all open tabs (title, URL, content) | P0 |
| TAB-02 | Tab groups: named, colored groups with collapse/expand | P1 |
| TAB-03 | Sessions: save current tab set as a named session, restore later | P1 |
| TAB-04 | Forever history: permanent searchable history of all tabs (never lose a closed tab) | P1 |
| TAB-05 | Tab reminders: set a reminder on a tab ("Watch Later"), notification at scheduled time | P2 |
| TAB-06 | Auto-categorization: group tabs by domain, project, or AI-detected topic | P2 |
| TAB-07 | Simple mode / Power mode: simplified UI for casual users, full UI for power users | P1 |
| TAB-08 | Media bar: shows active calls (Google Meet, Zoom) and playing audio across tabs | P1 |
| TAB-09 | Tab suspension: auto-suspend inactive tabs to save memory (configurable threshold) | P1 |
| TAB-10 | Quick Access pins: pinned sites/apps always accessible from sidebar | P1 |

### 5.13 Auth, Licensing & Token Management

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Clerk handles ONLY licensing verification — "does this user have a valid Pro token?" | P0 |
| AUTH-02 | App works fully offline without Clerk auth (free tier features, BYOK) | P0 |
| AUTH-03 | Doppler integration for users who manage tokens via Doppler | P1 |
| AUTH-04 | Local token list: users can manually configure API keys in settings (alternative to Doppler) | P0 |
| AUTH-05 | All tokens stored in OS keychain via Electron safeStorage — never in plaintext | P0 |
| AUTH-06 | Token validation on save: test API call to verify key works | P1 |

### 5.14 Backup & Data Portability

| ID | Requirement | Priority |
|----|-------------|----------|
| BACKUP-01 | All user data lives locally — Mixa never stores user data on our servers | P0 |
| BACKUP-02 | Backup to user's own S3-compatible storage (AWS S3, Backblaze B2, MinIO) | P1 |
| BACKUP-03 | Backup to Dropbox (via OAuth) | P2 |
| BACKUP-04 | Backup to Google Drive (via OAuth) | P2 |
| BACKUP-05 | Backup to local directory (external drive, NAS) | P1 |
| BACKUP-06 | Encrypted backup format (AES-256-GCM, user holds the key) | P0 |
| BACKUP-07 | Scheduled automatic backups (daily/weekly, configurable) | P1 |
| BACKUP-08 | Restore from backup (full or selective) | P1 |
| BACKUP-09 | Export all data as open formats: Markdown, JSON, Obsidian-compatible | P1 |

### 5.15 Settings & Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| SET-01 | LLM provider configuration: API keys, model selection, local Ollama endpoint | P0 |
| SET-02 | Fenix engine configuration: module enable/disable, project config (fenix.yaml) | P0 |
| SET-03 | Appearance: themes (dark/light/custom), font, layout preferences | P1 |
| SET-04 | Keyboard shortcuts: fully customizable, importable/exportable | P1 |
| SET-05 | Data management: export all data, clear cache, storage usage | P1 |
| SET-06 | Auto-capture rules: domains to always/never capture, dwell time threshold | P2 |

---

## 6. Non-Functional Requirements

- **Performance:** App launch <3s. Tab switching <100ms. Content capture <500ms. AI processing async in background. Chat responses stream within 2s.
- **Memory:** Base memory footprint <500MB (excluding web page tabs). Aggressive tab suspension for inactive tabs.
- **Privacy:** Zero data collection by default. All AI processing routes through user-configured providers. Local-only mode fully functional with Ollama. No telemetry without opt-in.
- **Security:** All Fenix engine data encrypted at rest (AES-256-GCM). API keys stored in OS keychain. No secrets logged in plaintext. Chromium sandbox enforced.
- **Scalability:** Handle 10,000+ saved knowledge items without search degradation. Handle 50+ open tabs with tab suspension.
- **Offline:** Web browsing requires connectivity (obviously). Knowledge search works offline. Terminal/engine works offline. AI features require connectivity unless using local models.
- **Data portability:** Full export at any time in open formats (Markdown, JSON). No vendor lock-in.

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Desktop shell | Electron 33+ | Chromium-based, cross-platform |
| Frontend framework | React 19 + TypeScript | All UI surfaces (browser chrome, panels, tabs) |
| UI components | shadcn/ui + Tailwind CSS | Consistent design system |
| Internal API | tRPC v11 | Type-safe frontend ↔ Node.js backend |
| Node.js backend | Runs inside Electron main process | Content processing, RAG pipeline, DB access |
| Developer engine | Go 1.22+ binary (Fenix) | Infrastructure modules, runs as sidecar |
| Engine IPC | gRPC (protobuf) | Electron main process ↔ Go binary |
| Terminal renderer | Custom React components | Interprets Fenix UI protocol → HTML/CSS |
| Database (local) | PGlite (PostgreSQL in WASM) + pgvector | Zero-install embedded PostgreSQL with vector search |
| Embedded DB | SQLite (via better-sqlite3) | Fenix engine local state, encrypted |
| Job queue | In-memory queue (p-queue) | Async AI processing (no Redis needed locally) |
| File storage | Local filesystem | Thumbnails, PDFs, screenshots |
| Canvas | Excalidraw (MIT, embedded) | Built-in whiteboard / drawing tool |
| Auth / Licensing | Clerk | ONLY for license verification (Pro token check) |
| Token management | Doppler (optional) + local keychain | Users bring their own API keys |
| Backup storage | User's own provider (S3, Dropbox, Drive, local) | Mixa never stores user data on our servers |
| Payments | LemonSqueezy | Pro tier licensing |
| Monorepo | Turborepo + pnpm | JS/TS packages; Go engine has separate build |
| Go build | Makefile / Task | Cross-compilation for mac/linux/win |
| Packaging | electron-builder | DMG (mac), AppImage (linux), NSIS (win) |
| Auto-update | electron-updater | GitHub Releases as update source |
| CI/CD | GitHub Actions | Build, test, package, release |

### 7.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MIXA AI (Electron)                           │
│                                                                     │
│  ┌────────────────────── RENDERER PROCESS ───────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │ Web Tabs │ │ Terminal │ │ Knowledge│ │ Chat / Dashboard │ │  │
│  │  │ (Chromium│ │ Tabs     │ │ Tabs     │ │ Tabs             │ │  │
│  │  │  pages)  │ │ (React)  │ │ (React)  │ │ (React)          │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘ │  │
│  │       │             │            │             │               │  │
│  │       │        ┌────┴────────────┴─────────────┘               │  │
│  │       │        │  tRPC Client                                  │  │
│  └───────┼────────┼──────────────────────────────────────────────┘  │
│          │        │                                                 │
│  ┌───────┼────────┼──────── MAIN PROCESS ────────────────────────┐  │
│  │       │        ▼                                              │  │
│  │  Chromium      tRPC Router                                    │  │
│  │  Engine        ┌────────────────────────────────────────┐     │  │
│  │  (webContents) │ items · projects · search · chat       │     │  │
│  │                │ capture · settings · engine · billing   │     │  │
│  │                └──────────────────┬─────────────────────┘     │  │
│  │                                   │                           │  │
│  │  ┌──────────────┐  ┌─────────────┴──────┐  ┌──────────────┐  │  │
│  │  │ Content      │  │ RAG Pipeline       │  │ LLM Provider │  │  │
│  │  │ Processor    │  │                    │  │ Router       │  │  │
│  │  │              │  │ • Chunk            │  │              │  │  │
│  │  │ • Readability│  │ • Embed            │  │ • OpenAI     │  │  │
│  │  │ • yt-dlp     │  │ • Search           │  │ • Anthropic  │  │  │
│  │  │ • pdf-parse  │  │ • Rerank           │  │ • Ollama     │  │  │
│  │  │ • OCR        │  │ • Generate         │  │ • Gemini     │  │  │
│  │  └──────────────┘  └────────────────────┘  └──────────────┘  │  │
│  │                                   │                           │  │
│  │                          ┌────────┴──────┐                    │  │
│  │                          │ gRPC Client   │                    │  │
│  │                          └────────┬──────┘                    │  │
│  └───────────────────────────────────┼───────────────────────────┘  │
│                                      │                              │
│  ┌───────────────────────────────────┼─────────────────────────┐    │
│  │              FENIX ENGINE (Go Binary — Sidecar)             │    │
│  │                                   │                         │    │
│  │  gRPC Server ◄────────────────────┘                         │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │                   Module Registry                    │   │    │
│  │  │                                                      │   │    │
│  │  │  GUARD  FORGE  SHIP   KNOW   KEYS   DATA   PIPE     │   │    │
│  │  │  COST   PULSE  PLAY   SNAP   ALERT  STATS  SCOUT    │   │    │
│  │  │  MEMORY  LIVE  LOOK   QUERY  HUB    IMPORT           │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  │                         │                                   │    │
│  │                    SQLite (encrypted)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │     DATA LAYER (all local)    │
               │                               │
               │  ┌───────────┐ ┌───────────┐  │
               │  │ PGlite   │ │ Local     │  │
               │  │ (PG in   │ │ Filesystem│  │
               │  │  WASM)   │ │           │  │
               │  │          │ │• Thumbnails│ │
               │  │• Users   │ │• PDFs     │  │
               │  │• Items   │ │• Backups  │  │
               │  │• Chunks  │ │• Canvas   │  │
               │  │• Vectors │ │  files    │  │
               │  │• Projects│ │           │  │
               │  └───────────┘ └───────────┘  │
               │                               │
               │  ┌───────────────────────────┐ │
               │  │ Backup (user's provider)  │ │
               │  │ S3 / Dropbox / Drive /    │ │
               │  │ iCloud / Local Directory  │ │
               │  └───────────────────────────┘ │
               └───────────────────────────────┘
```

### 7.3 Monorepo Structure

```
mixa-ai/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint + typecheck + test on PRs
│       ├── build.yml               # Build Electron app (mac/linux/win)
│       └── release.yml             # Package + upload to GitHub Releases
│
├── .ralph/                         # AI orchestration brain (Ralph system)
│   ├── PROMPT.md                   # Master loop prompt
│   ├── prd.json                    # Structured task list
│   ├── IMPLEMENTATION_PLAN.md      # Priority-ordered task board
│   ├── NOTES_FOR_EDGAR.md          # Manual actions needed
│   ├── agents/                     # Agent role definitions
│   ├── comms/                      # Inter-agent communications
│   ├── epics/                      # Epic tracking
│   ├── logs/                       # Execution logs
│   ├── prompts/                    # Prompt repository
│   ├── sprints/                    # Sprint boards
│   └── vectordb/                   # PRD chunks for context injection
│
├── apps/
│   ├── desktop/                    # Electron app (the browser)
│   │   ├── src/
│   │   │   ├── main/               # Electron main process
│   │   │   │   ├── index.ts        # App entry point
│   │   │   │   ├── windows.ts      # Window management
│   │   │   │   ├── ipc.ts          # IPC handlers
│   │   │   │   ├── engine.ts       # Fenix Go engine lifecycle
│   │   │   │   ├── tray.ts         # System tray
│   │   │   │   └── updater.ts      # Auto-update logic
│   │   │   ├── renderer/           # React UI (browser chrome)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── TabBar/
│   │   │   │   │   ├── Sidebar/
│   │   │   │   │   ├── Omnibar/
│   │   │   │   │   ├── StatusBar/
│   │   │   │   │   └── SplitView/
│   │   │   │   ├── tabs/           # Tab type renderers
│   │   │   │   │   ├── WebTab.tsx
│   │   │   │   │   ├── TerminalTab.tsx
│   │   │   │   │   ├── KnowledgeTab.tsx
│   │   │   │   │   ├── ChatTab.tsx
│   │   │   │   │   ├── DashboardTab.tsx
│   │   │   │   │   └── SettingsTab.tsx
│   │   │   │   ├── hooks/
│   │   │   │   ├── stores/         # Zustand stores
│   │   │   │   └── styles/
│   │   │   └── preload/            # Electron preload scripts
│   │   ├── electron-builder.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Next.js marketing site + hosted dashboard
│       ├── app/
│       │   ├── (marketing)/        # Landing, pricing, docs
│       │   ├── (auth)/             # Login, signup
│       │   └── (app)/              # Hosted knowledge dashboard (web-only users)
│       ├── package.json
│       └── tsconfig.json
│
├── engine/                         # Fenix Go Engine (sidecar binary)
│   ├── cmd/
│   │   └── fenix/
│   │       └── main.go             # Binary entry point
│   ├── internal/
│   │   ├── guard/                  # Secrets & env management
│   │   ├── forge/                  # Git & GitHub
│   │   ├── ship/                   # Infrastructure & SSH
│   │   ├── know/                   # AI context engine
│   │   ├── keys/                   # Shortcuts & command palette
│   │   ├── data/                   # Database management
│   │   ├── pipe/                   # CI/CD
│   │   ├── cost/                   # Cloud cost tracking
│   │   ├── pulse/                  # Health & uptime
│   │   ├── play/                   # API playground
│   │   ├── snap/                   # Snippets & runbooks
│   │   ├── alert/                  # Notifications
│   │   ├── stats/                  # Dev analytics
│   │   ├── scout/                  # Automation
│   │   ├── memory/                 # Conversation backup
│   │   ├── grpc/                   # gRPC server
│   │   ├── storage/                # Encrypted SQLite
│   │   └── bus/                    # Internal event bus
│   ├── pkg/
│   │   ├── plugin/                 # Public plugin interfaces
│   │   └── proto/                  # Protobuf definitions
│   ├── go.mod
│   ├── go.sum
│   └── Makefile
│
├── packages/
│   ├── ui/                         # Shared React component library
│   │   ├── src/
│   │   │   ├── components/         # shadcn/ui + custom components
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   └── package.json
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── knowledge.ts        # Knowledge base types
│   │   │   ├── engine.ts           # Fenix engine types
│   │   │   ├── tabs.ts             # Tab system types
│   │   │   ├── chat.ts             # Chat/RAG types
│   │   │   └── settings.ts         # Configuration types
│   │   └── package.json
│   │
│   ├── ai-pipeline/                # RAG, embeddings, LLM provider abstraction
│   │   ├── src/
│   │   │   ├── providers/          # OpenAI, Anthropic, Ollama, Gemini adapters
│   │   │   ├── chunker.ts          # Text chunking strategies
│   │   │   ├── embedder.ts         # Embedding generation
│   │   │   ├── retriever.ts        # Vector search + reranking
│   │   │   ├── generator.ts        # LLM response generation
│   │   │   └── pipeline.ts         # Full RAG pipeline orchestrator
│   │   └── package.json
│   │
│   ├── terminal-renderer/          # Web-based Fenix TUI renderer
│   │   ├── src/
│   │   │   ├── protocol.ts         # Fenix UI protocol parser
│   │   │   ├── components/         # React components for each TUI widget
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Chart.tsx
│   │   │   │   ├── Form.tsx
│   │   │   │   ├── List.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── themes/             # Visual themes for terminal rendering
│   │   │   └── interactions.ts     # Click, hover, drag-drop handlers
│   │   └── package.json
│   │
│   ├── content-processor/          # Web content extraction & parsing
│   │   ├── src/
│   │   │   ├── extractors/         # Per-content-type extractors
│   │   │   │   ├── article.ts      # Readability-based article extraction
│   │   │   │   ├── youtube.ts      # YouTube transcript + metadata
│   │   │   │   ├── pdf.ts          # PDF text extraction
│   │   │   │   ├── code.ts         # Code block detection
│   │   │   │   └── image.ts        # OCR text extraction
│   │   │   ├── sanitizer.ts        # HTML sanitization
│   │   │   └── thumbnail.ts        # Thumbnail generation
│   │   └── package.json
│   │
│   └── db/                         # Database schema & migrations (Drizzle ORM)
│       ├── src/
│       │   ├── schema/             # Drizzle schema definitions
│       │   │   ├── users.ts
│       │   │   ├── items.ts        # Saved knowledge items
│       │   │   ├── chunks.ts       # Text chunks with embeddings
│       │   │   ├── projects.ts     # Knowledge projects/collections
│       │   │   ├── tags.ts         # AI-generated tags
│       │   │   ├── chats.ts        # Conversation history
│       │   │   └── settings.ts     # User settings
│       │   ├── migrations/
│       │   └── client.ts           # Database client setup
│       └── package.json
│
├── docker/
│   ├── docker-compose.dev.yml      # PostgreSQL + Redis for local dev
│   └── docker-compose.prod.yml     # Full self-hosted stack
│
├── scripts/
│   └── ralph.sh                    # Ralph Wiggum bash loop
│
├── docs/
│   └── prd/
│       ├── PRD.md                  # This file
│       └── CLAUDE.md               # AI context file
│
├── AGENTS.md                       # Build/test commands for Ralph
├── package.json                    # Root monorepo package.json
├── pnpm-workspace.yaml
├── turbo.json
├── Makefile                        # Top-level: builds Go engine + calls turbo
└── .gitignore
```

### 7.4 Fenix Engine UI Protocol

The Go engine doesn't output raw ANSI. Instead, it outputs a structured JSON-based UI protocol that the `terminal-renderer` package interprets and renders as React components.

```jsonc
// Example: Fenix engine sends this when rendering the COST module
{
  "type": "view",
  "module": "cost",
  "components": [
    {
      "type": "header",
      "text": "Cloud Costs — February 2026",
      "level": 1
    },
    {
      "type": "metric-row",
      "metrics": [
        { "label": "Total MTD", "value": "$847.32", "trend": "up", "change": "+12%" },
        { "label": "Projected", "value": "$1,241.00", "trend": "up", "change": "+8%" },
        { "label": "Budget", "value": "$1,500.00", "utilization": 0.56 }
      ]
    },
    {
      "type": "chart",
      "chartType": "area",
      "data": { /* time-series cost data */ },
      "interactive": true
    },
    {
      "type": "table",
      "columns": ["Provider", "Service", "Cost", "Trend", "Actions"],
      "rows": [ /* clickable rows with action buttons */ ],
      "sortable": true,
      "filterable": true
    }
  ],
  "actions": [
    { "id": "refresh", "label": "Refresh", "shortcut": "r" },
    { "id": "export", "label": "Export CSV", "shortcut": "e" }
  ]
}
```

The `terminal-renderer` maps each component type to a React component, applies the active theme, and handles user interactions (clicks, hovers, keyboard) by sending events back to the engine via gRPC.

### 7.5 Deployment & Data Architecture

**Core Principle: Mixa handles ZERO user data on our servers.**

| Concern | How It Works |
|---------|-------------|
| **Database** | PGlite (PostgreSQL compiled to WASM) runs embedded inside the Electron app. Zero installation, zero Docker, zero external dependencies. pgvector extension included for embeddings. |
| **Job queue** | In-memory queue (p-queue) for async AI tasks. No Redis needed. Jobs survive within app session; re-queue on restart. |
| **File storage** | Local filesystem under `~/.mixa/data/`. Thumbnails, PDFs, canvas files, screenshots. |
| **Backup** | Users connect their own storage provider: S3-compatible, Dropbox, Google Drive, or local directory. Encrypted (AES-256-GCM). Scheduled or manual. |
| **Auth/Licensing** | Clerk verifies "does this user have a Pro token?" via a single API call on app launch. Free tier works with zero auth. |
| **API keys** | Users bring their own keys: LLM providers (OpenAI, Anthropic, etc.), infrastructure providers (DO, AWS), or manage via Doppler. Stored in OS keychain. |
| **Sync across devices** | Via user's own backup provider. Export → backup → import on other device. No Mixa cloud sync. |

**Why this matters:**
- Zero server costs for user data (our only infra is the marketing site + Clerk)
- Users own their data completely — no vendor lock-in
- No GDPR/privacy concerns — we never see user data
- Massively lower barrier to entry — download and run, no Docker, no PostgreSQL install

---

## 8. Database Schema (Knowledge Layer)

```sql
-- Users (local-first, optional cloud sync)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE,
  display_name TEXT,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Saved knowledge items
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  url           TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  content_text  TEXT,
  content_html  TEXT,
  item_type     TEXT NOT NULL, -- 'article', 'highlight', 'youtube', 'pdf', 'code', 'image', 'terminal'
  source_type   TEXT NOT NULL, -- 'manual', 'auto_capture', 'extension', 'terminal'
  thumbnail_url TEXT,
  favicon_url   TEXT,
  domain        TEXT,
  word_count    INTEGER,
  reading_time  INTEGER, -- seconds
  summary       TEXT, -- AI-generated
  is_archived   BOOLEAN DEFAULT false,
  is_favorite   BOOLEAN DEFAULT false,
  captured_at   TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Text chunks with embeddings (for RAG)
CREATE TABLE chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID REFERENCES items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  token_count INTEGER,
  embedding   vector(1536), -- pgvector
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- AI-generated tags
CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT UNIQUE NOT NULL,
  color TEXT
);

CREATE TABLE item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id) ON DELETE CASCADE,
  score   REAL DEFAULT 1.0, -- AI confidence score
  PRIMARY KEY (item_id, tag_id)
);

-- Knowledge projects / collections
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE item_projects (
  item_id    UUID REFERENCES items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, project_id)
);

-- Highlights (text selections from saved pages)
CREATE TABLE highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID REFERENCES items(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  note          TEXT, -- user annotation
  color         TEXT DEFAULT 'yellow',
  selector_data JSONB, -- CSS selector info for re-rendering
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Chat conversations
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  title      TEXT,
  scope      JSONB, -- { project_ids: [], tag_ids: [], item_ids: [] }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL, -- 'user', 'assistant'
  content         TEXT NOT NULL,
  citations       JSONB, -- [{ item_id, chunk_id, text }]
  model_used      TEXT,
  token_count     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_domain ON items(domain);
CREATE INDEX idx_items_captured ON items(captured_at DESC);
CREATE INDEX idx_chunks_item ON chunks(item_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_items_fulltext ON items USING gin(to_tsvector('english', title || ' ' || coalesce(content_text, '')));
```

---

## 9. Competitive Landscape

### Direct Competitors

| Product | Strengths | Weaknesses | How Mixa Differs |
|---------|-----------|------------|------------------|
| **Arc Browser** | Beautiful UX, spaces, command bar | No AI knowledge capture, no terminal, company pivoting to Dia | Mixa adds knowledge capture + terminal + infrastructure awareness |
| **Recall** (getrecall.ai) | Knowledge graph, summaries, augmented browsing | Cloud-only, no self-host, no dev tools, no terminal | Mixa is privacy-first, has full dev tooling, self-hostable |
| **Warp** | Beautiful terminal, AI-powered, blocks UI | No browser, no knowledge capture, terminal-only | Mixa embeds terminal IN a browser with web-rendered UI |
| **Pieces** | On-device AI, developer-focused, 9-month memory | No browser, dev-only focus, no knowledge graph | Mixa captures from browsing + terminal, broader audience |
| **Warp** | Beautiful terminal, AI-powered, block-based UI, web-like rendering | No browser, no knowledge capture, terminal-only, requires account | Mixa embeds terminal IN a browser with full knowledge + infra layer |
| **Sidekick Browser** | Built for work, app integrations, split view | No AI knowledge capture, no terminal, limited dev tools | Mixa is developer-focused with terminal + AI + infrastructure |
| **Khoj** (khoj.dev) | Open-source, full RAG, multi-source | Complex setup, no browser, resource-heavy | Mixa integrates the browser itself, simpler UX |
| **Monica** (monica.im) | All-in-one browser AI, Memos feature | Credit-limited, cloud-dependent, no dev tools | Mixa is BYOK, self-hostable, has full dev tooling |
| **TabFlow** | Smart tab management, sessions, AI search, bookmarks integration | Chrome extension only, no terminal, no knowledge capture | Mixa absorbs TabFlow's tab management as native browser features |

### Adjacent Products

| Product | Relationship to Mixa |
|---------|---------------------|
| **Google NotebookLM** | Strong RAG chat but requires manual upload — no browser integration |
| **Perplexity Spaces** | Web search + personal docs but shallow indexing, not a real browser |
| **Readwise Reader** | Excellent highlights + reading but no AI chat, no dev tools |
| **Obsidian + plugins** | Powerful PKM but manual effort, no browser, no infrastructure |
| **VS Code** | Great editor with terminal but not a browser, no knowledge capture |
| **Grafana** | Best dashboards but separate app, no browser, no knowledge layer |

### Mixa's Unique Position

No other product occupies this intersection:

```
                    Browser ──────── Knowledge
                       │                │
                       │     MIXA AI    │
                       │   (only one    │
                       │    here)       │
                       │                │
                    Terminal ────── Infrastructure
```

---

## 10. Business Model

| Plan | Price | Includes |
|------|-------|---------|
| **Free** | $0 | Browser + terminal + 50 knowledge items + 1 project + 20 chat msgs/day + basic Fenix modules (GUARD, FORGE, KEYS, KNOW) + BYOK required |
| **Pro** | $12/mo or $99/year | Unlimited knowledge items/projects/chat + semantic search + all Fenix modules + highlights + reader view + YouTube transcripts + Obsidian sync + priority support |
| **Team** | $24/mo/seat | Everything in Pro + shared knowledge projects + shared infrastructure views + audit trail + SSO |

Revenue from free tier:
- Affiliate referrals for linked services (Hetzner, DigitalOcean, etc.)
- Marketplace commission on community plugins/themes (future Hub)

14-day full Pro trial, no credit card required. Graceful degradation to Free tier after trial.

---

## 11. Milestones & Roadmap

| Phase | Name | Key Deliverables | Duration |
|-------|------|------------------|----------|
| **0** | Foundation | Monorepo scaffold, shared types, build pipeline, Go engine skeleton, Docker dev environment | 2 weeks |
| **1** | Browser MVP | Electron shell with Chromium tabs, tab bar, omnibar, sidebar, basic navigation, keyboard shortcuts | 3 weeks |
| **2** | Knowledge Capture | Content capture (page + selection), Readability extraction, storage in PostgreSQL, basic search | 2 weeks |
| **3** | AI Pipeline | Embedding generation, auto-summarize, auto-tag, vector search, LLM provider abstraction (BYOK) | 2 weeks |
| **4** | Chat & RAG | Chat tab, RAG pipeline, source citations, conversation history, scoped queries | 2 weeks |
| **5** | Terminal Renderer | Fenix UI protocol, web-rendered terminal tab, core modules (GUARD, FORGE, KEYS), gRPC bridge | 3 weeks |
| **6** | Infrastructure Modules | COST, PULSE, PIPE, DATA modules in Go engine + corresponding dashboard tabs | 3 weeks |
| **7** | Polish & Ship | Auto-update, packaging (DMG/AppImage/NSIS), landing page, docs, beta release | 2 weeks |
| **8** | Advanced Features | Knowledge graph viz, YouTube transcripts, PDF extraction, Obsidian sync, split view, spaces | Ongoing |

---

## 12. Open Questions & Decisions

### Resolved

- **Q1 (UI Protocol):** ✅ **DECIDED** — Custom Fenix UI protocol (JSON via protobuf). It gives us full control over rendering and allows web-native interactions that ANSI can't.
- **Q2 (Engine Crashes):** ✅ **DECIDED** — Auto-restart with exponential backoff (max 3 retries). Terminal tabs show error state with reconnect button. Engine state persisted in SQLite, recoverable on restart.
- **Q6 (PostgreSQL dependency):** ✅ **DECIDED** — Use **PGlite** (PostgreSQL compiled to WASM). Runs embedded inside the app. Zero installation. Includes pgvector for embeddings. No Docker, no external database, no Redis. This dramatically lowers the barrier to entry.
- **Q8 (BYOK):** ✅ **DECIDED** — BYOK is mandatory for free tier. Users bring their own API keys. No Mixa-managed AI API. This keeps our server costs at zero and aligns with the privacy-first philosophy.

### Still Open

- **Q3:** Should web tabs use Electron's `<webview>` tag or BrowserView? Webview is simpler but has known limitations. BrowserView is more performant but being deprecated in favor of WebContentsView.
- **Q4:** What's the default model recommendation for auto-tagging/summarization? We don't provide it, but we should suggest gpt-4o-mini or Haiku as cost-effective options in onboarding.

### Resolved (Additional)

- **Q5 (Chrome Extensions):** ✅ **DECIDED** — No. We do not support loading Chrome extensions inside Mixa. Too fragile, creates support burden, and our App tabs + native features cover the main use cases.
- **Q7 (Marketing Site):** ✅ **DECIDED** — Marketing site lives inside `apps/web` (same monorepo) and **uses actual product UI components** to simulate real usage on the landing page. Same pattern as fluffy-umbrella/Fintivio: product screens wrapped in `BrowserMockup` components, with a declarative animation system (`demo-acts`) that shows interactive demos of the real UI. This means:
  - Shared component library (`packages/ui`) used by both desktop app and marketing site
  - Marketing demos are the actual tab bar, sidebar, omnibar, terminal renderer, chat, canvas components
  - Declarative demo configs (acts) that animate cursor, clicks, drag-drop, tab switching
  - Feature sections where clicking a feature jumps to the corresponding demo animation
  - Auto-measurement system for accurate cursor positioning on DOM elements
  - Result: the marketing site IS the product demo — not screenshots, not videos, real interactive UI
