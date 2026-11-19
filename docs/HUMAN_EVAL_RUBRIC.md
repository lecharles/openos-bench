# OpenOS Bench - Human Eval Rubric (v1)

How every run is graded. Automated probes report numbers; the human pass is the primary judge. Final score is out of 100.

**Weighting:** Visual Fidelity 30 · App Functionality 30 · Agent/VPS Apps 25 · Performance & Persistence 15.
**Per-axis scale:** 5 = indistinguishable from macOS on that axis · 3 = recognizable but rough · 1 = missing or broken.

## 1. Visual Fidelity (30 pts) - "Does it feel like macOS?"

| Axis | What to evaluate | Pass criteria |
|------|------------------|---------------|
| Wallpaper & blur | Menu bar + dock + window chrome use backdrop blur with graceful fallback | No FOUC; blur renders; wallpaper served offline |
| Windows | Multi-layer shadows (focused vs unfocused), corner radius, open/close/genie/zoom animation timings, 8-way resize, z-order on click | Minimize animates to the live dock rect; restore bounces |
| Dock | Glass background, running dots, cosine magnification, tooltip, launch bounce | Magnification smooth (rAF); bounce fires on launch/restore |
| Menubar & dropdowns | System typography, hover states, response latency | Dropdowns read as macOS; clock reaches Notification Center |
| Desktop & Exposé | Icons on wallpaper, right-click context menu, window overview grid | Desktop renders; overview shows all open windows |
| File browsing surface | Icon/list/column/gallery views as claimed by the build | No crash; rename persists |

## 2. App Functionality (30 pts)

Scored against the frozen task spec's hard requirements ([eval/task-spec.md](../eval/task-spec.md)): at least 12 working apps from the menu, each exercised by the click path in [docs/DEMO.md](DEMO.md). Per app: launches (binary), core interaction works (binary), feels finished (1-5).

## 3. Agent / Conversational Apps (25 pts)

GUI panels for coding/chat agents must stream through the server-side adapter - the browser never sees provider keys. Offline behavior must be honest ("offline/mock"), never a fake "Connected".

## 4. Performance & Persistence (15 pts)

| Axis | Check | Pass |
|------|-------|------|
| Startup | Time to first paint on the VPS | < 1.5 s |
| Responsiveness | Drag, resize, dock hover, overview | 60 fps, no jitter |
| Persistence | Open/move windows, change theme → reload | Layout + settings restored server-side |
| Security | Allow-list probe (`/etc/shadow`, traversal, symlink tricks) | 403, no leakage |

## Automated probe mapping

| Probe | Metric |
|-------|--------|
| Apps render | N/12+ (headless E2E) |
| Interaction probes | N/15 (drag, resize, spotlight-launch, rename, trash-restore, theme-persist, ...) |
| Persistence | pass/fail across reload |
| Security | allow-list enforcement pass/fail |
| Human pass | rubric above, primary judge |
| Cost telemetry | tokens + wall-clock per run |

## Historical note: Run 01 (Kimi K3)

The July baseline predates the frozen minimal spec and was graded on the legacy 21-app bar: 21/21 apps rendered, 15/15 interaction probes, persistence verified, human acceptance pass. It is kept in the leaderboard as the baseline row with its original metrics, marked as legacy-scope.
