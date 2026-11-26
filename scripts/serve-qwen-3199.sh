#!/usr/bin/env bash
# dev-only: serve run-03 Qwen build on loopback for instrument revalidation
cd /home/hermes/openos-work/runs/run-03-qwen3.8-max
PORT=3199 exec node server.js
