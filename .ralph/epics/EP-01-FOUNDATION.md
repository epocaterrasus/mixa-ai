# EP-01: Foundation

**Status:** Not Started
**Tasks:** MIXA-001, MIXA-002, MIXA-003, MIXA-037
**Agent:** ARCHITECT

## Goal
Set up the monorepo, shared types, database schema, Docker dev environment, and tRPC communication layer. This is the foundation everything else builds on.

## Acceptance
- Monorepo builds cleanly (`pnpm turbo build`)
- All shared types exported and importable
- PostgreSQL + pgvector running in Docker with Drizzle migrations applied
- tRPC router handles all CRUD operations with type safety
- Go engine directory exists with go.mod initialized

## Dependencies
None — this is the starting point.

## Tasks
| ID | Title | Status |
|----|-------|--------|
| MIXA-001 | Initialize monorepo | 🔴 TODO |
| MIXA-002 | Shared TypeScript types | 🔴 TODO |
| MIXA-003 | Drizzle schema + Docker | 🔴 TODO |
| MIXA-037 | tRPC layer | 🔴 TODO |
