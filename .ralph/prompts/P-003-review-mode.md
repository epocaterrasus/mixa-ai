# P-003: Review Mode

You are in REVIEW MODE. Audit the current codebase quality.

## Steps

1. Run all backpressure checks:
   ```bash
   pnpm turbo typecheck
   pnpm turbo lint
   pnpm turbo test
   pnpm turbo build
   cd engine && go vet ./... && go test ./...
   ```

2. For each package with code:
   - Check test coverage: are all functions/endpoints tested?
   - Check type safety: any `any` types or `@ts-ignore`?
   - Check error handling: are all error paths covered?
   - Check Electron security: nodeIntegration disabled? contextBridge used?

3. Check cross-package consistency:
   - Do shared types in packages/types match actual usage?
   - Do Drizzle schemas match the PRD database design?
   - Do tRPC procedures match the types they claim?
   - Does terminal renderer handle all UI protocol component types?

4. Check Go engine:
   - Do proto definitions compile?
   - Are gRPC handlers tested?
   - Is SQLite encryption properly implemented?

5. Check documentation:
   - Does each package README reflect current state?
   - Are new dependencies documented?

## Output

Create a review report at `.ralph/logs/review-{date}.md` with:
- ✅ What's good
- ⚠️ What needs improvement
- 🔴 What's broken

Update `AGENTS.md` Discovered Patterns section with any learnings.

Do NOT fix issues in review mode. Just document them. The next build iteration will pick them up.
