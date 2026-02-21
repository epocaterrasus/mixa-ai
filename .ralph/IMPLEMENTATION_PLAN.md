# IMPLEMENTATION_PLAN.md — Mixa AI

## Current Sprint: Sprint 1 — Foundation + Browser Shell

### Priority Order (Ralph: pick the first incomplete task whose dependencies all pass)

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 1 | MIXA-001 | Initialize monorepo with Turborepo + pnpm | 🟢 DONE | — | ARCHITECT |
| 2 | MIXA-002 | Shared TypeScript types | 🟢 DONE | 001 | ARCHITECT |
| 3 | MIXA-003 | Drizzle schema + Docker dev environment | 🟢 DONE | 001 | ARCHITECT |
| 4 | MIXA-004 | Go engine skeleton + gRPC server | 🟢 DONE | 001 | TERMINAL-ENGINEER |
| 5 | MIXA-037 | tRPC layer (renderer ↔ main process) | 🟢 DONE | 002, 003, 005 | ARCHITECT |
| 6 | MIXA-005 | Electron app with basic window | 🟢 DONE | 001, 002 | ELECTRON-ENGINEER |
| 7 | MIXA-006 | Tab system with Chromium webviews | 🟢 DONE | 005 | ELECTRON-ENGINEER |
| 8 | MIXA-007 | Omnibar (URL + commands + search) | 🟢 DONE | 006 | ELECTRON-ENGINEER |
| 9 | MIXA-008 | Sidebar with tab tree | 🟢 DONE | 006 | ELECTRON-ENGINEER |
| 10 | MIXA-009 | Browser navigation + history | 🟢 DONE | 006 | ELECTRON-ENGINEER |
| 11 | MIXA-010 | Go engine lifecycle (Electron ↔ Go) | 🟢 DONE | 004, 005 | ELECTRON-ENGINEER |
| 12 | MIXA-034 | GitHub Actions CI | 🟢 DONE | 001, 004 | DEVOPS-ENGINEER |
| 13 | MIXA-033 | Theming system | 🟢 DONE | 005 | FRONTEND-ENGINEER |
| 14 | MIXA-012 | Content processor package | 🟢 DONE | 002 | KNOWLEDGE-ENGINEER |
| 15 | MIXA-013 | LLM provider abstraction (BYOK) | 🟢 DONE | 002 | KNOWLEDGE-ENGINEER |

### Sprint 2 — Knowledge Capture + AI Pipeline

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 16 | MIXA-011 | Content capture from web tabs | 🟢 DONE | 003, 006 | KNOWLEDGE-ENGINEER |
| 17 | MIXA-014 | Text chunking + embeddings | 🟢 DONE | 003, 013 | KNOWLEDGE-ENGINEER |
| 18 | MIXA-015 | Auto-summarize + auto-tag | 🔴 TODO | 014 | KNOWLEDGE-ENGINEER |
| 19 | MIXA-016 | Semantic + full-text search | 🔴 TODO | 014 | KNOWLEDGE-ENGINEER |
| 20 | MIXA-017 | RAG chat pipeline | 🔴 TODO | 016 | KNOWLEDGE-ENGINEER |
| 21 | MIXA-018 | Chat tab UI | 🔴 TODO | 017, 006 | KNOWLEDGE-ENGINEER |
| 22 | MIXA-019 | Knowledge browse/search tab | 🔴 TODO | 016, 011, 006 | FRONTEND-ENGINEER |
| 23 | MIXA-032 | Settings tab | 🔴 TODO | 013, 006 | FRONTEND-ENGINEER |
| 24 | MIXA-038 | Augmented browsing indicator | 🔴 TODO | 016, 006 | KNOWLEDGE-ENGINEER |

### Sprint 3 — Terminal Renderer + Engine Modules

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 25 | MIXA-020 | Fenix UI protocol (protobuf) | 🔴 TODO | 004 | TERMINAL-ENGINEER |
| 26 | MIXA-021 | Terminal renderer React components | 🔴 TODO | 020, 002 | TERMINAL-ENGINEER |
| 27 | MIXA-022 | Terminal tab + gRPC streaming | 🔴 TODO | 021, 010 | TERMINAL-ENGINEER |
| 28 | MIXA-023 | GUARD module (secrets) | 🔴 TODO | 020 | TERMINAL-ENGINEER |
| 29 | MIXA-024 | FORGE module (Git/GitHub) | 🔴 TODO | 020 | TERMINAL-ENGINEER |
| 30 | MIXA-025 | KEYS module (shortcuts) | 🔴 TODO | 020 | TERMINAL-ENGINEER |
| 31 | MIXA-026 | xterm.js shell fallback | 🔴 TODO | 022 | TERMINAL-ENGINEER |
| 32 | MIXA-027 | COST module | 🔴 TODO | 020 | TERMINAL-ENGINEER |
| 33 | MIXA-028 | PULSE module | 🔴 TODO | 020 | TERMINAL-ENGINEER |

### Sprint 4 — Dashboards + Polish + Ship

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 34 | MIXA-029 | Cost dashboard tab | 🔴 TODO | 027, 006 | FRONTEND-ENGINEER |
| 35 | MIXA-030 | Health dashboard tab | 🔴 TODO | 028, 006 | FRONTEND-ENGINEER |
| 36 | MIXA-031 | Knowledge stats dashboard | 🔴 TODO | 015, 006 | FRONTEND-ENGINEER |
| 37 | MIXA-035 | Electron packaging + build | 🔴 TODO | 010 | DEVOPS-ENGINEER |
| 38 | MIXA-036 | Auto-update mechanism | 🔴 TODO | 035 | DEVOPS-ENGINEER |
| 39 | MIXA-039 | Onboarding flow | 🔴 TODO | 032, 011, 018 | FRONTEND-ENGINEER |
| 40 | MIXA-040 | README + documentation | 🔴 TODO | 010, 022, 018 | DEVOPS-ENGINEER |

### Status Legend
- 🔴 TODO — Not started
- 🟡 IN PROGRESS — Ralph is working on it
- 🟢 DONE — Passes all acceptance criteria, committed
- 🔵 BLOCKED — Waiting on dependency or manual action

### Critical Path
```
MIXA-001 (monorepo)
  ├─→ MIXA-002 (types) ──→ MIXA-005 (electron) ──→ MIXA-006 (tabs) ──→ MIXA-011 (capture) ──→ ...
  ├─→ MIXA-003 (db) ──→ MIXA-014 (embeddings) ──→ MIXA-016 (search) ──→ MIXA-017 (RAG) ──→ MIXA-018 (chat UI)
  └─→ MIXA-004 (engine) ──→ MIXA-020 (protocol) ──→ MIXA-021 (renderer) ──→ MIXA-022 (terminal tab)
```

### Parallelization Notes
- After MIXA-001: tasks 002, 003, 004 can run in parallel (different agents)
- After MIXA-006: tasks 007, 008, 009 can run in parallel (all Electron)
- After MIXA-020: tasks 023, 024, 025, 027, 028 can run in parallel (independent modules)
- Sprint 1 foundation must complete before Sprint 2 knowledge features

### Sprint 5 — App Tabs, Canvas, Collaboration & Tab Management

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 41 | MIXA-041 | App tabs with session partitions | 🔴 TODO | 006 | ELECTRON-ENGINEER |
| 42 | MIXA-042 | Google Meet media bar integration | 🔴 TODO | 041 | ELECTRON-ENGINEER |
| 43 | MIXA-043 | Excalidraw Canvas tab | 🔴 TODO | 006 | FRONTEND-ENGINEER |
| 44 | MIXA-044 | Clerk licensing + workspace auth | 🔴 TODO | 032 | ELECTRON-ENGINEER |
| 45 | MIXA-045 | Workspace sharing via Clerk invites | 🔴 TODO | 044 | ELECTRON-ENGINEER |
| 46 | MIXA-046 | Replace PostgreSQL with PGlite | 🔴 TODO | 003 | ARCHITECT |
| 47 | MIXA-047 | Tab management (groups, sessions, history) | 🔴 TODO | 006, 046 | ELECTRON-ENGINEER |
| 48 | MIXA-048 | Simple Mode / Power Mode toggle | 🔴 TODO | 008, 032 | FRONTEND-ENGINEER |
| 49 | MIXA-049 | Backup to user's storage provider | 🔴 TODO | 046, 032 | ARCHITECT |
| 50 | MIXA-050 | Doppler integration for tokens | 🔴 TODO | 032 | ELECTRON-ENGINEER |

### Sprint 6 — Marketing Site

| # | Task ID | Title | Status | Dependencies | Agent |
|---|---------|-------|--------|--------------|-------|
| 51 | MIXA-051 | Marketing site with real UI simulation | 🔴 TODO | 006, 021, 018, 043 | FRONTEND-ENGINEER |

### Completion Tracking
- Total tasks: 51
- Completed: 17
- Remaining: 34
- Target: ~24 weeks (Phase 0 through Phase 8+)

### Scope Notes
- MIXA-046 (PGlite) should be prioritized early — it replaces the Docker/PostgreSQL dependency, dramatically lowering barrier to entry. Consider moving it into Sprint 1 right after MIXA-003.
- Sprint 5 tasks can largely be parallelized (App tabs, Canvas, Tab management are independent)
- Collaboration features (MIXA-044, MIXA-045) are lower priority and can slip to a later phase if needed
