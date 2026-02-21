# Chunk 13 — DevOps, CI/CD & Packaging

## GitHub Actions CI
- Trigger: pull_request to main
- Steps: pnpm install → lint → typecheck → test → build
- Go: vet → test
- Services: PostgreSQL + Redis (for integration tests)
- Caching: pnpm store, Go modules

## Electron Packaging
- Tool: electron-builder
- Platforms:
  - macOS: DMG + ZIP (for auto-update)
  - Linux: AppImage
  - Windows: NSIS installer
- Go binary bundled as extraResource
- Makefile target: `make package`
  1. Cross-compile Go engine for target platform
  2. Build all JS packages (`pnpm turbo build`)
  3. Run electron-builder

## Release Workflow
- Trigger: git tag matching v*
- Build for all platforms (matrix: mac-arm64, mac-x64, linux-x64, win-x64)
- Upload artifacts to GitHub Release
- Auto-update: electron-updater checks GitHub Releases

## Auto-Update
- Check on launch (5s delay) and every 4 hours
- Download in background, notify user
- User choice: Update Now (restart) or Later
- Applied on next restart
- Version info in Settings tab

## Docker (Development)
```yaml
# docker/docker-compose.dev.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: mixa
      POSTGRES_USER: mixa
      POSTGRES_PASSWORD: mixa_dev
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

## Docker (Self-Hosted Production)
- PostgreSQL + pgvector
- Redis
- Optional: Node.js backend for web dashboard
- Reverse proxy (Caddy or Nginx)
- Desktop app connects to self-hosted backend via URL config
