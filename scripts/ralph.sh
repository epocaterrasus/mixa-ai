#!/usr/bin/env bash
# ralph.sh — Mixa AI Ralph Wiggum Loop
# Usage: ./scripts/ralph.sh [max_iterations] [mode]
# Modes: build (default), plan, review
#
# UNKILLABLE: This script will NOT stop unless:
#   - All tasks in prd.json pass
#   - You hit Ctrl+C
#   - You pass a max_iterations limit
#
# If Claude crashes, API errors, EPIPE, whatever — it just retries.

# UNKILLABLE: no set -e, no pipefail, trap all signals
set +e
set +o pipefail 2>/dev/null || true
trap '' PIPE          # Ignore SIGPIPE — this is what kills us on EPIPE
trap 'echo ""; echo "[ralph] Ctrl+C detected. Stopping..."; exit 130' INT

MAX_ITERATIONS="${1:-0}"
MODE="${2:-build}"
ITERATION=0
CONSECUTIVE_FAILURES=0
MAX_CONSECUTIVE_FAILURES=5
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
      brew install go 2>&1 || echo "[ralph] Go install failed, will retry later"
    fi
  fi

  if ! command -v protoc &>/dev/null; then
    echo "[ralph] protoc not found. Installing via Homebrew..."
    if command -v brew &>/dev/null; then
      brew install protobuf 2>&1 || echo "[ralph] protoc install failed"
    fi
  fi

  echo "[ralph] node $(node --version 2>/dev/null || echo 'MISSING')"
  echo "[ralph] pnpm $(pnpm --version 2>/dev/null || echo 'MISSING')"
  echo "[ralph] go $(go version 2>/dev/null | awk '{print $3}' || echo 'MISSING')"
  echo "[ralph] git $(git --version 2>/dev/null | awk '{print $3}' || echo 'MISSING')"
}

# ─── Auto-commit if Ralph didn't ────────────────────────────────
auto_commit() {
  local iteration="$1"

  # Check for any changes (tracked, staged, or untracked)
  local has_changes=false
  git diff --quiet 2>/dev/null || has_changes=true
  git diff --cached --quiet 2>/dev/null || has_changes=true
  if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    has_changes=true
  fi

  if [ "$has_changes" = false ]; then
    echo "[ralph] No changes to commit."
    return
  fi

  # Check if Ralph already committed recently (within last 2 min)
  local now last_commit_ts last_commit_age
  now=$(date +%s)
  last_commit_ts=$(git log -1 --format=%ct 2>/dev/null || echo "0")
  last_commit_age=$((now - last_commit_ts))

  if [ "$last_commit_age" -lt 120 ]; then
    echo "[ralph] Ralph already committed recently."
  else
    echo "[ralph] Auto-committing changes..."
    git add -A 2>/dev/null
    git commit -m "feat(ralph): iteration $iteration — auto-commit" 2>/dev/null || true
  fi

  # Push if remote exists
  if git remote 2>/dev/null | grep -q origin; then
    git push origin "$(git branch --show-current 2>/dev/null || echo main)" 2>/dev/null || true
  fi
}

# ─── Stream claude output in real-time ──────────────────────────
run_claude_streaming() {
  local prompt_file="$1"
  local log_file="$2"

  # Run in a subshell so SIGPIPE/EPIPE can't kill our main loop
  (
    trap '' PIPE
    cat "$prompt_file" | claude -p \
      --dangerously-skip-permissions \
      --verbose \
      --output-format stream-json 2>&1 | \
    python3 -u -c "
import sys, json, signal

# Ignore SIGPIPE in python too
signal.signal(signal.SIGPIPE, signal.SIG_DFL)

try:
  for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try: d = json.loads(line)
    except: print(line, flush=True); continue
    t = d.get('type', '')
    if t == 'system':
      print(f'[ralph] Model: {d.get(\"model\",\"?\")}, session started', flush=True)
    elif t == 'assistant':
      for block in d.get('message',{}).get('content',[]):
        bt = block.get('type','')
        if bt == 'text':
          txt = block.get('text','')
          if txt: print(txt, flush=True)
        elif bt == 'tool_use':
          nm = block.get('name','')
          inp = block.get('input',{})
          if nm == 'Bash': print(f'[ralph] \$ {inp.get(\"command\",\"\")}', flush=True)
          elif nm in ('Edit','Write'): print(f'[ralph] {nm}: {inp.get(\"file_path\",inp.get(\"path\",\"\"))}', flush=True)
          elif nm == 'Read': print(f'[ralph] Reading: {inp.get(\"file_path\",inp.get(\"path\",\"\"))}', flush=True)
          else: print(f'[ralph] Tool: {nm}', flush=True)
    elif t == 'result':
      r = d.get('result',''); c = d.get('total_cost_usd',0); dur = d.get('duration_ms',0); n = d.get('num_turns',0)
      s = 'ERROR' if d.get('is_error') else 'Done'
      print(f'\n[ralph] {s}. {n} turns, {dur/1000:.1f}s, \${c:.4f}', flush=True)
      try:
        with open('$log_file','w') as f: f.write(r or '')
      except: pass
    elif t == 'error':
      print(f'[ralph] API ERROR: {d.get(\"message\",d.get(\"error\",\"?\"))}', flush=True)
except: pass
" 2>/dev/null
  ) 2>/dev/null
  return $?
}

# ─── Progress check ─────────────────────────────────────────────
check_progress() {
  python3 -c "
import json
try:
    d = json.load(open('.ralph/prd.json'))
    done = sum(1 for s in d['userStories'] if s['passes'])
    total = len(d['userStories'])
    print(f'{done}/{total}')
except:
    print('?/?')
" 2>/dev/null || echo "?/?"
}

# ─── Main ───────────────────────────────────────────────────────

echo "═══════════════════════════════════════════"
echo " MIXA AI — Ralph Wiggum Loop"
echo " Mode: $MODE"
echo " Max iterations: $([ "$MAX_ITERATIONS" -eq 0 ] && echo 'UNLIMITED' || echo "$MAX_ITERATIONS")"
echo " Project root: $PROJECT_ROOT"
echo "═══════════════════════════════════════════"
echo ""

install_deps
echo ""

case "$MODE" in
  plan)   PROMPT_FILE=".ralph/prompts/P-002-plan-mode.md" ;;
  review) PROMPT_FILE=".ralph/prompts/P-003-review-mode.md" ;;
  *)      PROMPT_FILE=".ralph/PROMPT.md" ;;
esac

echo "Using prompt: $PROMPT_FILE"
echo "Progress: $(check_progress) tasks complete"
echo "Loop: UNLIMITED — runs until all tasks pass or Ctrl+C"
echo ""

while true; do
  # Check iteration limit (0 = unlimited)
  if [ "$MAX_ITERATIONS" -gt 0 ] 2>/dev/null && [ "$ITERATION" -ge "$MAX_ITERATIONS" ] 2>/dev/null; then
    break
  fi

  ITERATION=$((ITERATION + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  LOG_FILE=".ralph/logs/iteration-$(printf '%03d' "$ITERATION")-$(date '+%Y%m%d-%H%M%S').log"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Iteration $ITERATION — $TIMESTAMP"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[$TIMESTAMP] Iteration $ITERATION started (mode: $MODE)" >> .ralph/logs/ralph-loop.log

  # Run Claude
  run_claude_streaming "$PROMPT_FILE" "$LOG_FILE"
  CLAUDE_EXIT=$?

  # Track consecutive failures for backoff
  if [ "$CLAUDE_EXIT" -ne 0 ] || [ ! -s "$LOG_FILE" ]; then
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    echo ""
    echo "[ralph] Iteration failed (exit=$CLAUDE_EXIT, consecutive=$CONSECUTIVE_FAILURES)"

    if [ "$CONSECUTIVE_FAILURES" -ge "$MAX_CONSECUTIVE_FAILURES" ]; then
      BACKOFF=$((CONSECUTIVE_FAILURES * 30))
      echo "[ralph] $CONSECUTIVE_FAILURES consecutive failures. Backing off ${BACKOFF}s..."
      echo "[ralph] (API might be rate-limited or down. Will auto-retry.)"
      sleep "$BACKOFF"
    else
      echo "[ralph] Retrying in 10s..."
      sleep 10
    fi
  else
    CONSECUTIVE_FAILURES=0
  fi

  # Auto-commit if Ralph didn't
  auto_commit "$ITERATION"

  # Check for completion signal
  if [ -f "$LOG_FILE" ] && grep -q '<promise>COMPLETE</promise>' "$LOG_FILE" 2>/dev/null; then
    echo ""
    echo "═══════════════════════════════════════════"
    echo " ALL TASKS COMPLETE"
    echo " Iterations: $ITERATION"
    echo " Progress: $(check_progress)"
    echo "═══════════════════════════════════════════"
    echo "[$TIMESTAMP] COMPLETE after $ITERATION iterations" >> .ralph/logs/ralph-loop.log
    exit 0
  fi

  # Show progress
  PROGRESS=$(check_progress)
  echo ""
  echo "[ralph] Progress: $PROGRESS tasks complete"
  echo "[ralph] Next iteration in 3s..."
  sleep 3
done

echo ""
echo "═══════════════════════════════════════════"
echo " Stopped after $ITERATION iterations."
echo " Progress: $(check_progress)"
echo "═══════════════════════════════════════════"
