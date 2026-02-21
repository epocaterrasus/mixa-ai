#!/usr/bin/env bash
# ralph-forever.sh — Outer wrapper that restarts ralph.sh if it ever dies
# Usage: ./scripts/ralph-forever.sh
#
# Run this instead of ralph.sh directly.
# If ralph.sh crashes for ANY reason, it restarts after 5 seconds.
# Only stops on Ctrl+C.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

trap 'echo ""; echo "[forever] Stopped."; exit 0' INT

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
