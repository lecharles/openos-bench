# OpenOS — Overnight Build Status

**Model:** GLM-5.3 (open-weight inference key) · **Session:** 2026-11-18 ~22:10 → 23:30 PST · **Result: feature-complete, all self-tests green**

OpenOS is a macOS-class desktop environment in the browser: vanilla JS (ES modules) + CSS on the front, Node/Express on the back. No bundler, no frontend build step — `npm start` and go.

---

## How to run

```bash
npm start            # serves on :3000 (or set PORT)
```

Open `http://localhost:3000/`. First boot takes ~2s (boot screen with progress bar). No server is left running from the overnight session — the port is free for a fresh `npm start`.

**Self-test suite** (drives the real page in headless Chromium over CDP — no test framework, no new deps):

```bash
node scripts/e2e.js             # 21/21 checks (requires server running on :3000)
node --experimental-vm-modules scripts/check-modules.js   # syntax check all 33 modules
node scripts/screenshot.js out.png "url" ms "eval"        # capture with pre-shot eval
node scripts/pngprobe.js file.png                          # decode + region colors
```

---

## Hard requirements — all pass

| Requirement | Status | Evidence |
|---|---|---|
| Desktop shell: menu bar (clock, working dropdowns), wallpaper, desktop icons + right-click context menu | ✅ | Apple menu, app menu (changes per active app), File/Edit/View/Window/Help, Wi-Fi/battery/clock menus, Control Center panel; live clock (1s tick); right-click desktop → New Folder / Sort / Change Wallpaper |
| Window manager: drag, 8-way resize, traffic lights, focus z-ordering, open/close animations | ✅ | All E2E-verified: drag moves window, SE-handle resize grows it, close/min/zoom work, minimize genie-animates toward the dock icon, focus ring + z-order + title dim on blur |
| Dock: magnification on hover, running indicators, launch bounce or genie minimize | ✅ | All three: cursor-distance magnification (quadratic falloff), running dots, 2× launch bounce, genie minimize into dock, tooltip labels, trash badge with live count |
| Spotlight: ⌘-Space overlay, fuzzy app search, Enter launches | ✅ | Ctrl+Space also works; fuzzy scoring over **apps + system commands + real files** (indexed from the Home tree); arrows + Enter + click-to-launch |
| Finder: real filesystem via backend API — list, open, breadcrumbs, icon + list views, sidebar favorites | ✅ | Browses real seeded folders; breadcrumbs clickable; icon & list views (⌘1/⌘2); sidebar Favorites + Locations (Home / Macintosh HD / VPS Shared) + Applications (virtual) + Trash; back/forward history; rename; move-to-trash; new folder |
| ≥12 working apps | ✅ 15 apps | Finder, Notes, Calendar, Weather, Calculator, Preview, Trash, Settings, Clock, Contacts, Music, Mail, Terminal, Photos, TextEdit (+About window). All open cleanly with content (E2E-verified) |
| Persistence: window layout + settings survive reload, server-side JSON | ✅ | `os-data/store/layout.json` + `settings.json`; layout restores window geometry + minimized state + per-app payload (Finder path, Notes selection, Music view…); settings sync across tabs via socket.io |
| Filesystem API safety: path allow-list; `/etc/shadow` → 403 | ✅ | Probes return **403** for `/etc/shadow`, `/etc`, `~/../store`, `//etc/shadow`, and any write outside the allow-list (realpath-resolved). Allow-list: user Home + public/ + /tmp/openos-share |

---

## App inventory (15)

| App | What works |
|---|---|
| **Finder** | Real FS browse, breadcrumbs, icon/list views, sidebar, rename (inline), trash, new folder, back/forward |
| **Notes** | Three-pane, first line = title, search, new/delete, autosave to server JSON |
| **Calendar** | Month grid, today highlight, event add/delete per day (popover), persisted to server |
| **Weather** | 8 cities, current + hourly + 10-day range bars, animated sun; static mock data (per spec) |
| **Calculator** | macOS layout, keyboard input when focused, ±, %, chained ops |
| **Preview** | Renders **real image files** (generated PNGs/SVGs) via FS API, zoom/rotate/fit, sibling thumbnails |
| **Trash** | Lists trashed items with original path + date, Put Back (restore), two-step Empty, badge count |
| **Settings** | Light/Auto/Dark themes, 8 accents, 8 wallpapers, dock size + magnification sliders, About pane — all persisted |
| **Clock** | Live analog face (250ms sweep) + 6 world clocks with offsets |
| **Contacts** | Search, avatar colors/initials, add/edit/delete, persisted to server |
| **Music** | Albums/songs/playlists, simulated playback with **real WebAudio synth tones**, progress seek, volume |
| **Mail** | Mock inbox/sent/drafts/junk/trash, unread dots + sidebar badges, reader pane, reply with quote, compose + send (mock) |
| **Terminal** | Sandboxed shell: ls -l, cd, pwd, cat, echo >, mkdir, touch, rm, mv, cp, open, neofetch, history — all through the allow-listed API (cd /etc → Forbidden) |
| **Photos** | Gallery over real `~/Pictures`, favorites (localStorage), lightbox with prev/next, context menu (open in Preview / reveal in Finder) |
| **TextEdit** | Opens/edits/saves real text files (⌘S), save-as via name field, modified dot, char/word counts |

Extras beyond the 15: Launchpad (dock grid → full-screen app launcher), ⌘Tab app switcher, sleep/restart/shutdown overlays, boot screen, Control Center (Wi-Fi/DND/dark-mode/brightness/volume), Do Not Disturb suppresses toasts, cross-tab settings sync.

## Interaction probes verified (E2E, 21/21)

Boot & render · overlays hidden (hit-test) · window hit-testable · `/etc/shadow` 403 · open app · drag · 8-way resize (SE) · minimize + dock-restore · traffic-light close · spotlight launch (⌘Space → type → Enter) · calculator math (7×6=42) · dock magnification · terminal ls/cat · terminal sandbox rejection · finder breadcrumb navigation · trash flow (context menu → trash → restore) · desktop rename commits to server · theme persists server-side · layout survives reload · theme survives reload · all 15 apps open without exceptions.

## Security

- Every FS request resolves through `safeResolve()`: normalize → realpath deepest existing ancestor → rejoin → **allow-list check** (Home / public / /tmp/openos-share). Everything else → 403, including symlink tricks, `..` traversal, absolute-path probes, and writes outside the roots.
- No shell execution anywhere — Terminal is a command interpreter over the FS API.
- No third-party network calls, no credentials. Image assets are generated at seed time by a hand-rolled PNG encoder (`scripts/gen-assets.js`).

## Stack & architecture

- **Frontend:** 33 ES modules, ~0 dependencies, hand-drawn SVG icon set (squircle app icons + stroke glyphs), CSS-variable theming (light/dark × 8 accents), backdrop-filter blur throughout, Web Animations API for window/dock/genie animations.
- **Backend:** Express + socket.io (only the two provided deps). JSON stores with atomic writes (tmp+rename). FS API: list/read(text|base64|stat)/write/mkdir/rename/delete + trash/restore/empty.
- **Data:** `os-data/` (user Home seeded with Documents/Downloads/Pictures/Desktop + 10 real images, trash dir, JSON stores). Regenerates if missing.

## Screenshots (verified via pixel probe)

`screenshots/01-desktop-light.png` · `02-apps-open.png` · `03-spotlight.png` · `04-dark-mode.png` · `05-terminal.png` · `06-photos-preview.png`

## Known limitations (honest list)

- Mail/Weather data is mock (allowed by spec). Music audio is a synth loop, not real tracks.
- Photos favorites use localStorage (not server JSON); everything else persists server-side.
- Dock magnification is mouse-only (no touch). Menu-bar battery % is decorative.
- Single-user system: no auth; stores are shared across all tabs/sessions (by design for the bench).
- `--virtual-time-budget` headless runs stall on the socket.io websocket — use `?nosock` query for headless testing (the E2E harness does).
- One cosmetic quirk: in very short viewports the Calendar popover clamps to the window bottom.

## Bottom line

Shell, WM, Dock, Spotlight, Finder, 15 apps, server-side persistence, and the security allow-list are all implemented and verified end-to-end in a real browser. The remaining gaps are the mock-data items explicitly permitted by the spec.
