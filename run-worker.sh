#!/usr/bin/env bash
# OpenOS Bench nightly worker: run-worker.sh <model-id> <run-dir>
# Usage: run-worker.sh <provider/model> <path-to-run-dir>
# Runs one autonomous overnight build session against the frozen task spec.
set -euo pipefail
MODEL="${1:?model id required}"
RUNDIR="${2:?run dir required}"
SPEC="$(cd "$(dirname "$0")" && pwd)/eval/task-spec.md"

mkdir -p "$RUNDIR"
cd "$RUNDIR"
[ -f package.json ] || cat > package.json << 'EOF'
{
  "name": "openos-run",
  "version": "0.0.0",
  "private": true,
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.21.0", "socket.io": "^4.8.0" }
}
EOF
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1 || true

PROMPT="You are building OpenOS on a fresh project directory (empty except package.json + node_modules). Read the full task spec below and implement it completely. Work autonomously for one overnight session. Prefer finishing over starting: shell and window manager first, then Dock/Spotlight/Finder, then apps, then persistence, then polish. When done or when time runs low, write STATUS.md listing exactly what works.

=== TASK SPEC ===
$(cat "$SPEC")"

echo "[worker] model=$MODEL rundir=$RUNDIR started=$(date -Is)"
exec opencode run -m "$MODEL" "$PROMPT"
