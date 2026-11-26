#!/usr/bin/env bash
set -uo pipefail
cd /home/hermes/openos-work
RUN=runs/run-05-kimi-k3.1
RES=eval/harness/results/run-05-kimi-k3.1
PORT=3105
export PORT
# fresh desktop state for scoring (worker debris preserved separately)
rm -f "$RUN/data/state.json" "$RUN/data/trash.json"
mkdir -p "$RES"
node "$RUN/server.js" >/tmp/k31-score.log 2>&1 &
SRVPID=$!
for i in $(seq 1 12); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 1; done
echo "== security recheck (live curl)"
for path in /etc/shadow /etc/passwd; do
  echo "$path -> $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/file?path=$path") / $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/fs?path=$path")"
done
echo "== harness.js (neutral 8-check)"
node eval/harness/harness.js "http://127.0.0.1:$PORT" "$RES/harnessjs" 2>&1 | tail -6 || true
echo "== bench-crosscheck WITH disclosed run-05 config (10-check)"
rm -f "$RUN/data/state.json"
python3 scripts/bench-crosscheck.py "http://127.0.0.1:$PORT" "$RES/crosscheck-config" "$PWD/eval/harness-configs/run-05-kimi-k3.1.json" 2>&1 | tail -2 || true
echo "== clickpath.js (struct)"
rm -f "$RUN/data/state.json"
node eval/harness/clickpath.js "http://127.0.0.1:$PORT" "$RES/clickpath" 2>&1 | tail -8 || true
kill $SRVPID 2>/dev/null
sed -i 's#127.0.0.1:3105#local-port#g' "$RES"/*.json "$RES"/*/*.json 2>/dev/null
echo DONE
