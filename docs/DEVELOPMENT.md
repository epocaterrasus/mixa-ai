# Development Setup

Full guide to set up Mixa AI for local development from scratch.

## Prerequisites

### Required

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | `brew install node` or [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | 9+ | `npm install -g pnpm` or `brew install pnpm` |
| Go | 1.22+ | `brew install go` |

### Optional

| Tool | Purpose | Install |
|------|---------|---------|
| Docker | External PostgreSQL (if not using PGlite) | [Docker Desktop](https://docker.com) |
| `gh` CLI | FORGE module GitHub features | `brew install gh` |
| `protoc` | Regenerate protobuf code | `brew install protobuf` |
| `golangci-lint` | Go linting | `brew install golangci-lint` |

## Initial Setup

### 1. Clone the repository

```bash
git clone https://github.com/mixa-ai/mixa-ai.git
cd mixa-ai
```

### 2. Install Node.js dependencies

```bash
pnpm install
```

This installs dependencies for all workspace packages (apps/desktop, packages/*, etc.).

### 3. Build the Go engine

```bash
# Build for your current platform
make build-engine

# Or cross-compile for all platforms
make build-engine-all
```

The binary is output to `engine/bin/fenix-{os}-{arch}`.

### 4. Build all TypeScript packages

```bash
pnpm turbo build
```

Turborepo builds packages in dependency order: `types` → `ui` → `db`, `ai-pipeline`, `content-processor` → `terminal-renderer` → `desktop`.

### 5. Stage the engine binary

```bash
make stage-engine
```

Copies the correct engine binary to `apps/desktop/resources/engine/fenix` for the Electron app to find.

## Running in Development

### Start the Electron app

```bash
cd apps/desktop
pnpm dev
```

This starts:
- Vite dev server for the renderer (React) with hot reload
- Electron main process with the Go engine sidecar

### Start all packages in dev mode

```bash
pnpm turbo dev
```

## Database Setup

### PGlite (Default — No Setup Required)

PGlite runs embedded inside the Electron app. Data is stored at `~/.mixa/data/pglite/`. No external database needed.

### External PostgreSQL (Optional)

If you prefer an external PostgreSQL instance:

```bash
# Start PostgreSQL 16 + pgvector + Redis 7
cd docker
docker compose -f docker-compose.dev.yml up -d

# Set the connection string
export DATABASE_URL="postgres://mixa:mixa@localhost:5432/mixa"

# Run migrations
cd packages/db
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Open Drizzle Studio (visual DB browser)
pnpm db:studio
```

To stop:

```bash
cd docker
docker compose -f docker-compose.dev.yml down
```

## Configuring AI Providers

Mixa uses BYOK (Bring Your Own Key). Configure providers in the app's Settings tab, or edit `~/.mixa/settings.json` directly:

```json
{
  "llm": {
    "activeProvider": "openai",
    "providers": {
      "openai": { "selectedModel": "gpt-4o-mini" },
      "anthropic": { "selectedModel": "claude-3-5-sonnet-20241022" },
      "ollama": { "baseUrl": "http://localhost:11434", "selectedModel": "llama3.2" },
      "gemini": { "selectedModel": "gemini-2.0-flash" }
    }
  }
}
```

API keys are stored in the OS keychain (not in the settings file). Set them via the Settings tab in the app.

For local-only AI (no API keys needed), install [Ollama](https://ollama.ai/) and pull a model:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text   # For embeddings
```

## Quality Checks

All of these must pass before committing (enforced by CI):

```bash
# TypeScript type checking
pnpm turbo typecheck

# ESLint
pnpm turbo lint

# Tests (Vitest for TypeScript, Go testing for engine)
pnpm turbo test
cd engine && go test ./...

# Go vet
cd engine && go vet ./...

# Build
pnpm turbo build
```

Or run everything:

```bash
make test    # Go + TypeScript tests
```

## Project Structure Quick Reference

```
mixa-ai/
├── apps/desktop/          # Electron app (main + renderer + preload)
├── apps/web/              # Next.js marketing site
├── engine/                # Go Fenix engine (gRPC sidecar)
├── packages/types/        # Shared TypeScript types
├── packages/ui/           # Design tokens and theme system
├── packages/db/           # Drizzle ORM schema and client
├── packages/ai-pipeline/  # RAG pipeline, LLM providers, embeddings
├── packages/terminal-renderer/  # React components for Fenix UI protocol
├── packages/content-processor/  # Web content extraction
├── docker/                # Optional Docker Compose
└── docs/                  # Documentation
```

## Data Directories

Mixa stores data in `~/.mixa/`:

```
~/.mixa/
├── settings.json          # User settings (no secrets)
├── data/
│   ├── pglite/            # Embedded PostgreSQL data (PGlite)
│   ├── guard/guard.db     # Encrypted secrets (Go engine)
│   ├── keys/keys.db       # Custom shortcuts (Go engine)
│   ├── cost/cost.db       # Cost entries (Go engine)
│   └── pulse/pulse.db     # Uptime data (Go engine)
```

To reset all data: delete `~/.mixa/` and restart the app.

## Packaging

Build a distributable application:

```bash
# macOS Apple Silicon
make package-mac-arm64

# macOS Intel
make package-mac-x64

# Linux
make package-linux

# Windows
make package-win
```

Output goes to `apps/desktop/dist/`.

## Troubleshooting

### Engine won't start

- Check that the binary exists: `ls apps/desktop/resources/engine/fenix` or `ls engine/bin/`
- Build it: `make build-engine && make stage-engine`
- Check engine logs in the app's developer tools console

### Port conflicts

The engine uses `-addr localhost:0` for OS-assigned ports. If you see port errors, ensure no other instance is running.

### PGlite errors

Delete `~/.mixa/data/pglite/` and restart the app to reset the embedded database.

### Missing native modules

Some dependencies require native compilation (node-pty, better-sqlite3):

```bash
pnpm rebuild
```

### TypeScript errors after pulling

Rebuild all packages in order:

```bash
pnpm turbo build --force
```
