#!/usr/bin/env bash
set -euo pipefail

WORKDIR="/root/kimi-browser-desktop"
SUPERVISOR_DIR="$WORKDIR/supervisor"
LOG="$SUPERVISOR_DIR/supervisor.log"
KIMI_BIN=(npx --yes @moonshot-ai/kimi-code@latest --model opencode-go/kimi-k3)

mkdir -p "$SUPERVISOR_DIR"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "$LOG"
}

kimi_pids() {
  pgrep -f 'kimi-code|@moonshot-ai/kimi-code' || true
}

wait_for_current_kimi() {
  log "Autonomous supervisor active. Waiting for current Phase 3 Kimi implementation to finish naturally."
  while true; do
    local pids
    pids="$(kimi_pids | tr '\n' ' ' | xargs || true)"
    if [ -z "$pids" ]; then
      log "No active Kimi process detected. Proceeding to queued phases."
      return 0
    fi
    log "Kimi still active; not interrupting. pids=$pids"
    sleep 300
  done
}

run_phase() {
  local name="$1"
  local prompt_file="$2"
  local phase_log="$SUPERVISOR_DIR/${name}.log"

  log "Starting $name with Kimi."
  cd "$WORKDIR"
  set +e
  "${KIMI_BIN[@]}" --prompt "$(cat "$prompt_file")" --output-format text 2>&1 | tee "$phase_log"
  local status=${PIPESTATUS[0]}
  set -e
  if [ "$status" -ne 0 ]; then
    log "$name failed with exit code $status. Stopping autonomous chain for safety. See $phase_log."
    return "$status"
  fi
  log "$name completed."
}

main() {
  log "Supervisor policy: no human pause until approximately 06:00 PT unless data loss, destructive action, security compromise, or unrecoverable failure is detected. Implementation model is KiMi 3 (opencode-go/kimi-k3)."
  wait_for_current_kimi
  run_phase "phase4-apple-design-pass" "$SUPERVISOR_DIR/PHASE4_APPLE_DESIGN_PASS.md" || exit $?
  run_phase "phase5-performance-engineering" "$SUPERVISOR_DIR/PHASE5_PERFORMANCE_ENGINEERING.md" || exit $?
  run_phase "phase6-qa-product-readiness" "$SUPERVISOR_DIR/PHASE6_QA_PRODUCT_READINESS.md" || exit $?
  log "Autonomous Phase 4-6 chain complete. Ready for OpenCode review."
}

main "$@"
