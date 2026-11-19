#!/usr/bin/env bash
# Start the next pending build from MODELS.md tier B (free lane) without human steps.
set -euo pipefail
cd "$(dirname "$0")/.."
SESSION=openos-build
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "build already running in tmux:$SESSION - queue respected, skipping"; exit 0
fi
QUEUE=(opencode/hy4-flash-free opencode/longcat-2.5-free opencode/mimo-v2.6-flash-free opencode/nemotron-3.5-lightning-free opencode/flint-40b-free opencode/inkling-2-small-free)
for M in "${QUEUE[@]}"; do
  SHORT=${M#opencode/}; SHORT=${SHORT%-free}; SHORT=${SHORT//./}
  DIR=runs/run-00-$SHORT
  [ -f "$DIR/harness-report.json" ] && continue
  [ -f "$DIR/.attempted" ] && continue
  touch "$DIR/.attempted" 2>/dev/null || mkdir -p "$DIR" && touch "$DIR/.attempted"
  tmux new-session -d -s "$SESSION" -c "$PWD" \
    "bash run-worker.sh $M $DIR 2>&1 | tee $DIR/worker.log"
  echo "started $M -> $DIR at $(date -Is)"
  exit 0
done
echo "queue empty"
