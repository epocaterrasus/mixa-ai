#!/usr/bin/env bash
# ralph-forever.sh — Outer wrapper that restarts ralph.sh if it ever dies
# Usage: ./scripts/ralph-forever.sh [max_iterations] [mode]
#   or:  nohup ./scripts/ralph-forever.sh 0 build >> .ralph/logs/ralph-output.log 2>&1 &
#
# Run this instead of ralph.sh directly.
# If ralph.sh crashes for ANY reason, it restarts after 5 seconds.
# Only stops on Ctrl+C (or kill the PID).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

set +e
trap '' PIPE HUP
trap 'echo ""; echo "[forever] Stopped."; exit 0' INT TERM

cd "$PROJECT_ROOT"

echo "[forever] PID: $$"
echo "[forever] PID: $$" >> .ralph/logs/ralph-loop.log

while true; do
  echo "[forever] Starting ralph.sh..."
  echo ""
  "$SCRIPT_DIR/ralph.sh" "$@"
  EXIT_CODE=$?
  echo ""
  echo "[forever] ralph.sh exited with code $EXIT_CODE"
  echo "[forever] Restarting in 5 seconds... (Ctrl+C to stop)"
  sleep 5
done
