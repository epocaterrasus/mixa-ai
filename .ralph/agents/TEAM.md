# Mixa AI Agent Team — Definitions & Responsibilities

## Agent Architecture

Mixa uses a **single Ralph loop** with **role-based context switching**. The loop prompt (PROMPT.md) stays constant, but vectordb chunks and specs provide deep context when Ralph picks a task from a specific domain.

This is NOT a multi-process orchestration. It's a single Claude Code instance that reads different context files depending on which task it's working on. The "agents" are personas/hats, not separate processes.

---

## Team Members

### 🏗️ ARCHITECT — System Design & Foundation
- **Scope**: Monorepo structure, shared types, database schema, build pipeline, protobuf definitions
- **Vectordb**: `chunk-00-identity.md`, `chunk-01-stack.md`, `chunk-02-schema.md`
- **Tasks**: MIXA-001 through MIXA-004
- **Backpressure**: `pnpm turbo typecheck`, `pnpm turbo build`

### 🖥️ ELECTRON-ENGINEER — Browser Shell & Desktop
- **Scope**: Electron main process, window management, Chromium integration, tab system, omnibar, sidebar, IPC, auto-update, packaging
- **Vectordb**: `chunk-03-electron.md`, `chunk-04-tabs.md`
- **Tasks**: MIXA-005 through MIXA-010
- **Backpressure**: `pnpm turbo build`, Electron app launches without errors

### 📚 KNOWLEDGE-ENGINEER — Capture, Search & RAG
- **Scope**: Content extraction, AI pipeline, embeddings, vector search, RAG chat, knowledge UI
- **Vectordb**: `chunk-05-knowledge.md`, `chunk-06-ai-pipeline.md`, `chunk-07-chat.md`
- **Tasks**: MIXA-011 through MIXA-019
- **Backpressure**: `pnpm turbo test`, embedding quality checks

### 🎯 TERMINAL-ENGINEER — Web-Rendered Terminal & Go Engine
- **Scope**: Fenix UI protocol, terminal renderer React components, Go engine modules, gRPC bridge
- **Vectordb**: `chunk-08-terminal.md`, `chunk-09-engine.md`, `chunk-10-modules.md`
- **Tasks**: MIXA-020 through MIXA-028
- **Backpressure**: `pnpm turbo test`, `go test ./...`, `go vet ./...`

### 🎨 FRONTEND-ENGINEER — Dashboard & Polish
- **Scope**: Dashboard tabs (cost, health, deploy), settings UI, themes, responsive layout, accessibility
- **Vectordb**: `chunk-11-dashboards.md`, `chunk-12-settings.md`
- **Tasks**: MIXA-029 through MIXA-034
- **Backpressure**: `pnpm turbo test`, `pnpm turbo build`, accessibility audit

### 🔧 DEVOPS-ENGINEER — Build, Package & Deploy
- **Scope**: Docker configs, GitHub Actions, electron-builder, auto-update, marketing site deploy
- **Vectordb**: `chunk-13-devops.md`
- **Tasks**: MIXA-035 through MIXA-040
- **Backpressure**: Docker builds, `electron-builder --dry-run`, workflow syntax validation

---

## Agent Communication Protocol

Agents communicate through `.ralph/comms/` markdown files:

```
comms/
  2026-02-21_001_ARCHITECT_to_ELECTRON-ENGINEER.md
  2026-02-21_002_TERMINAL-ENGINEER_to_FRONTEND-ENGINEER.md
  ...
```

### Communication Format

```markdown
# [FROM] → [TO] | [DATE] | [RE: TASK_ID]

## Context
What prompted this communication.

## Information / Decision / Request
The actual content.

## Impact
What the receiving agent needs to know or do differently.

## Status
- [ ] Acknowledged
- [ ] Acted upon
```

### When to Communicate

- **Type changes** in `packages/types` that affect other packages → ARCHITECT → all
- **Fenix UI protocol changes** → TERMINAL-ENGINEER → FRONTEND-ENGINEER
- **gRPC proto changes** → TERMINAL-ENGINEER → ELECTRON-ENGINEER
- **New environment variables** needed → any agent → DEVOPS-ENGINEER
- **Blockers requiring Edgar/Mija** → any agent → `.ralph/NOTES_FOR_EDGAR.md`

---

## How Ralph Uses This

When Ralph picks a task:
1. Identifies which agent role the task belongs to
2. Reads that agent's vectordb chunks for deep context
3. Checks `comms/` for any unacknowledged messages TO that agent
4. Implements the task
5. If the implementation affects another agent's domain, creates a comm file
6. Updates prd.json and IMPLEMENTATION_PLAN.md
