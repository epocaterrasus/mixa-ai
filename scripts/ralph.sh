#!/usr/bin/env bash
# ralph.sh — Mixa AI Ralph Wiggum Loop
# Usage: ./scripts/ralph.sh [max_iterations] [mode]
# Modes: build (default), plan, review
#
# No separate "bootstrap" — build mode handles everything from scratch.
# Streams all output in real-time.
# Auto-commits after each iteration if there are changes.
# Auto-installs missing tools (Go, protoc, etc.).
# Keeps looping until all tasks pass or max_iterations reached.

set -uo pipefail
# Note: no -e — we handle errors ourselves so the loop doesn't die

MAX_ITERATIONS=${1:-0}
MODE=${2:-build}
ITERATION=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
mkdir -p .ralph/logs

# ─── Auto-install missing dependencies ──────────────────────────
install_deps() {
  echo "[ralph] Checking dependencies..."

  if ! command -v go &>/dev/null; then
    echo "[ralph] Go not found. Installing via Homebrew..."
    if command -v brew &>/dev/null; then
      brew install go
    else
      echo "[ralph] ERROR: Homebrew not found. Install Go manually: https://go.dev/dl/"
      echo "[ralph] Continuing without Go (engine tasks will be skipped)..."
    fi
  fi

  if ! command -v protoc &>/dev/null; then
    echo "[ralph] protoc not found. Installing via Homebrew..."
    if command -v brew &>/dev/null; then
      brew install protobuf
    else
      echo "[ralph] protoc not available — gRPC proto compilation will fail."
    fi
  fi

  echo "[ralph] node $(node --version 2>/dev/null || echo 'NOT FOUND')"
  echo "[ralph] pnpm $(pnpm --version 2>/dev/null || echo 'NOT FOUND')"
  echo "[ralph] go $(go version 2>/dev/null | awk '{print $3}' || echo 'NOT FOUND')"
  echo "[ralph] git $(git --version 2>/dev/null | awk '{print $3}' || echo 'NOT FOUND')"
}

# ─── Auto-commit if Ralph didn't ────────────────────────────────
auto_commit() {
  local iteration="$1"

  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "[ralph] No changes to commit."
    return
  fi

  # Check if Ralph already committed (last commit within last 2 minutes)
  local last_commit_age
  last_commit_age=$(( $(date +%s) - $(git log -1 --format=%ct 2>/dev/null || echo 0) ))
  if [ "$last_commit_age" -lt 120 ]; then
    echo "[ralph] Ralph already committed. Pushing..."
  else
    echo "[ralph] Ralph didn't commit. Auto-committing..."
    git add -A
    git commit -m "feat(ralph): iteration $iteration — auto-commit

Automated commit by ralph.sh after iteration $iteration.
Ralph did not commit, so the script committed on its behalf." || true
  fi

  # Push if remote exists
  if git remote | grep -q origin; then
    git push origin "$(git branch --show-current)" 2>/dev/null || echo "[ralph] Push failed (no remote or auth issue)"
  fi
}

# ─── Stream claude output in real-time ──────────────────────────
run_claude_streaming() {
  local prompt_file="$1"
  local log_file="$2"

  cat "$prompt_file" | claude -p \
    --dangerously-skip-permissions \
    --verbose \
    --output-format stream-json 2>&1 | \
  python3 -u -c "
import sys, json

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
    except json.JSONDecodeError:
        print(line, flush=True)
        continue

    t = d.get('type', '')

    if t == 'system':
        model = d.get('model', 'unknown')
        print(f'[ralph] Model: {model}', flush=True)

    elif t == 'assistant':
        msg = d.get('message', {})
        for block in msg.get('content', []):
            if block.get('type') == 'text':
                text = block.get('text', '')
                if text:
                    print(text, flush=True)
            elif block.get('type') == 'tool_use':
                name = block.get('name', '')
                inp = block.get('input', {})
                if name == 'Bash':
                    cmd = inp.get('command', '')
                    print(f'[ralph] \$ {cmd}', flush=True)
                elif name in ('Edit', 'Write'):
                    path = inp.get('file_path', inp.get('path', ''))
                    print(f'[ralph] {name}: {path}', flush=True)
                elif name == 'Read':
                    path = inp.get('file_path', inp.get('path', ''))
                    print(f'[ralph] Reading: {path}', flush=True)
                else:
                    print(f'[ralph] Tool: {name}', flush=True)

    elif t == 'tool_result':
        pass

    elif t == 'result':
        result = d.get('result', '')
        cost = d.get('total_cost_usd', 0)
        duration = d.get('duration_ms', 0)
        turns = d.get('num_turns', 0)
        print(f'', flush=True)
        print(f'[ralph] Done. {turns} turns, {duration/1000:.1f}s, \${cost:.4f}', flush=True)
        if result:
            with open('${log_file}', 'w') as f:
                f.write(result)
  " || true
}

# ─── Main ───────────────────────────────────────────────────────

echo "═══════════════════════════════════════════"
echo " MIXA AI — Ralph Wiggum Loop"
echo " Mode: $MODE"
echo " Max iterations: $MAX_ITERATIONS"
echo " Project root: $PROJECT_ROOT"
echo "═══════════════════════════════════════════"
echo ""

# Install missing deps before starting
install_deps
echo ""

case "$MODE" in
  plan)
    PROMPT_FILE=".ralph/prompts/P-002-plan-mode.md"
    ;;
  review)
    PROMPT_FILE=".ralph/prompts/P-003-review-mode.md"
    ;;
  *)
    PROMPT_FILE=".ralph/PROMPT.md"
    ;;
esac

echo "Using prompt: $PROMPT_FILE"
if [ "$MAX_ITERATIONS" -eq 0 ]; then
  echo "Looping until ALL tasks complete (unlimited)..."
else
  echo "Looping until all tasks complete or $MAX_ITERATIONS iterations..."
fi
echo ""

while true; do
  # Check iteration limit (0 = unlimited)
  if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    break
  fi
  ITERATION=$((ITERATION + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  LOG_FILE=".ralph/logs/iteration-$(printf '%03d' $ITERATION)-$(date '+%Y%m%d-%H%M%S').log"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " 🔄 Iteration $ITERATION / $MAX_ITERATIONS — $TIMESTAMP"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[$TIMESTAMP] Iteration $ITERATION started (mode: $MODE)" >> .ralph/logs/ralph-loop.log

  # Run Claude — if it crashes, we keep going
  run_claude_streaming "$PROMPT_FILE" "$LOG_FILE"

  # Auto-commit if Ralph didn't
  auto_commit "$ITERATION"

  # Check for completion signal
  if [ -f "$LOG_FILE" ] && grep -q '<promise>COMPLETE</promise>' "$LOG_FILE" 2>/dev/null; then
    echo ""
    echo "═══════════════════════════════════════════"
    echo " ✅ COMPLETE — All tasks done!"
    echo " Iterations used: $ITERATION"
    echo "═══════════════════════════════════════════"
    echo "[$TIMESTAMP] COMPLETE signal received after $ITERATION iterations" >> .ralph/logs/ralph-loop.log
    exit 0
  fi

  # Quick progress check — how many tasks are done?
  DONE_COUNT=$(python3 -c "import json; d=json.load(open('.ralph/prd.json')); print(sum(1 for s in d['userStories'] if s['passes']))" 2>/dev/null || echo "?")
  TOTAL_COUNT=$(python3 -c "import json; d=json.load(open('.ralph/prd.json')); print(len(d['userStories']))" 2>/dev/null || echo "?")
  echo ""
  echo "[ralph] Progress: $DONE_COUNT / $TOTAL_COUNT tasks complete"

  echo ""
  echo "[ralph] Sleeping 3 seconds before next iteration..."
  sleep 3
done

if [ "$MAX_ITERATIONS" -gt 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════"
  echo " Max iterations ($MAX_ITERATIONS) reached."
  echo " Progress: $DONE_COUNT / $TOTAL_COUNT tasks"
  echo " Run again to continue."
  echo "═══════════════════════════════════════════"
fi
