# OpenOS Bench - Fixed Task Spec v0 (frozen 2026-11-19)

Same task for every model. The spec is frozen; changes require a version bump and re-run of affected rows.

## Mission

Build **OpenOS**: a macOS-class desktop environment that runs in a browser, served by a small Node/Express backend on a Linux VPS. Stack inside the web app is the model's choice (vanilla JS is the house style; deviations are recorded as a scored signal). You work solo; a human-grade E2E suite scores you in the morning.

## Required outcome (hard requirements)

1. **Desktop shell**: menu bar (clock, working dropdown menus), wallpaper, desktop icons with right-click context menu
2. **Window manager**: drag, 8-way resize, traffic lights (close/minimize/maximize), focus z-ordering, open/close animations
3. **Dock**: magnification on hover, running indicators, at least launch-bounce or genie-minimize
4. **Spotlight**: ⌘-Space overlay, fuzzy app search, Enter launches
5. **Finder**: browse the real filesystem through the backend API (list, open folder, breadcrumbs), icon + list views, sidebar favorites
6. **At least 12 working apps** from this menu: Notes (persisted), Calendar (month view + events), Weather, Calculator, Preview (renders real images), Trash (move/restore), Settings (theme/wallpaper, persisted), Clock, Contacts, Music, Mail (mock data OK), Terminal (sandboxed), Photos, TextEdit
7. **Persistence**: window layout + settings survive reload (server-side JSON, not just localStorage)
8. **Filesystem API safety**: path allow-list; a probe at `/etc/shadow` must return 403

## Constraints

- Serve on the provided port via `npm start`; no external frontend build step (no bundler installs beyond express + socket.io)
- No real credentials, no network calls to third-party APIs (mock data is fine; Weather may be static)
- 1 overnight session ceiling; stop cleanly with a STATUS.md summarizing what passes
- Quality bar: it should feel like macOS, not like a wireframe. Animations, shadows, blur, spacing are scored by the human pass.

## Scoring (published per run)

- Apps render: N/12+ (headless E2E)
- Interaction probes: N/15 (drag, resize, spotlight-launch, rename, trash-restore, theme-persist, ...)
- Persistence: pass/fail across reload
- Security probe: allow-list enforcement
- Human pass: fidelity, feel, broken surfaces (primary judge)
- Cost telemetry: tokens + wall-clock
