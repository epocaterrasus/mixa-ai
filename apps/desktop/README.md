# Mixa Desktop — Electron Application

The Electron-based desktop browser that serves as the primary user interface for Mixa AI.

## Architecture

```
src/
├── main/              # Electron main process
│   ├── index.ts       # App bootstrap and window creation
│   ├── engine/        # Go engine lifecycle management + gRPC client
│   ├── trpc/          # tRPC router and IPC bridge
│   ├── tabs/          # BrowserView tab manager
│   ├── capture/       # Web content capture service
│   ├── augmented/     # Augmented browsing (related items indicator)
│   ├── chat/          # Streaming chat handler
│   ├── terminal/      # gRPC terminal stream handler
│   ├── shell/         # xterm.js + node-pty shell handler
│   ├── settings/      # OS keychain API key storage
│   └── updater/       # electron-updater auto-update service
├── preload/
│   └── index.ts       # contextBridge API (window.electronAPI)
└── renderer/          # React 19 frontend
    ├── App.tsx
    ├── components/    # UI components (tabs, sidebar, toolbar, chat, etc.)
    ├── stores/        # Zustand state stores
    └── hooks/         # React hooks for IPC integration
```

## Development

```bash
# Install dependencies (from repo root)
pnpm install

# Build dependencies first
pnpm turbo build --filter=@mixa-ai/types --filter=@mixa-ai/ui --filter=@mixa-ai/terminal-renderer

# Start Electron in dev mode with hot reload
pnpm dev

# Or from the repo root
pnpm turbo dev --filter=@mixa-ai/desktop
```

## Build & Package

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build for production
pnpm build

# Package for macOS (from repo root)
make package-mac-arm64    # Apple Silicon
make package-mac-x64      # Intel Mac
```

## Security Model

The app follows Electron security best practices:

- `nodeIntegration: false` — renderer cannot access Node.js APIs directly
- `contextIsolation: true` — preload scripts run in an isolated context
- `contextBridge` exposes a controlled `window.electronAPI` surface
- API keys stored in the OS keychain via `safeStorage`, never in plain files
- Settings stored at `~/.mixa/settings.json` (no secrets in this file)

## Main Process Entry Point

`src/main/index.ts` bootstraps the application:

1. Sets up tRPC handler for IPC-based renderer communication
2. Registers IPC handlers for chat streaming, terminal gRPC streaming, and shell (node-pty)
3. Creates the main BrowserWindow with hidden titlebar and traffic light inset
4. Initializes content capture and augmented browsing services
5. Spawns the Go Fenix engine as a child process
6. Starts the auto-updater (5-second delay, checks every 4 hours)

## Preload API

The preload script exposes `window.electronAPI` with these namespaces:

| Namespace | Purpose |
|-----------|---------|
| `trpc` | tRPC IPC transport (type-safe CRUD) |
| `tabs` | BrowserView management, navigation, events |
| `capture` | Content capture from web pages |
| `chat` | Streaming chat (token-by-token) |
| `terminal` | gRPC terminal stream (Fenix UI protocol) |
| `shell` | xterm.js + node-pty raw shell |
| `augmented` | Related items indicator |
| `sidebar` | Sidebar toggle |
| `updater` | Auto-update controls |
| `engine` | Engine status and log events |

## tRPC Routers

The main process exposes these tRPC routers over IPC:

| Router | Operations |
|--------|------------|
| `items` | CRUD for knowledge items |
| `projects` | CRUD for projects |
| `tags` | List, merge, rename tags |
| `search` | Hybrid semantic + full-text search |
| `chat` | Conversation management |
| `settings` | Get/update app settings |
| `engine` | Engine status, module listing |
| `knowledgeStats` | Knowledge base statistics |

## Engine Lifecycle

The Go Fenix engine runs as a sidecar child process:

- **Dev mode**: looks for binary at `engine/bin/fenix-{platform}-{arch}`
- **Packaged**: looks for binary at `{resourcesPath}/engine/fenix`
- Spawned with `-addr localhost:0` for OS-assigned port
- Port parsed from stdout (`gRPC server listening on <addr>`)
- Health checks every 10 seconds
- Auto-restart on crash with exponential backoff (1s, 2s, 4s — max 3 retries)
- Graceful shutdown: SIGTERM, wait 5s, SIGKILL

## Packaging

Configured via `electron-builder.yml`:

- **macOS**: DMG + ZIP for arm64 and x64, hardened runtime, notarization
- **Linux**: AppImage for x64
- **Windows**: NSIS installer for x64
- Go engine binary bundled as `extraResource`
- `build/afterPack.js` copies the engine binary and proto files at package time
- Publishes to GitHub Releases

## Key Dependencies

- `electron` 35+ with Chromium
- `electron-vite` for build tooling (main, preload, renderer configs)
- `@trpc/server` + `@trpc/client` over Electron IPC
- `@grpc/grpc-js` + `@grpc/proto-loader` for Go engine communication
- `zustand` for renderer state management
- `node-pty` for shell terminal
- `xterm` + `@xterm/addon-fit` for terminal rendering
- `electron-updater` for auto-updates
