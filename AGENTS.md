# AGENTS.md — Mixa AI Build & Test Commands

## Prerequisites

```bash
node --version    # 20+
pnpm --version    # 9+
go version        # 1.22+
# Docker is OPTIONAL — PGlite runs embedded, no external DB needed
```

## Monorepo Commands

```bash
pnpm install                # Install all dependencies
pnpm turbo build            # Build all packages
pnpm turbo test             # Run all tests
pnpm turbo lint             # Lint all packages
pnpm turbo typecheck        # TypeScript type checking
pnpm turbo dev              # Start all dev servers
```

## Package-Specific Commands

### apps/desktop (Electron)
```bash
cd apps/desktop
pnpm dev                    # Start Electron in dev mode with hot reload
pnpm build                  # Build for production
pnpm typecheck              # Type check
pnpm lint                   # Lint
```

### apps/web (Next.js)
```bash
cd apps/web
pnpm dev                    # Start Next.js dev server
pnpm build                  # Production build
pnpm lint                   # Lint
```

### packages/types
```bash
cd packages/types
pnpm build                  # Build types package
pnpm typecheck              # Type check
```

### packages/db
```bash
cd packages/db
pnpm build                  # Build
pnpm db:generate            # Generate Drizzle client
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed sample data
pnpm db:studio              # Open Drizzle Studio
```

### packages/ai-pipeline
```bash
cd packages/ai-pipeline
pnpm build                  # Build
pnpm test                   # Run tests (mocked LLM providers)
pnpm typecheck              # Type check
```

### packages/terminal-renderer
```bash
cd packages/terminal-renderer
pnpm build                  # Build
pnpm test                   # Run tests
pnpm storybook              # Launch Storybook for visual dev
```

### packages/content-processor
```bash
cd packages/content-processor
pnpm build                  # Build
pnpm test                   # Run tests (HTML fixtures)
```

### engine/ (Go)
```bash
cd engine
make build                  # Build binary for current platform
make build-all              # Cross-compile (darwin-arm64, darwin-amd64, linux-amd64)
go test ./...               # Run all Go tests
go vet ./...                # Vet all Go code
make proto                  # Regenerate protobuf code
make lint                   # Run golangci-lint
```

## Database (PGlite — Embedded)

```bash
# PGlite runs automatically inside the Electron app — no setup needed
# Data stored at ~/.mixa/data/pglite/
# To reset: delete the pglite directory and restart app

# Docker is OPTIONAL (only if you prefer external PostgreSQL for development)
cd docker
docker compose -f docker-compose.dev.yml up -d    # Start external PostgreSQL (optional)
docker compose -f docker-compose.dev.yml down      # Stop
```

## Top-Level Makefile

```bash
make all            # Build Go engine + all JS packages
make dev            # Start everything in dev mode
make clean          # Clean all build artifacts
make test           # Run all tests (Go + JS)
make package        # Build Go engine → build Electron → package app
```

## Backpressure Gates (Ralph must pass ALL before committing)

1. **TypeScript**: `pnpm turbo typecheck` — zero errors
2. **Lint**: `pnpm turbo lint` — zero errors
3. **Tests**: `pnpm turbo test` — all pass
4. **Build**: `pnpm turbo build` — successful build
5. **Go Vet**: `cd engine && go vet ./...` — zero issues
6. **Go Test**: `cd engine && go test ./...` — all pass

## Commit Convention

```
type(scope): description

feat(electron): implement tab management system
feat(engine): add GUARD secrets module
fix(renderer): fix chart rendering in dark theme
chore(deps): update electron to 33.x
test(ai-pipeline): add embedding generation tests
docs(readme): update development setup guide
```

## Discovered Patterns

<!-- Ralph will append learnings here as it discovers them -->
