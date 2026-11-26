#!/usr/bin/env bash
cd /home/hermes/openos-work
PORT=3199 exec node /tmp/serve-loopback.js "$PWD/runs/run-03-qwen3.8-max/server.js"
