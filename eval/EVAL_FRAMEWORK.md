# OpenOS Eval — beautiful minimal Mac VPS desktop (4+4 apps), LLM-swappable

> Reference implementation lives at `/root/kimi-browser-desktop` (legacy 21-app
> desktop, Express + Socket.IO on :3080). This repo rebuilds the **same minimal
> OpenOS**: 4 GUI shell/beauty apps + 4 conversational agent GUIs, ≤10 apps total.

- **4 GUI shell/beauty:** Calendar + Desktop + Exposé/Mission Control + Dock/Launchpad/Spotlight
- **4 agent GUIs (conversational):** OpenCode + OpenClaw + Hermes + Pi — all streaming via `llm-adapter`, no keys in browser
- **Optional +2:** Settings (theme/accent/wallpaper) + Finder-lite (read-only grid)

Focus: **beautiful desktop + agent discussion**, not boring email/word-processing.

## Cadence

1 commit/day, ~30 days (2026-09-17 → 2026-10-16). See `docs/30DAY_PLAN.md`.

## Quick start (after Day 1)

```bash
cd /root/openos-eval
LLM_PROVIDER=kimi-k3 LLM_MODEL=opencode-go/kimi-k3 node server.js
# open http://localhost:3080
```

## Docs

- `docs/30DAY_PLAN.md` — 30-day slice table, eval rubric, one-pager template
- `docs/lineage.md` — where this came from, what baggage was dropped
