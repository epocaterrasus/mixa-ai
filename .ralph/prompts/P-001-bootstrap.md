# P-001: Bootstrap Mixa AI Project

You are initializing the Mixa AI project. This is the FIRST prompt in the Ralph Wiggum loop.

## Your Environment

You are running on a development machine with:
- **Node.js 20+** and **pnpm** installed
- **Go 1.22+** installed
- **Docker** running (for PostgreSQL + Redis)
- **Git** configured
- **Claude Code** (you are this)

## Step 1: Read the Ralph System

Before doing ANYTHING, read these files in order:
1. `.ralph/PROMPT.md` — Your persistent identity and loop instructions
2. `AGENTS.md` — Build/test commands
3. `.ralph/prd.json` — The complete task list
4. `.ralph/IMPLEMENTATION_PLAN.md` — Priority order
5. `.ralph/agents/TEAM.md` — Agent roles
6. `.ralph/NOTES_FOR_EDGAR.md` — Things you can't do (need Edgar/Mija)

## Step 2: Verify Environment

```bash
node --version          # Should be 20+
pnpm --version          # Should be 9+
go version              # Should be 1.22+
docker --version        # Docker installed
git --version           # Git installed
```

## Step 3: Initialize the Monorepo (MIXA-001)

This is the first task in prd.json. Do it now:

1. **Update root package.json** (already exists as scaffold):
   - name: `mixa-ai`
   - private: true
   - scripts: standard turbo commands
   - devDependencies: turborepo, typescript, eslint, prettier, tailwindcss

2. **Update turbo.json** with pipelines:
   - build: depends on ^build
   - test: depends on build
   - lint: no dependencies
   - typecheck: no dependencies
   - dev: cache false, persistent true

3. **Create tsconfig.base.json** (strict mode, ES2022, NodeNext)

4. **Create each package**:
   - `apps/desktop/package.json` — electron, electron-vite, react, typescript
   - `apps/web/package.json` — next, react, typescript (can be minimal for now)
   - `packages/ui/package.json` — react, tailwindcss, shadcn deps
   - `packages/types/package.json` — typescript only (no runtime deps)
   - `packages/ai-pipeline/package.json` — openai, @anthropic-ai/sdk, zod
   - `packages/terminal-renderer/package.json` — react
   - `packages/content-processor/package.json` — @mozilla/readability, jsdom, turndown
   - `packages/db/package.json` — drizzle-orm, drizzle-kit, postgres

5. **Create engine/go.mod** and basic directory structure

6. **Create Makefile** with targets: all, build-engine, build-js, dev, clean

7. **Install dependencies**: `pnpm install`

8. **Verify**: `pnpm turbo build` should succeed (empty builds OK)

## Step 4: Update Task Status

After completing MIXA-001:
1. In `.ralph/prd.json`, set MIXA-001 `passes: true`
2. In `.ralph/IMPLEMENTATION_PLAN.md`, update MIXA-001 status to 🟢 DONE
3. Commit: `git add -A && git commit -m "feat(root): initialize monorepo with Turborepo + pnpm"`

## Step 5: Continue or Exit

If you have context budget remaining, continue to MIXA-002 (shared types) or MIXA-003 (database).
If not, exit cleanly. The next Ralph loop iteration will pick up where you left off.

## Reminders

- **NEVER** use `any` type in TypeScript. Strict mode everywhere.
- **NEVER** enable nodeIntegration in Electron renderer.
- Commit after each completed task with conventional commit format.
- Update prd.json AND IMPLEMENTATION_PLAN.md after each task.
