# Prompt Repository — Mixa AI

All prompts used in the Mixa AI development lifecycle.

## Prompt Catalog

| ID | Name | Purpose | Used By | File |
|----|------|---------|---------|------|
| P-001 | Bootstrap | First prompt — initialize monorepo, verify environment | Claude Code (Ralph) | `P-001-bootstrap.md` |
| P-002 | Plan Mode | Update IMPLEMENTATION_PLAN.md, no code | Claude Code (Ralph) | `P-002-plan-mode.md` |
| P-003 | Review Mode | Audit quality, find issues, no code | Claude Code (Ralph) | `P-003-review-mode.md` |

## Usage

### Starting Ralph (first time)
```bash
cd mixa-ai
cat .ralph/prompts/P-001-bootstrap.md | claude -p
```

### Running Ralph Loop (continuous)
```bash
cd mixa-ai
./scripts/ralph.sh 20 build
```

### Plan Mode (update priorities)
```bash
./scripts/ralph.sh 1 plan
```

### Review Mode (audit quality)
```bash
./scripts/ralph.sh 1 review
```
