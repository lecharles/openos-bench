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
  # (Nov 24 fix: Status is field $7 not $8; old code checked the empty Harness col and
  #  clobbered the grep fallback -> false "roster exhausted" since Nov 19)
  line=$(awk -F'|' 'NR>4 && $7 ~ /queued/ {print; exit}' "$REPO/eval/model-roster.md")
  [ -z "$line" ] && { echo "[train] roster exhausted - needs human refresh"; exit 0; }
  run=$(echo "$line" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
  # Nov 27 fix: roster row numbers can carry suffixes ("05+" queued insert) ->
  # arithmetic on "05+" crashed the start branch (syntax error 11-27 08:0x), stalling GLM-5.4's slot attempt.
  runnum=$(echo "$run" | tr -cd '0-9')
  model=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}' | tr -d '*')
  # model id slug: keep first token, lowercase
  slug=$(echo "$model" | awk '{print tolower($1)}' | tr -cd 'a-z0-9.-')
  rundir="$LOGDIR/run-$((10#$runnum))-$slug"
  # Nov 25 fix: unanchored prefix grep built run-05 with the WRONG model:
  # "Kimi K3.1" -> "^Kimi" matched Kimi-K2.7-Code (map order) before Kimi.
  # Exact match first, then first-token match ANCHORED ON "=", else abort.
  keyid="$(grep -m1 "^${model}=" "$LOGDIR/model-ids.map" 2>/dev/null | cut -d= -f2-)"
  [ -z "$keyid" ] && keyid="$(grep -m1 "^${model% *}=" "$LOGDIR/model-ids.map" 2>/dev/null | cut -d= -f2-)"
  if [ -z "$keyid" ]; then
    amb=$(grep -c "^${model% *}=" "$LOGDIR/model-ids.map" 2>/dev/null || echo 0)
    [ "$amb" -gt 1 ] && { echo "[train] AMBIGUOUS map keys for '$model' - refusing to guess"; exit 1; }
    keyid="opencode-go/$slug"
  fi
  echo "[train] starting run $run ($model) -> $rundir"
  tmux new-session -d -s "openos-run$run" "bash $REPO/run-worker.sh '$keyid' '$rundir' 2>&1 | tee $LOGDIR/run-$run-$slug.log"
  echo "$run $slug $rundir" > "$STATE"
elif [ "$action" = "finish-last" ]; then
  read -r run slug rundir < "$STATE" 2>/dev/null || { echo "[train] no state"; exit 0; }
  runnum=$(echo "$run" | tr -cd '0-9')
  [ -f "$rundir/STATUS.md" ] || { echo "[train] run $run still building (no STATUS.md)"; exit 0; }
  # boot the model's build on a free port
  port=$((3100 + 10#$runnum))
  (cd "$rundir" && PORT=$port nohup npm start >/dev/null 2>&1 &) ; sleep 5
  mkdir -p "$REPO/eval/harness/results"
  NODE_PATH=$(npm root -g) timeout 300 node "$REPO/eval/harness/harness.js" "http://localhost:$port/" "$REPO/eval/harness/results/run-$runnum-$slug"
  # Nov 27 fix: model-authored server.js binds 0.0.0.0 (sanitized only at ingest) - the train's
  # raw-rundir boot sat exposed on 31005 for ~9h on Nov 27. Tear it down right after scoring.
  TP=$(ss -ltnp 2>/dev/null | grep ":$port " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
  [ -n "$TP" ] && kill $TP 2>/dev/null && echo "[train] teardown: killed port $port listener ($TP)"
  echo "[train] harness results committed path: eval/harness/results/run-$runnum-$slug"
fi
