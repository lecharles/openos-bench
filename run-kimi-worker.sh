#!/usr/bin/env bash
set -euo pipefail

cd /root/kimi-browser-desktop
exec npx --yes @moonshot-ai/kimi-code@latest \
  --prompt "$(cat /root/kimi-browser-desktop/KIMI_IMPLEMENTATION_PROMPT.md)" \
  --output-format text
