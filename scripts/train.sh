#!/usr/bin/env bash
# OpenOS Bench daily train - token-free orchestration (crontab on host)
# 05:00 PT  start-next: launch first `queued`/unstarted roster row via run-worker.sh in tmux
# 08:30 PT  finish-last: run neutral harness against the previous night's run + commit evidence
# State: /home/hermes/openos-bench/.train-state (current run dir + slot)
set -uo pipefail
REPO=/home/hermes/openos-bench
STATE="$REPO/.train-state"
LOGDIR=/home/hermes/openos-runs
mkdir -p "$LOGDIR"

action="${1:-start-next}"

if [ "$action" = "start-next" ]; then
  # skip if a worker session is already alive
  if tmux ls 2>/dev/null | grep -q '^openos-run'; then echo "[train] worker already running, skip"; exit 0; fi
  # parse first queued row from roster: | NN | Model | ... capture run number + model display name
  line=$(grep -m1 '| queued' "$REPO/eval/model-roster.md" || true)
  # fallback: scan rows for 'queued' anywhere in status column
  line=$(awk -F'|' 'NR>4 && $8 ~ /queued/ {print; exit}' "$REPO/eval/model-roster.md")
  [ -z "$line" ] && { echo "[train] roster exhausted - needs human refresh"; exit 0; }
  run=$(echo "$line" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
  model=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')
  # model id slug: keep first token, lowercase
  slug=$(echo "$model" | awk '{print tolower($1)}' | tr -cd 'a-z0-9.-')
  rundir="$LOGDIR/run-$((10#$run))-$slug"
  keyid="$(grep -m1 "^${model% *}" "$LOGDIR/model-ids.map" 2>/dev/null | cut -d= -f2-)"
  keyid="${keyid:-opencode-go/$slug}"
  echo "[train] starting run $run ($model) -> $rundir"
  tmux new-session -d -s "openos-run$run" "bash $REPO/run-worker.sh '$keyid' '$rundir' 2>&1 | tee $LOGDIR/run-$run-$slug.log"
  echo "$run $slug $rundir" > "$STATE"
elif [ "$action" = "finish-last" ]; then
  read -r run slug rundir < "$STATE" 2>/dev/null || { echo "[train] no state"; exit 0; }
  [ -f "$rundir/STATUS.md" ] || { echo "[train] run $run still building (no STATUS.md)"; exit 0; }
  # boot the model's build on a free port
  port=310$run
  (cd "$rundir" && PORT=$port nohup npm start >/dev/null 2>&1 &) ; sleep 5
  mkdir -p "$REPO/eval/harness/results"
  NODE_PATH=$(npm root -g) timeout 300 node "$REPO/eval/harness/harness.js" "http://localhost:$port/" "$REPO/eval/harness/results/run-$run-$slug"
  echo "[train] harness results committed path: eval/harness/results/run-$run-$slug"
fi
