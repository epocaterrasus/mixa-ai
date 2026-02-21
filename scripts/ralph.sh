#!/usr/bin/env bash
# ralph.sh — Mixa AI Ralph Wiggum Loop
# Usage: ./scripts/ralph.sh [max_iterations] [mode]
# Modes: build (default), plan, review, bootstrap
#
# All output streams in real-time to your terminal.
# Raw JSON logs saved per-iteration in .ralph/logs/

set -euo pipefail

MAX_ITERATIONS=${1:-10}
MODE=${2:-build}
ITERATION=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
mkdir -p .ralph/logs

echo "═══════════════════════════════════════════"
echo " MIXA AI — Ralph Wiggum Loop"
echo " Mode: $MODE"
echo " Max iterations: $MAX_ITERATIONS"
echo " Project root: $PROJECT_ROOT"
echo "═══════════════════════════════════════════"

# Streams claude output in real-time by using stream-json format
# and extracting text with python3 (available on macOS by default)
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
                    print(f'[ralph] $ {cmd}', flush=True)
                elif name in ('Edit', 'Write'):
                    path = inp.get('file_path', inp.get('path', ''))
                    print(f'[ralph] {name}: {path}', flush=True)
                elif name == 'Read':
                    path = inp.get('file_path', inp.get('path', ''))
                    print(f'[ralph] Reading: {path}', flush=True)
                else:
                    print(f'[ralph] Tool: {name}', flush=True)

    elif t == 'tool_result':
        pass  # tool results can be noisy, skip

    elif t == 'result':
        result = d.get('result', '')
        cost = d.get('total_cost_usd', 0)
        duration = d.get('duration_ms', 0)
        turns = d.get('num_turns', 0)
        print(f'', flush=True)
        print(f'[ralph] Done. {turns} turns, {duration/1000:.1f}s, \${cost:.4f}', flush=True)
        if result:
            # Write final result to log
            with open('$log_file', 'w') as f:
                f.write(result)
  " || true
}

case "$MODE" in
  plan)
    PROMPT_FILE=".ralph/prompts/P-002-plan-mode.md"
    ;;
  review)
    PROMPT_FILE=".ralph/prompts/P-003-review-mode.md"
    ;;
  bootstrap)
    PROMPT_FILE=".ralph/prompts/P-001-bootstrap.md"
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    LOG_FILE=".ralph/logs/bootstrap-$(date '+%Y%m%d-%H%M%S').log"
    echo "Running bootstrap..."
    echo "Log: $LOG_FILE"
    echo ""
    echo "[$TIMESTAMP] Bootstrap started" >> .ralph/logs/ralph-loop.log
    run_claude_streaming "$PROMPT_FILE" "$LOG_FILE"
    echo ""
    echo "═══════════════════════════════════════════"
    echo " Bootstrap complete. Log: $LOG_FILE"
    echo "═══════════════════════════════════════════"
    exit 0
    ;;
  *)
    PROMPT_FILE=".ralph/PROMPT.md"
    ;;
esac

echo "Using prompt: $PROMPT_FILE"
echo ""

while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
  ITERATION=$((ITERATION + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  LOG_FILE=".ralph/logs/iteration-$(printf '%03d' $ITERATION)-$(date '+%Y%m%d-%H%M%S').log"

  echo "───────────────────────────────────────────"
  echo " Iteration $ITERATION / $MAX_ITERATIONS — $TIMESTAMP"
  echo " Log: $LOG_FILE"
  echo "───────────────────────────────────────────"

  echo "[$TIMESTAMP] Iteration $ITERATION started (mode: $MODE)" >> .ralph/logs/ralph-loop.log

  run_claude_streaming "$PROMPT_FILE" "$LOG_FILE"

  # Check for completion signal
  if grep -q '<promise>COMPLETE</promise>' "$LOG_FILE" 2>/dev/null; then
    echo ""
    echo "═══════════════════════════════════════════"
    echo " COMPLETE — All tasks done!"
    echo " Iterations used: $ITERATION"
    echo "═══════════════════════════════════════════"
    echo "[$TIMESTAMP] COMPLETE signal received after $ITERATION iterations" >> .ralph/logs/ralph-loop.log
    exit 0
  fi

  if git diff --quiet && git diff --cached --quiet; then
    echo ""
    echo "No changes in this iteration."
  else
    echo ""
    echo "Changes detected. Pushing to remote..."
    git push origin main 2>/dev/null || echo "Push failed (no remote or auth issue)"
  fi

  echo ""
  echo "Iteration $ITERATION complete. Sleeping 5 seconds before next..."
  sleep 5
done

echo ""
echo "═══════════════════════════════════════════"
echo " Max iterations ($MAX_ITERATIONS) reached."
echo " Run again to continue."
echo "═══════════════════════════════════════════"
