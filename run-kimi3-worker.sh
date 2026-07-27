#!/usr/bin/env bash
set -euo pipefail

cd /root/kimi-browser-desktop
exec npx --yes @moonshot-ai/kimi-code@latest \
  --model opencode-go/kimi-k3 \
  --prompt "$(cat /root/kimi-browser-desktop/KIMI3_CORRECTION_AND_CONTINUATION_PROMPT.md)" \
  --output-format text
