# OpenOS Eval — 30-Day Phased GitHub Project (Minimal Scope)

> **Source:** `/root/kimi-browser-desktop` (40 files, ~5k LOC, 21 legacy apps, Express + Socket.IO on :3080) — **reference only; minimal rebuild is 8-10 apps**
> **Tmux:** keep `phase3-kimi-supervisor` (4 windows, since 2026-07-26) + `kimi-os-root` intact — new work uses fresh branch/repo
> **Goal (per user):** same beautiful Mac VPS desktop, swappable LLM — every new open model rebuilds the **same minimal OpenOS**. Focus on **beautiful desktop + agent discussion**, not boring email/word-processing.
> **Name:** **OpenOS** (or **OpenOS Eval**) — not ChemiOS/KimiOS. Repo/display name `openos-eval` (or `openos`).
> **Minimal app set (8-10 max, not 21):**
>   - **4 GUI shell/beauty apps:** **Calendar** (only traditional productivity app) + **Desktop** (wallpaper, icons, context menus, blur) + **Exposé / Mission Control** (window overview, ⌘-tab, genie/minimize) + **Dock / Launchpad / Spotlight** (magnification, bounce, search)
>   - **4 agent GUIs (conversational):** **OpenCode**, **OpenClaw**, **Hermes**, **Pi** — all streaming via `llm-adapter`, no keys in browser
>   - Optional +2 if needed: **Settings** (theme/accent/wallpaper) + **Finder-lite** (read-only file grid for Desktop backing) — still ≤10. Everything else (Mail, Notes, TextEdit, Music, Photos, Trash, Activity, Clock, etc.) expands **later**, not in D1-30.
> **Policy:** **1 commit / day** to avoid rate limits. ~30 days, not too fast. No push until plan approved.
> **Created:** 2026-09-17 UTC · Updated: 2026-09-17 UTC (minimal scope) · Author: OpenCode (Muse Spark)
> **LLM cherry (for one-pager, swappable per model):** Moonshot Kimi K3 — 2.8T MoE (104B active, 16/896 routed + 2 shared), Hybrid Attention (3× KDA + 1× Gated MLA per block, NoPE), Attention Residuals, Stable LatentMoE, 93 layers, 7168 hidden, SiTU-GLU, MoonViT-V2 401M, 160K vocab, 1M context, MXFP4/MXFP8 QAT. For next model, swap this paragraph only. Source: arxiv 2607.24653 + Moonshot GitHub.

---

## 0. Repo Strategy

### Option A (recommended): fresh repo `openos-eval` — fork of `kimi-browser-desktop`
- **Why:** current repo has makeup desktop + 14-commit history with prior-model draft baggage. Clean slate lets OpenOS Eval own the rebuild while preserving lineage via `docs/lineage.md`.
- **Init:**
  ```bash
  gh repo create openos-eval --public --description "OpenOS Eval — beautiful minimal Mac VPS desktop (4+4 apps), LLM-swappable" --clone
  # or manual:
  mkdir /root/openos-eval && cp -r /root/kimi-browser-desktop/* /root/openos-eval/ && cd /root/openos-eval && git init
  ```
- **Branches:** `main` (releases), `openos-rebuild` (daily commits), tag `v0.1.0-day30`.
- **Remote:** no push until Day 30 review — local commits only. Add `origin` on Day 1 but keep `git push` gated.

### Option B: in-place branch on `kimi-browser-desktop`
- `git checkout -b openos-eval-30day` from `f68a37b`, same 30 commits, PR at Day 30.

### GitHub Project Setup (Day 1, local)
- **Project (beta) board:** `OpenOS Eval — 30-Day Rebuild` — 5 columns = 5 phases below.
- **Milestones:** `Phase 0 Foundation` (D1-3), `Phase 1 Shell Beauty` (D4-10), `Phase 2 Minimal Apps` (D11-17), `Phase 3 Agent Apps` (D18-23), `Phase 4 Polish & Eval` (D24-30).
- **Labels:** `shell`, `app`, `backend`, `agent`, `eval`, `docs`, `a11y`, `perf`, `blocked`.
- **Issues:** one per day/slice (30 issues), each linked to its commit via `Closes #N` on merge day.
- **Rate-limit guard:** 1 commit/day = ~1 issue closed/day; API calls batched (<50/day).

---

## 1. Architecture Invariants (LLM-swappable OS)

These hold regardless of which LLM implements:

```
┌─────────────────────────────────────────────────────────────┐
│  public/js/core/         shell: window-manager, dock,       │
│    app-registry, menubar, control-center, desktop,          │
│    spotlight, launchpad, exposé, notifications, persistence  │
│  public/js/apps/         8-10 apps = 4 GUI + 4 agents       │
│    gui: calendar.js, desktop.js, expose.js, dock-app.js     │
│    agents: opencode.js, openclaw.js, hermes.js, pi.js       │
│    (+ optional settings.js / finder-lite.js)                │
│  public/css/style.css    HIG tokens, blur, shadows          │
│  routes/                 Express + Socket.IO backends        │
│    agent.js  →  llm-adapter.js  →  provider (Kimi K3 / …)  │
│    fs.js (minimal), persistence.js, calendar.js             │
│  data/                   JSON + wallpaper + minimal trash    │
│  tests/e2e/              smoke.js, persist.js (puppeteer)   │
│     now expects 8-10 apps, not 21                           │
└─────────────────────────────────────────────────────────────┘
```

**LLM-swappable contract** (`routes/llm-adapter.js`, new):
```js
// All agent apps call POST /api/llm/chat { provider, model, messages, stream }
// Adapter resolves: kimi-k3 | qwen3.8-flash | gpt-5.5 etc. via env
// Browser never sees raw keys; streaming via Socket.IO agent:chunk/agent:done
// Config: LLM_PROVIDER=kimi-k3, LLM_MODEL=opencode-go/kimi-k3
// One-pager cherry paragraph is the ONLY per-model swap — contract stays identical
```

**Minimal vs legacy:** legacy `kimi-browser-desktop` had 21 apps — keep it as reference (`/root/kimi-browser-desktop` untouched). New builds implement only 8-10; `smoke.js` assert updated to `APPS_MIN=8, APPS_MAX=10`.

---

## 2. Inputs: Audit of Existing State (`STATUS.md` 2026-07-27)

**Verified working in legacy (reference):** 21/21 apps render, 15/15 probes pass, 25/25 API regression pass, persistence via `windows.json` + `settings.json`, Finder 4 views, fs hardening, Trash manifest, wallpaper pipeline, dock magnification + bounce.

**For minimal OpenOS Eval, we keep only:**
- Window manager, dock/menubar, persistence, wallpaper/blur, calendar CRUD, llm-adapter pattern — **discard the other 13 apps as out-of-scope for D1-30**.

**Defects / limitations to address in 30 days (grouped):**

| Group | Items from STATUS Known Risks + Audit table | Minimal handling |
|-------|---------------------------------------------|------------------|
| A. Agent honesty | Hermes/OpenClaw show "Offline (mock)" but no live E2E; socket streaming untested live; Pi app missing | Fix: honest offline + streaming via llm-adapter (D18-23) |
| B. Shell beauty | No auth; volume slider state-only; minimized-on-reload visible; backdrop-filter not verifiable headless | Fix: desktop/exposé/dock polish (D4-10); auth out of scope |
| C. Security | Terminal removed in minimal (no shell); if added later, blocklist+rate limit | Minimal has no Terminal — security surface smaller |
| D. Polish | Logo was Apple glyph → neutral circle (done at f68a37b) — keep replaceable branding | Keep neutral, replaceable |

All 30 slices reference these IDs.

---

## 3. 30-Day Slice Table — One Commit Per Day (Minimal: 4+4 apps, ~8-10 total)

> Dates assume start **2026-09-17 (Day 1)** → end **2026-10-16 (Day 30)**. Adjust +N if start slips; keep order.
> Each row = one `git commit` (noon UTC, manual `git commit -m "..."` + optional `gh issue close`).
> Verification = what `smoke.js` / `curl` / human check must pass that day. **Expect 8-10 apps, not 21/23.**

| Day | Date | Phase | Commit title (conventional) | Slice & scope (minimal) | Verification |
|-----|------|-------|------------------------------|--------------------------|--------------|
| **1** | Sep 17 | 0 Foundation | `chore: init openos-eval repo + 30-day project board` | Create repo/branch, this `docs/30DAY_PLAN.md` (minimal header), `docs/lineage.md`, GitHub Project + 30 issues + 5 milestones, `.gitignore` (node_modules/data), `README.md` skeleton ("OpenOS Eval — 4+4 minimal, beautiful desktop + agent discussion"), `opencode.json` guard | `git log --oneline` shows D1; `gh project view` lists 5 phases; README says 8-10 apps |
| **2** | Sep 18 | 0 | `chore: llm-adapter contract + env` | Add `routes/llm-adapter.js` (provider/model/env, streaming flag), refactor `routes/agent.js` to delegate via adapter, add `LLM_PROVIDER`/`LLM_MODEL` to `.env.example`, keep `OPENCODE_GO_API_KEY` server-side | `curl /api/llm/health` returns provider; `/api/agent/*` still 502 when offline (no regression) |
| **3** | Sep 19 | 0 | `test: headless harness + CI guard (minimal)` | Move E2E to `tests/e2e/smoke.js` + `persist.js`, update asserts to 8-10 apps, add `npm test` script, add `scripts/verify.sh` (API + 8-10 app + 15 probe, trimmed), document in `STATUS.md` | `npm test` 8-10 apps pass; `node tests/e2e/smoke.js` passes locally |
| **4** | Sep 20 | 1 Shell Beauty | `feat(shell): window manager hardening` | Extract `public/js/core/window-manager.js` cleanup: focus/blur transitions, viewport clamp, dedupe fix, `_debouncedSave` 300ms, minimized-state persistence prep | `persist.js` window pos exact; no duplicate on dock click |
| **5** | Sep 21 | 1 | `feat(shell): dock & menubar polish` | Dock: cosine magnification rAF, launch bounce, dark pill tooltip, running dot; Menubar: `-apple-system` type, functional dropdowns, clock → Notification Center | Dock audit: magnify + tooltip + bounce; menubar dropdown renders |
| **6** | Sep 22 | 1 | `feat(shell): desktop beauty` | Desktop: Unsplash wallpaper pipeline, `backdrop-filter: blur(20px) saturate(180%)` on menubar/dock/windows, pre-paint anti-FOUC via localStorage, desktop icons (backed by `public/assets/` stubs, context menus 5px pad/rounded) | No FOUC; blur visible; wallpaper offline |
| **7** | Sep 23 | 1 | `feat(shell): exposé / mission control` | Exposé: `public/js/core/expose.js` — grid overview of open windows, click to focus, Esc dismiss, 200ms scale transition, z-order preserved | Open 4 windows → Exposé shows 4 thumbnails → click focuses |
| **8** | Sep 24 | 1 | `feat(shell): spotlight + launchpad + control center` | Spotlight Cmd+Space (fuzzy on 8-10 apps), Launchpad F4 (grid of minimal apps), CC: brightness (dims + persisted), volume state | Spotlight finds Calendar; Launchpad shows 8-10 icons |
| **9** | Sep 25 | 1 | `feat(shell): persistence & theming + a11y` | `persistence.js`: `auto` follows `prefers-color-scheme`, accent → `--color-blue`, wallpaper `data/wallpaper.jpg`; a11y: focus rings, tab nav, `@media (max-width:1100px)` stacked, reduced-motion | Theme auto/light/dark + accent survive reload; keyboard nav works |
| **10** | Sep 26 | 1 | `chore(shell): shell freeze + snapshot` | Tag `shell-freeze`, `STATUS.md` update, visual screenshot capture (Playwright) for HIG comparison | 8-10 apps still render; no API regression |
| **11** | Sep 27 | 2 Minimal Apps | `feat(apps): calendar — the one productivity app` | Calendar `public/js/apps/calendar.js` + `/api/calendar` CRUD, month/week views, add event "Lunch 12pm tomorrow" → persists | Calendar event persists after reload |
| **12** | Sep 28 | 2 | `feat(apps): desktop / finder-lite` | Desktop as app: icon grid backed by `data/desktop.json` stubs (not full FS), inline rename, drag reflow; optional Finder-lite read-only grid (`/api/fs` mtime + denylist, 20MB cap if used) | Desktop icons render; rename persists via JSON |
| **13** | Sep 29 | 2 | `feat(apps): settings + control polish` | Settings app: theme/accent/wallpaper UI drives `persistence.js`; CC wiring polish; remove legacy apps (Mail/Notes/etc.) from registry — keep stubs only if needed | Settings drives theme; no legacy app leaks into dock |
| **14** | Sep 30 | 2 | `feat(apps): dock-app & menubar extras` | Dock app: magnification prefs, auto-hide toggle, running-dot; Menubar extras: Window menu lists opens, View toggle, clock | Dock prefs persist; Window menu lists 4 GUIs + 4 agents |
| **15** | Oct 01 | 2 | `feat(apps): minimal polish / trash-lite if needed` | Optional Trash-lite (`data/trash-bin/` stub) or skip; ensure 8-10 app registry clean; HIG spacing audit | Registry length 8-10; no missing icons |
| **16** | Oct 02 | 2 | `feat(apps): minimal freeze` | Freeze minimal GUI set; update `smoke.js` probes to minimal task list (see §4.2); remove 21-app expectations | `smoke.js` passes on minimal tasks |
| **17** | Oct 03 | 2 | `chore(apps): core freeze + snapshot` | Tag `core-freeze`; `STATUS.md` "Minimal GUI (4+2) frozen — 8-10 apps" | Snapshot shows beautiful desktop (wallpaper+dock+exposé) |
| **18** | Oct 04 | 3 Agent Apps | `feat(agents): llm-adapter streaming E2E` | Socket.IO `agent:chat`/`agent:chunk`/`agent:done` unified path, fallback fetch+mock when socket disconnected, `agent:error` honest offline | `smoke.js` Hermes honest-offline probe passes |
| **19** | Oct 05 | 3 | `feat(agent): Hermes — conversations` | `hermes.js` markdown (`AppUtils.renderMarkdown`), history panel, provider/model badge (`— / —` when offline), reconnect, clear | Hermes renders; badge honest |
| **20** | Oct 06 | 3 | `feat(agent): OpenClaw — conversations` | `openclaw.js` tasks/history/logs panes, streaming, provider badge, same adapter path | OpenClaw tasks render; streaming probe passes |
| **21** | Oct 07 | 3 | `feat(agent): Pi — new GUI app` | New `public/js/apps/pi.js` (Pi/Agent conversational app), dock icon, adapter Pi provider, streaming + markdown | Pi app renders as 9th app; dock shows Pi |
| **22** | Oct 08 | 3 | `feat(agent): OpenCode — GUI app` | New `public/js/apps/opencode.js` (OpenCode supervisory chat), lists recent local sessions if available, streaming | OpenCode app renders as 10th app |
| **23** | Oct 09 | 3 | `feat(agent): Agent Control / unified health` | Health/status/diagnostics for Hermes/OpenClaw/Pi/OpenCode via `/api/agent/:agent/*` + llm-adapter, timeout 5-15s, honest 502 | Agent Control shows Unreachable when offline — not "Connected" |
| **24** | Oct 10 | 4 Polish | `perf: startup + render + memory` | Lazy app load, rAF dock, pre-paint theme cache, mem audit (no listener leaks) | Startup <1s local; no `console.error` beyond expected 502 |
| **25** | Oct 11 | 4 | `fix: security & adapter hardening` | No Terminal in minimal — skip blocklist; add rate limit on `/api/llm/*` (10 req/min/IP), `isPathSafe` if finder-lite present, no secrets in logs/commits | `view-source` shows no `sk-`; rate limit probe passes |
| **26** | Oct 12 | 4 | `feat(persist): chat + window + desktop history` | Move agent chat history from in-memory to `data/agent-history.json` (opt-in, TTL 7d), window pos + desktop layout persist, minimized→dock restore on reload | Chat survives reload; layout persists |
| **27** | Oct 13 | 4 | `test: human eval harness (minimal)` | Add `docs/HUMAN_EVAL_RUBRIC.md` (see §4), `docs/ONE_PAGER_TEMPLATE.md` (see §5, swappable cherry), `tests/e2e/human-checklist.sh`, `docs/screenshots/` placeholders — all trimmed to 8-10 apps | Checklist runs: open 8-10 apps, exercise each |
| **28** | Oct 14 | 4 | `docs: one-pager + lineage (swappable)` | Fill one-pager for current model (e.g., Kimi K3 cherry), `STATUS.md` final, `README.md` human eval link, `CHANGELOG.md`; keep template swappable for next LLM | One-pager renders; lineage lists prior defects fixed |
| **29** | Oct 15 | 4 | `test: full QA + pre-release` | Run `npm test` + `human-checklist.sh`, fix visual inconsistencies, dark-mode token audit, fix FOUC, tag `v0.9.0-rc` | API + 8-10 apps + probes + human checklist pass |
| **30** | Oct 16 | 4 | `release: v1.0.0-openos-eval — human eval ready` | Tag `v1.0.0-openos-eval`, `docs/30DAY_PLAN.md` mark complete, `STATUS.md` "Verified Working — OpenOS Eval (4 GUI + 4 agents, ≤10 apps)", push gated (user approval), archive `phase3-kimi-supervisor` log | `git log --oneline -30` shows one/day; human eval scheduled |

**Commit hygiene:** each commit `git add -A && git commit -m "type(scope): message\n\nCloses #N\nVerification: ..."` — no force-push, no secrets. If a day has no code change, commit `docs:` or `test:`.

---

## 4. Human Eval Rubric — OS Fidelity & Functionality (Minimal: 8-10 apps)

**Location after Day 27:** `docs/HUMAN_EVAL_RUBRIC.md` (summary here; full rubric expands each row to pass/fail checklist).

### 4.1 Visual Fidelity (30 pts) — "Does it feel like macOS?"
| Axis | What to evaluate | Pass criteria |
|------|------------------|---------------|
| Wallpaper & blur | Unsplash landscape, menu-bar + dock + window chrome `backdrop-filter: blur(20px) saturate(180%)` with fallback | No FOUC; blur visible on Chrome/Safari; wallpaper offline |
| Windows | Multi-layer shadows (focused vs unfocused), 8-10px radius, 200ms open / 150ms close / 300ms genie minimize-to-dock-icon, 250ms zoom, 8 handles inside frame, z-order on click | Minimize animates to live dock rect; restore bounces |
| Dock | Glass background, running dots, cosine-falloff magnification (≤1.6×, rAF), dark pill tooltip, launch bounce | Tooltip positioned; magnification smooth; bounce fires on launch/restore |
| Menubar/dropdowns | `-apple-system` typography, 5px padding rounded hover items, 60ms response | Dropdowns look macOS; clock → Notification Center |
| Desktop & Exposé | Desktop icons on wallpaper, right-click context menu, Exposé grid overview of 8-10 windows | Desktop renders on wallpaper; Exposé shows all opens |
| Finder-lite / Desktop grid | If present: icon grid, mtime, rename; else Desktop handles it | No crash; rename persists |

Scoring: 5 = indistinguishable from macOS screenshot in that axis; 3 = recognizable but rough; 1 = missing/broken.

### 4.2 App Functionality (30 pts) — minimal set only
| App | Human task | Pass |
|-----|-----------|------|
| Desktop / Finder-lite | See icons on wallpaper, drag, inline rename (Enter), right-click menu | Rename hits `data/desktop.json`; drag reflows |
| Exposé / Mission Control | Open 4 windows → trigger Exposé → click thumbnail focuses | Grid shows 4; Esc dismisses |
| Dock / Launchpad / Spotlight | Hover dock (magnify), click Launchpad F4 (grid 8-10), Cmd+Space Spotlight search "Calendar" | Each probe passes |
| Calendar | Add event "Lunch 12pm tomorrow" | Persists after reload |
| Settings | Change accent/theme/wallpaper → reload → still set | Persistence via `settings.json` + pre-paint |
| Control Center / Notifications | Brightness slider dims + persists, volume state, clock → notifications | Persists; no error |
| (If included) Trash-lite | Move desktop item → Trash → restore/empty | Trash round-trip works |

Removed from legacy 21-app rubric: Mail, Notes, TextEdit, Preview, Messages, Contacts, Reminders, Clock, Calculator, Weather, Photos, Music, Activity, Terminal — out of scope for minimal; expand later beyond 10.

### 4.3 VPS Conversational Apps (25 pts) — core differentiator (unchanged: 4 agents)
| App | Task | Pass |
|-----|------|------|
| Hermes | Send "hello" while backend offline → honest "Offline (mock)" + mock reply; when live (`:8400`) → streaming markdown | Provider badge `— / —` offline, real streaming live |
| OpenClaw | Same + tasks/history/logs panes | Tasks render; logs stream |
| Pi | New app (Day 21) — send message via llm-adapter | Renders; streams via same socket path |
| OpenCode | New app (Day 22) — supervisory chat, shows recent local sessions if any | Renders; no key in browser |
| Agent Control | Health/status for all 4 agents; diagnostics | All show Unreachable when down; 502 not "Connected" |
| Security | Browser never sees `OPENCODE_GO_API_KEY` etc.; `/api/llm/*` proxies | `view-source` shows no key; network tab no `sk-` |

### 4.4 Performance & Persistence (15 pts)
| Axis | Check | Pass |
|------|-------|------|
| Startup | `time curl localhost:3080/` + first paint <1s on VPS | <1.5s |
| Responsiveness | Drag, resize, dock hover 60fps; no jitter (transitions disabled during drag); Exposé 60fps | rAF smooth |
| Persistence | Open/move windows → reload → same pos (300/150 audit); theme/accent/wallpaper survive; chat survives (Day 26) | `persist.js` exact |
| Errors | Console: only expected 502 agent-offline + 404 wallpaper probe | No stray `console.error` |

**Overall grading:** 90-100 A (ship), 75-89 B (polish), 60-74 C (fix), <60 block release. Evaluator records browser (Chrome/Safari), viewport (≥1024px), and date. **For minimal, grade on beauty + agent discussion, not breadth.**

### 4.5 Human Eval Session Protocol (30 min) — minimal
1. Boot: `cd /root/openos-eval && node server.js` (or `/root/kimi-browser-desktop` if still in-branch) → open `http://localhost:3080` (or VPS :3080 tunneled).
2. Shell beauty sweep (8 min): dock hover (magnify + bounce), launch each of 8-10 apps, window drag/resize/minimize-restore, Exposé grid, Spotlight Cmd+Space, Launchpad F4, Notification Center (clock), Control Center brightness.
3. Desktop deep dive (5 min): wallpaper, icons, right-click, rename, drag reflow.
4. Calendar (5 min): add/edit/delete event; reload → persists.
5. Agent apps (10 min): test Hermes/OpenClaw/Pi/OpenCode offline honesty + mock reply; if backends live via `HERMES_URL`/`OPENCLAW_URL`, test streaming + markdown.
6. Persistence (2 min): reload, check positions/theme/chat/desktop layout.
7. Score rubric + notes → file as `docs/evals/YYYY-MM-DD_<evaluator>.md` via one-pager template.

---

## 5. One-Pager Template (`docs/ONE_PAGER_TEMPLATE.md` after Day 27) — swappable per LLM

> Copy this template per model evaluation. Fill for Kimi K3 on Day 28; reuse verbatim for next open model's rebuild — **only the cherry paragraph + model IDs change**.

```markdown
# [Model] OpenOS Eval — One-Pager

**Model:** Kimi K3 (Moonshot) — `opencode-go/kimi-k3`  _(swap per model: e.g., Qwen3.8-Flash `opencode-go/qwen3.8-flash`)_
**Date:** YYYY-MM-DD
**Builder LLM:** opencode-go/kimi-k3 (Kimi Code) _(swappable)_
**Supervisor:** OpenCode (Muse Spark) via tmux `phase3-kimi-supervisor` / `kimi-os-root`
**Repo:** openos-eval @ v1.0.0-openos-eval — `git log --oneline -30` (1/day)
**Desktop:** http://localhost:3080 (VPS :3080)
**App count:** 8-10 (4 GUI: Calendar + Desktop + Exposé + Dock/Launchpad/Spotlight + Settings + 4 agents: OpenCode/OpenClaw/Hermes/Pi)

### TL;DR (3 bullets)
- Built beautiful minimal Mac VPS OS with 8-10 apps — 4 beautiful shell GUIs (Desktop, Exposé, Dock, Calendar) + 4 GUI conversational apps (OpenCode/OpenClaw/Hermes/Pi) — all working, all streaming, all persisted.
- Model cherry: Kimi K3 — **2.8T MoE (104B active, 16/896 + 2 shared), Hybrid Attention (3×KDA + 1×Gated MLA, NoPE), Attention Residuals, Stable LatentMoE, 93 layers, 1M context, MXFP4** — cited for long-horizon coding/agentic work.
- Human eval: __/100 — Visual __/30, Apps __/30, Agents __/25, Perf __/15. Verdict: [A/B/C].

### What was rebuilt (slices) — minimal
- Shell beauty: window depth, dock magnification/bounce, desktop wallpaper/blur, exposé grid, spotlight/launchpad, persistence, a11y.
- Minimal apps: Calendar (only productivity app), Desktop/Finder-lite, Settings, Control Center — ≤10 total, rest expands later.
- Agent apps: llm-adapter (swappable), Hermes/OpenClaw/Pi/OpenCode GUI, streaming, honesty, no keys in browser.

### Cherry — Why this model matters here (SWAPPABLE — replace per LLM)
> Moonshot Kimi K3: 2.8T hybrid KDA+MLA multimodal MoE. Each block 3 KDA + 1 Gated MLA (NoPE), Attention Residuals, Stable LatentMoE (16/896 routed). Quote: *"built with Kimi Delta Attention, Attention Residuals, and Stable LatentMoE, with 104B activated and 1M-token context"* (NVIDIA NIM). Relevance: long-horizon coding + agentic knowledge work is exactly the OS-build task — sustained multi-file edits, adapter boundaries, E2E verification.
>
> For next model, replace this block only — e.g., for Qwen3.8-Flash: "..."

### Human eval (rubric — minimal)
| Axis | Score | Notes |
|------|-------|-------|
| Visual fidelity (beauty) | __/30 | Desktop/Exposé/Dock/blur |
| Minimal app functionality | __/30 | Calendar + Desktop + Settings |
| VPS conversational | __/25 | 4 agents |
| Perf & persistence | __/15 | |
| **Total** | __/100 | Graded on beauty + agent discussion |

### Defects carried → fixed (from STATUS Known Risks)
- Offline honesty: fixed (no fake "Connected")
- Chat history: moved to `data/agent-history.json`
- Minimized persistence: fixed
- Terminal: removed in minimal (no shell attack surface)
- Volume/Music: stubbed / out of scope

### Cost & tokens
| Source | Sessions | Turns | Output tok | Cost |
|--------|----------|-------|------------|------|
| Kimi K3 via OpenCode Go Zen |  |  |  | $5 flat |
| Supervisor (GPT-5.5/Qwen) |  |  |  | est |

### How to reproduce (LLM-swappable)
1. `LLM_PROVIDER=kimi-k3 LLM_MODEL=opencode-go/kimi-k3 node server.js`
2. Swap: `LLM_PROVIDER=qwen3.8-flash` — same OS, same tests (8-10 apps), new `docs/evals/YYYY-MM-DD.md`.
3. Verify: `npm test` (API + 8-10 apps + probes) + `tests/e2e/human-checklist.sh`.

### Links
- Repo: github.com/…/openos-eval
- Desktop: :3080
- Evals: `docs/evals/`
- Kimi K3: hf.co/moonshotai/Kimi-K3 · arxiv 2607.24653 · build.nvidia.com/moonshotai/kimi-k3
```

---

## 6. Operational Guardrails

- **No push until Day 30 approval** — local `git commit` only; `git remote add origin` on Day 1 but `git push` blocked in commit hook or manual policy.
- **1 commit/day** — if LLM is fast, batch changes locally and commit at noon UTC; use `docs/lineage.md` to stage.
- **Leave tmux alone** — `phase3-kimi-supervisor` (4 windows) and `kimi-os-root` stay; new work in `openos-eval` dir + new tmux window `kimi-30day` if needed.
- **Rate limits** — `gh api` calls <50/day; `opencode-go` calls via existing Zen key; do not spam `openai/gpt-5.5` orchestrator in build.
- **Secrets** — `OPENCODE_GO_API_KEY`, `HERMES_URL`, `OPENCLAW_URL` server-side only; never in `public/js/*`, logs, or commits.
- **Verification before each commit** — `npm test` + `node tests/e2e/smoke.js` + `node tests/e2e/persist.js` + manual spot check of that day's slice.

---

## 7. Watch Commands (VPS tmux)

```bash
# List sessions (expect 2: kimi-os-root + phase3-kimi-supervisor)
tmux ls

# Attach to supervisor/root (detach with Ctrl-b d)
tmux attach -t kimi-os-root
tmux attach -t phase3-kimi-supervisor

# Non-attaching peek (for logs / headless checks)
tmux capture-pane -p -t kimi-os-root:0
tmux capture-pane -p -t phase3-kimi-supervisor:0
tmux capture-pane -p -t phase3-kimi-supervisor:1
tmux capture-pane -p -t phase3-kimi-supervisor:2
tmux capture-pane -p -t phase3-kimi-supervisor:3

# Scrollback (last 200 lines)
tmux capture-pane -p -S -200 -t kimi-os-root
tmux capture-pane -p -S -200 -t phase3-kimi-supervisor:0

# Logs (if running via node)
tail -f /root/kimi-browser-desktop/kimi-run.log
tail -f /root/openos-eval/server.log  # after Day 1

# Verify desktop still up
curl -s http://localhost:3080/ | head -n 20
curl -s http://localhost:3080/api/llm/health
npm test  # or node tests/e2e/smoke.js
```

**Do not kill** `kimi-os-root` or `phase3-kimi-supervisor` — new work uses `openos-eval` dir and optional window `tmux new-window -t phase3-kimi-supervisor -n kimi-30day`.

---

## 8. File Path Created

- **`/root/kimi-browser-desktop/docs/30DAY_PLAN.md`** — this plan (sliced table + rubric + template, minimal 4+4 scope).
- Next artifacts (by Day 27): `docs/HUMAN_EVAL_RUBRIC.md`, `docs/ONE_PAGER_TEMPLATE.md`, `docs/lineage.md`, `docs/evals/` — all trimmed to 8-10 apps.

---

## 9. Next Actions (no push) — YOLO

1. Day 1 (today, YOLO): `mkdir -p /root/openos-eval && cp -r /root/kimi-browser-desktop/* /root/openos-eval/ 2>/dev/null; cd /root/openos-eval && git init && git checkout -b openos-rebuild-30day` — or `gh repo create openos-eval --public --clone` if GitHub reachable.
2. Create Project + milestones + 30 issues (local, no push), commit D1 `chore: init openos-eval repo + 30-day project board` at noon UTC.
3. Run D1 commit then share `git log --oneline -1` + `gh issue list` for sign-off before D2 — **no approval gate blocks Day 1 init in YOLO mode**.

Refs: `STATUS.md:158-197` (Known Risks + Acceptance Review), `public/js/apps/*.js` (21 legacy apps → trimmed to 8-10), `routes/agent.js:1-87`, `supervisor/PHASE*.md`, Kimi K3 sources: `arxiv.org/html/2607.24653v1`, `github.com/MoonshotAI/Kimi-K3`, `docs.api.nvidia.com/nim/reference/moonshotai/kimi-k3`.
