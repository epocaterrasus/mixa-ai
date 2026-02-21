# Sprint 1 — Foundation + Browser Shell

**Duration:** 5 weeks
**Goal:** Working Electron browser that can browse the web, with Go engine running as sidecar

## Sprint Backlog

| Task | Title | Agent | Status | Notes |
|------|-------|-------|--------|-------|
| MIXA-001 | Monorepo scaffold | ARCHITECT | 🔴 TODO | Week 1 |
| MIXA-002 | Shared types | ARCHITECT | 🔴 TODO | Week 1 |
| MIXA-003 | DB schema + Docker | ARCHITECT | 🔴 TODO | Week 1 |
| MIXA-004 | Go engine skeleton | TERMINAL-ENGINEER | 🔴 TODO | Week 1 |
| MIXA-005 | Electron app | ELECTRON-ENGINEER | 🔴 TODO | Week 2 |
| MIXA-006 | Tab system | ELECTRON-ENGINEER | 🔴 TODO | Week 2 |
| MIXA-007 | Omnibar | ELECTRON-ENGINEER | 🔴 TODO | Week 3 |
| MIXA-008 | Sidebar | ELECTRON-ENGINEER | 🔴 TODO | Week 3 |
| MIXA-009 | Navigation | ELECTRON-ENGINEER | 🔴 TODO | Week 3 |
| MIXA-010 | Engine lifecycle | ELECTRON-ENGINEER | 🔴 TODO | Week 4 |
| MIXA-037 | tRPC layer | ARCHITECT | 🔴 TODO | Week 4 |
| MIXA-034 | CI pipeline | DEVOPS-ENGINEER | 🔴 TODO | Week 2 |
| MIXA-033 | Theming | FRONTEND-ENGINEER | 🔴 TODO | Week 4 |
| MIXA-012 | Content processor | KNOWLEDGE-ENGINEER | 🔴 TODO | Week 3 |
| MIXA-013 | LLM providers | KNOWLEDGE-ENGINEER | 🔴 TODO | Week 4 |

## Definition of Done
- All 15 tasks pass acceptance criteria
- `pnpm turbo build` succeeds
- `go test ./...` succeeds
- Electron app launches and can browse web pages
- Go engine starts and responds to health checks
- CI pipeline runs on GitHub Actions

## Risks
- Electron + Chromium webview complexity (BrowserView vs webview tag vs webContents)
- gRPC setup between Node.js (Electron main) and Go binary
- PostgreSQL + pgvector Docker setup on developer machines
