#!/usr/bin/env bash
set -uo pipefail
cd /home/hermes/openos-work
RUN=runs/run-05-kimi-k3.1
export PORT=3084
(node "$RUN/server.js" >/tmp/k31-serve.log 2>&1 &)
for i in $(seq 1 10); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 1
done
python3 scripts/bench-crosscheck.py "http://127.0.0.1:$PORT" "$RUN" 2>&1 | tail -25
pkill -f "$RUN/server.js" 2>/dev/null
sed -i 's#127.0.0.1:3084#local-port#g' "$RUN/harness-report.json" 2>/dev/null
echo "REPORT:"; cat "$RUN/harness-report.json" 2>/dev/null | head -50
