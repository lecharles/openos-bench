# OpenOS — STATUS.md

Run: `npm start` (serves on `$PORT`, default 3000, auto-falls-back to next free port and prints the URL).
Stack: vanilla JS ES-modules + hand-written CSS on the frontend; Express + socket.io backend. No bundler, no extra deps.
Self-test: `node tests/smoke.cjs` (spawns its own server + headless Chrome; **50/50 probes pass, 0 page errors**).

## What works

### Desktop shell
- Menu bar: blur/translucent, Apple-style logo menu (About This Mac, System Settings, Sleep, Lock Screen, Restart), per-app dynamic menus (File/Edit/View/Go/Window/Help) with working actions + shortcut labels, hover-switching dropdowns, Wi-Fi/Battery/Control-Center items, live clock (`Wed Nov 19 5:11 AM`).
- Control Center panel: dark-mode toggle, brightness (real screen dim), volume (real WebAudio master gain), wallpaper quick-switch.
- 7 CSS-gradient wallpapers (Sonoma/Big Sur/Ventura/Sunrise/Ocean/Forest/Graphite), switchable + persisted.
- Desktop icons from the real virtual FS (`/Desktop`): select, drag (positions persisted), double-click opens (folder→Finder, image→Preview, text→TextEdit), right-click menu (Open/Get Info/Rename/Move to Trash), right-click desktop menu (New Folder, Clean Up, Change Wallpaper…).
- Boot screen (logo + progress), lock/sleep screen with live clock, toast notifications.

### Window manager
- Drag by titlebar (with un-maximize-on-drag like macOS), edge-snapping (top = zoom, left/right = halves) with live snap preview.
- 8-way resize handles with correct cursors and per-app min sizes.
- Traffic lights: close (scale/fade anim), minimize (**genie-style WAAPI animation into the Dock icon**), zoom (animated maximize/restore); glyphs appear on hover; gray when unfocused.
- Focus z-ordering, active/inactive shadows + titlebar dimming, open/close spring animations, ⌘W/⌘M/⌘Q/⌘N/⌘1/⌘2 shortcuts.
- Multi-window apps (Finder, TextEdit, Preview, Terminal, Get Info, Compose).

### Dock
- Hover **magnification** (smoothstep falloff, icon lift), tooltips, running indicators (dots), **launch bounce**, genie minimize target, separator + Trash item whose icon changes when full, right-click menus (Open/New Window/Empty Trash…), click-running-app cycles/minimizes.

### Spotlight
- ⌘-Space / Ctrl-Space overlay with blur card, **fuzzy subsequence scoring** over app names+keywords ("wethr" → Weather), arrow-key navigation, Enter launches (with dock bounce), Esc/backdrop dismiss.

### Finder
- Browses the real (virtual) filesystem through the backend API: list/open folder/breadcrumbs (clickable), back/forward history, icon view + list view (sortable columns), sidebar Favorites/Locations/Trash with live trash count, search filter, hidden-files toggle (⇧⌘.), status bar.
- Per-item context menu: Open, Open in New Window, Get Info (real info window), inline Rename (Enter/Esc, extension preserved selection), Move to Trash; empty-area menu: New Folder (auto-rename), view toggles, sorting.
- Image files render as real thumbnails (server-streamed PNGs).

### Apps (15 windowed + 3 hidden)
Finder, Notes, Calendar, Weather, Calculator, Preview, Trash, System Settings, Clock, Contacts, Music, Mail, Terminal, Photos, TextEdit (+ hidden: Get Info, About This Mac, Mail Compose).
- **Notes**: pinned/sections, search, autosave to server state, word count, context menu (pin/duplicate/delete).
- **Calendar**: month grid with today highlight + colored event chips, prev/next/Today, mini-month + upcoming sidebar, click-day popover to add/delete events (time + title), persisted.
- **Weather**: static mock, iOS-style cards: hourly strip, 10-day range bars, 6 metric tiles, procedural SVG weather icons.
- **Calculator**: macOS layout, full chained-operator logic, %, ±, keyboard support, operator highlight.
- **Preview**: renders real images from the FS API, zoom in/out/fit, wheel zoom, rotate, image library picker.
- **Trash**: lists `.Trash`, Put Back (restores to original path), Delete Immediately, Empty Trash, confirmations.
- **Settings**: Appearance (Light/Dark/Auto, 8 accents, wallpaper grid with live previews), Desktop & Dock (size slider, magnification), Displays (brightness), Sound (volume + alert beep), About (live /api/system specs). All persisted server-side.
- **Clock**: World Clock (6 cities, live analog SVG + digital), Stopwatch (laps), Timer (ring + presets + audio alarm).
- **Contacts**: seeded 6, search, avatar gradients, detail cards, inline edit/add/delete, persisted.
- **Music**: 8-track library, **generative WebAudio synth per track** (chords/bass/arps/hats through an analyser), live visualizer canvas, transport + seek bar + volume, next/prev/shuffle/repeat.
- **Mail**: 8 seeded conversations, mailboxes with unread badges, reading pane with quotes + mock attachments, Compose window → Sent → **mock auto-reply arrives 3 s later with a toast**.
- **Terminal**: sandboxed shell over the FS API (ls/cd/pwd/cat/echo>/touch/mkdir/mv/cp/rm/trash/open/apps/neofetch/history/tab-completion/arrow-history); host paths unreachable (`cat /etc/passwd` → not found inside the sandbox).
- **Photos**: Memories hero, grid of real images, favorites (persisted), fullscreen-style viewer with prev/next.
- **TextEdit**: open/save text files (Save-As modal with location picker + dedupe), dirty dot in title, ⌘S, word/char status, monospace toggle, Open… picker.

### Persistence (server-side JSON, `data/state.json`)
- Window layout (app, rect, z, minimized, maximized, per-window params) restored on reload.
- Settings (theme/accent/wallpaper/dock/brightness/volume), notes, calendar events, contacts, mail (read/sent), photos favorites, desktop icon positions, trash metadata.
- Debounced PUT + `sendBeacon` flush on unload. Verified across reload in E2E.

### Filesystem API safety
- Allow-list = `<project>/fsroot` only; absolute paths outside → **403** (`/etc/shadow` list/read/raw all 403), `../` traversal → 403, symlink realpath re-check → 403, writes/moves clamped inside root. Verified by probes.

### Backend extras
- `GET/PUT/POST /api/state`, `/api/fs/{list,read,raw,write,mkdir,rename,move,delete,stat}`, `/api/system`, `/health`; atomic state writes; socket.io presence → menu-bar badge.
- `scripts/gen-assets.js`: pure-Node PNG encoder + 12 procedural photos/scene images seeded into `fsroot` (no deps, no network).

## Known limitations (honest)
- No Mission Control/Spaces, no multi-select in Finder, snap layouts only via edge-drag.
- Weather/Mail/Contacts/Music library are mock data by design (spec allows).
- Window content blur is titlebar/sidebar-only (full vibrancy everywhere would cost too much paint in headless).
- Emoji avoided (headless font gaps); icons are all hand-drawn SVG.

## E2E probe summary (`node tests/smoke.cjs`)
boot(6) + app-render(15) + window-manager(8: drag, resize SE, resize N, minimize, dock-restore, zoom, z-order, close)
+ spotlight(4: open, fuzzy, enter-launch, escape) + finder(7: context menu, rename-persist, trash, restore, list view, breadcrumbs×2)
+ persistence(5: theme toggle, wallpaper, theme-reload, wallpaper-reload, layout-reload) + dock(2) + terminal sandbox(2) + security(1 aggregate, 4 URLs).
**50/50 pass; zero uncaught page errors** (console 403/404 entries are the probes' own blocked requests).
