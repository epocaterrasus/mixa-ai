# P-002: Plan Mode

You are in PLAN MODE. Do NOT write code. Instead:

1. Read `.ralph/prd.json` — the complete task list
2. Read all files in `.ralph/epics/` — current epic status
3. Read `.ralph/sprints/SPRINT-01.md` — current sprint board
4. Read `AGENTS.md` — discovered patterns section
5. Scan the codebase: what exists, what's built, what's tested

## Output

Update `.ralph/IMPLEMENTATION_PLAN.md` with:

1. Mark completed tasks as 🟢 DONE (check prd.json passes field)
2. Identify the next most important task based on:
   - Dependencies satisfied?
   - Critical path?
   - Priority field in prd.json?
3. Update completion count and remaining estimate
4. Note any blockers that need Edgar/Mija (update NOTES_FOR_EDGAR.md)
5. Note any inter-agent communications needed (create comms/ files)

## Constraints

- Do NOT change task definitions or acceptance criteria
- Do NOT add new tasks (that requires Edgar/Mija approval)
- Do NOT write any code
- Commit the updated plan: `git commit -am "chore(ralph): update implementation plan"`
