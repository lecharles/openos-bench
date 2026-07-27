# KiMi Browser Desktop — Status

## Current Status: **KiMi 3 Audit & Repair Complete — Verified Working**

**Last Updated:** 2026-07-27 UTC

## Model Correction (2026-07-27)

**KiMi 3 (`opencode-go/kimi-k3`) is now the implementation model.** OpenCode is the orchestrator/supervisor. All work before this correction is treated as a **draft** reviewed, repaired, and now owned by KiMi 3. The pre-correction STATUS.md claimed "Phase 6 complete" — that claim was **false**: the draft's QA was API-only curl tests and never opened a browser. KiMi 3's independent audit found a critical defect that prevented **every app from rendering**, plus ~20 major defects. All confirmed defects have been fixed and verified with headless-browser E2E tests (see below).

## KiMi 3 Audit — Key Findings in the Draft (all fixed)

| Severity | Finding | Fix |
|----------|---------|-----|
| CRITICAL | Apps never rendered: `window['App'+id]` lookup failed (apps were lexical `const`, invisible on `window`); name map missing TextEdit/OpenClaw/AgentControl | All apps now `window.AppX`; name map in `window-manager.js` |
| MAJOR | Window dedupe/minimize-restore dead (`-0` vs `-1` key mismatch) → dock clicks spawned duplicates | Single-window-per-app focus/restore |
| MAJOR | Closing last window never persisted (resurrected on reload) | `saveWindows` always POSTs |
| MAJOR | Notification Center unreachable (no UI path) | Menu-bar clock click opens it (macOS behavior) |
| MAJOR | Accent color setting dead; "Auto" theme = permanent light | Accent drives `--color-blue`; auto follows `prefers-color-scheme` |
| MAJOR | Menu-bar app menus dead; Control Center inverted state, fake toggles | Functional dropdowns; real sliders (brightness dims screen, persisted) |
| MAJOR | fs whitelist exposed `/etc` (incl. `/etc/shadow` readable as root!) | Roots = `/root /home /tmp` + denylist (.ssh/.gnupg/.env/shadow/keys) |
| MAJOR | Calendar events, Mail send, Trash, Preview all stubs/fake | Implemented with real backends (`/api/calendar`, `/api/fs/trash`, `/api/trash/*`) |
| MAJOR | Agent apps showed green "Connected" while backends offline (no `resp.ok` check) | Honest offline state; provider/model shows `— / —` |
| MAJOR | Socket.IO streaming implemented server-side but no client used it | Hermes/OpenClaw stream via `agent:chat`/`agent:chunk` with fetch+mock fallback |
| MAJOR | Dark mode broken by hardcoded colors (toolbars, chat bubbles, Music, Reminders) | Tokenized; dark overrides added |
| MINOR | Notes shape mismatch, Contacts filtered-index bug, calculator repeat-= crash, clock interval leak, wallpaper stale format, FOUC, drag listener leaks, no viewport clamping | All fixed (see git log) |

## Verified Test Results (KiMi 3)

```
API regression:           25/25 PASS  (health, settings, notes, reminders, calendar,
                                       contacts, mail, messages, fs list/read/write,
                                       fs blocked paths 403, trash list/trash/restore/empty,
                                       terminal echo + blocked 400, agent 502/404,
                                       static assets, windows save/load)
Headless Chromium E2E:    21/21 apps open and render content (no "failed to load")
Interaction probes:       15/15 PASS  (calculator ÷0 + repeat-=, Spotlight toggle,
                                       Notification Center, Control Center sliders +
                                       brightness dim, Window menu, Hermes honest offline,
                                       notes welcome content, terminal blocked feedback,
                                       trash API, window persistence save)
Persistence across reload: window position restored exactly, theme restored,
                           closing all windows persists empty state
Console errors:           none (only expected 404 wallpaper probes + 502 agent-offline)
```

### Test Commands

```bash
# Start server
cd /root/kimi-browser-desktop && node server.js &

# API smoke (examples)
curl -s http://localhost:3080/api/health
curl -s http://localhost:3080/api/trash
curl -s "$B/api/fs/read?file=/etc/shadow"        # expect 403
curl -s -X POST http://localhost:3080/api/terminal \
  -H 'Content-Type: application/json' -d '{"command":"rm -rf /"}'   # expect 400

# Headless E2E (test harness lives in /tmp/kbd-e2e, uses system chromium + puppeteer-core)
cd /tmp/kbd-e2e && node smoke.js      # boots desktop, opens all 21 apps, 15 probes
cd /tmp/kbd-e2e && node persist.js    # reload persistence test
```

## Architecture (as corrected)

- **Server** (`server.js`, `routes/`): Express + Socket.IO on :3080. Async fs, CRUD route factory (`persistence.js`), hardened filesystem routes with path whitelist + denylist (`fs.js`), agent proxy with timeouts (`agent.js`). Real Trash backend (manifest + `data/trash-bin/`). Wallpaper upload deletes stale sibling format.
- **Core shell** (`public/js/core/`): `app-registry.js` (metadata + AppUtils: escapeHtml, markdown, api helpers), `window-manager.js` (single-window-per-app, cleanup hooks, viewport clamping, sanitized persistence), `persistence.js` (theme incl. auto via matchMedia, accent, pre-paint localStorage cache), `menubar.js` (1s clock, functional app menus, clock→notifications), `control-center.js` (toggles + brightness/volume sliders), `desktop.js` (persistent custom icons, settings-driven wallpaper), `spotlight.js` (Cmd+Space toggle), `dock.js`, `launchpad.js`, `notifications.js`.
- **Apps** (`public/js/apps/`): 21 apps, all exposed as `window.AppX`, all dispatching through `WindowManager.renderApp`.
- **CSS** (`public/css/style.css`): token-based light/dark themes, blur/translucency with `-webkit-` fallbacks, visibility-gated overlays, responsive `@media (max-width:1100px)`.

## How to Run

```bash
cd /root/kimi-browser-desktop
node server.js
# Open http://localhost:3080 in a browser
```

## Known Risks / Limitations

1. **Agent backends offline**: Hermes/OpenClaw (localhost:8400/8401) unreachable → apps show "Offline (mock)" and fall back to mock replies. Socket streaming is implemented but could not be end-to-end tested against a live streaming backend; falls back to fetch+mock whenever the socket is disconnected or errors.
2. **No authentication**: local loopback use only.
3. **Terminal runs real shell commands** (dangerous patterns blocked); Finder/Trash operate on the real filesystem within `/root`, `/home`, `/tmp`.
4. **Volume slider** is state-only (no audio subsystem). Music app has no audio playback.
5. **Chat history** (Hermes/OpenClaw) is per-page-session in memory — by design; reload clears it.
6. **Minimized windows restore visible** on reload (no minimized-window dock).
7. **Custom desktop icons** (New Folder/New File) are launchers without real backing files.
8. **Headless Chromium may not paint `backdrop-filter`** — blur/vibrancy is present in CSS with fallbacks but was not visually verifiable in the headless environment.
9. **Desktop-only design** (~1024px+); a basic `@media` rule covers smaller widths but mobile is not a target.

## Commits (local only, not pushed)

- `11c9a13` — KiMi 3 audit: core shell + server fixes
- `c713df2` — KiMi 3: repair all 21 apps, agent streaming, Phase 4/5/6 polish

## Acceptance Review (for OpenCode)

1. `cd /root/kimi-browser-desktop && node server.js`
2. Browser → `http://localhost:3080`: click every dock icon; all 21 apps must render.
3. Exercise: Notes add/edit/delete, Calendar add event, Mail compose→Sent, Messages send + reload persistence, Finder navigate + Move to Trash + Trash restore/empty, Terminal `rm -rf /` (blocked, shown red), Calculator `6÷0==`, Clock stopwatch across tab switch + close window (no leak).
4. Shell: Cmd+Space Spotlight toggle, F4 Launchpad, clock→Notification Center, Control Center brightness slider (screen dims, persists across reload), Window menu lists open windows, minimize then dock-click restores.
5. Persistence: open/move windows → reload → restored; close all → reload → nothing resurrects; theme light/dark/auto.
6. Agents: Hermes/OpenClaw show "Offline (mock)" (not "Connected"); Agent Control health checks show Unreachable; mock chat replies work.
7. Automated: `cd /tmp/kbd-e2e && node smoke.js` (requires the puppeteer-core harness in /tmp; reinstall with `npm i puppeteer-core` if wiped).

## History

Pre-correction draft phases (Phases 1–6 by the previous model) are superseded by the KiMi 3 audit above. The draft's claimed test results were API-only and did not cover any browser behavior; treat prior phase claims as unverified unless confirmed in "Verified Test Results" above. Full draft history is in `git log`.
