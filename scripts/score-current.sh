#!/usr/bin/env bash
# Score the most recent finished build, publish evidence, start the next one.
# Fully automated - the human pass is async and never gates this.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. find a completed but unscored run dir
RUN=$(find runs -maxdepth 1 -type d -name 'run-*' ! -name 'harness-*' ! -name 'run-02-*' | sort | while read d; do
  [ -f "$d/server.js" ] && [ ! -f "$d/harness-report.json" ] && echo "$d" && break
done)
[ -z "$RUN" ] && { echo "nothing new to score"; exit 0; }

# 2. if the build session is still alive, skip until it ends
if tmux has-session -t openos-build 2>/dev/null; then
  LIVE=$(tmux ls 2>/dev/null | grep -c openos-build || true)
  [ "$LIVE" -gt 0 ] && echo "build still running - will score next cycle" && exit 0
fi

# 3. serve the build, sanitize port env, score it
export PORT=3082
(node "$RUN/server.js" >/tmp/score-server.log 2>&1 &) 
sleep 3
if ! curl -sf -o /dev/null http://127.0.0.1:3082/; then
  echo "build did not serve on :3082 - see /tmp/score-server.log"; pkill -f "$RUN/server.js" || true; exit 1
fi
python3 scripts/bench-crosscheck.py http://127.0.0.1:3082 "$RUN" 2>/dev/null | tail -1
pkill -f "$RUN/server.js" || true

# 4. copy evidence, seed story page from template, publish
MODEL=$(basename "$RUN")
mkdir -p "screenshots/$MODEL"
cp "$RUN/boot.png" "$RUN/apps-open.png" "$RUN/after-reload.png" "screenshots/$MODEL/" 2>/dev/null || true
sed -e "s/Run NN - <Model> (<date>)/$(echo "$MODEL" | sed 's/run-00-/# Run 00: /;s/-/ /g') (auto-scored)/" docs/runs/TEMPLATE.md > "docs/runs/$MODEL.md" 2>/dev/null || true
sed -i 's#127.0.0.1:3082#local-port#g' "$RUN/harness-report.json" 2>/dev/null || true

git add -A
git -c core.pager=cat commit -m "auto-score $MODEL: harness report, evidence, story stub" || true
git push -q origin HEAD:main && echo "pushed $(git rev-parse --short HEAD)"

# 5. keep the engine hot
bash scripts/start-next.sh
