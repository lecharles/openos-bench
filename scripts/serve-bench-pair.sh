#!/usr/bin/env bash
# bench-serve: loopback-only Qwen(:3199) + GLM(:3198) for instrument-v2 revalidation
cd /home/hermes/openos-work
pkill -f serve-loopback.js 2>/dev/null || true
sleep 1
( PORT=3199 node /tmp/serve-loopback.js "$PWD/runs/run-03-qwen3.8-max/server.js" >/tmp/qwen-loop.log 2>&1 & )
( PORT=3198 node /tmp/serve-loopback.js /home/hermes/openos-runs/run-02-glm-5.3/server.js >/tmp/glm-loop.log 2>&1 & )
sleep 5
for p in 3199 3198; do
  curl -sf -o /dev/null -w "port $p -> %{http_code}\n" "http://127.0.0.1:$p/" || { echo "port $p FAILED"; tail -3 /tmp/*-loop.log; }
done
ss -tln | grep -E ':(3198|3199)' | sed 's/users.*//'
