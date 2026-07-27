# KiMi Browser Desktop — Status

## Current Status: **Phase 4 — Apple Design Pass Complete**

**Last Updated:** 2026-07-27 UTC

**Build:** Verified — visual refinement pass applied, 40 source files.

## Phase 4: Apple Human Interface Design Pass

### Design Philosophy
Applied Apple Human Interface Guidelines principles to elevate the desktop from functional to polished. Every visual element was refined for cohesion, depth, and elegance.

### Design Decisions & Rationale

#### Typography
- **Font stack**: SF Pro via `-apple-system` with `BlinkMacSystemFont` fallback; SF Mono for code surfaces
- **Font weights**: Regular (400), Medium (500), Semibold (590), Bold (700) — matching Apple's weight scale
- **Letter spacing**: `-0.02em` for titles, `0` for body text — tighter tracking for display sizes
- **Antialiasing**: `-webkit-font-smoothing: antialiased` applied globally for crisp text rendering
- **Tabular numbers**: Applied to clock display via `font-variant-numeric: tabular-nums`

#### Spacing & Layout
- **8px grid system**: All spacing tokens derived from 4px base (4, 8, 12, 16, 20, 24, 32, 40, 48)
- **Desktop icons**: Changed from flexbox column layout to CSS Grid for proper alignment
- **Window content**: Removed default padding (16px) — apps now control their own content padding

#### Color System
- **CSS Custom Properties**: Full design token system with `--color-*`, `--space-*`, `--radius-*`, `--text-*` variables
- **Apple semantic colors**: Blue (#007AFF), Red (#FF3B30), Orange (#FF9500), Green (#34C759), etc.
- **Window background**: `rgba(255,255,255,0.88)` — slightly more opaque for readability
- **Panel translucency**: `rgba(255,255,255,0.92)` for overlays and panels
- **Wallpaper gradient**: Replaced dark gradient with vibrant purple-pink-blue gradient reminiscent of macOS wallpapers

#### Shadows & Depth
- **5-tier elevation system**: Named `--elevation-1` through `--elevation-5` for consistent depth hierarchy
- **Window shadows**: Layered — multiple stacked shadows with varying blur and offset for realistic depth
- **Focus elevation**: Windows gain deeper shadow on focus (`--window-shadow-focus`)
- **Drag shadow**: Dragging windows cast deeper, wider shadows (`--window-shadow-drag`)

#### Translucency & Blur
- **Menu Bar**: `blur(20px) saturate(180%)` — Apple-standard glass effect
- **Dock**: `blur(30px) saturate(200%)` — heavier blur for the prominent bottom element
- **Windows**: `blur(24px) saturate(180%)` — balanced for content readability
- **Overlays**: `blur(10px) saturate(150%)` on background, stronger on panels
- All with `-webkit-backdrop-filter` fallbacks for Safari

#### Window Chrome
- **Traffic light buttons**: 13px (up from 12px), with inset shadow for depth
- **Button icons**: SVG icons appear on titlebar hover — close (×), minimize (−), maximize (□)
- **Button press**: Scale down to 0.88 on active for tactile feedback
- **Titlebar**: Lighter background when unfocused, slightly darker when focused
- **Border radius**: 10px windows (`--radius-lg`), 0px when maximized

#### Dock Behavior
- **Glass morphism**: Translucent background with heavy blur, subtle border
- **Magnification**: Proximity-based scaling — items grow up to 1.25× as cursor approaches
- **Spring easing**: `cubic-bezier(0.17, 0.67, 0.35, 1.17)` for natural magnification feel
- **Labels**: Appear on hover with fade transition
- **Running indicator**: 4px dot under running apps with subtle glow
- **Rounded capsule**: 18px border radius (`--radius-2xl`)

#### Animations & Easing
- **Apple's standard curves**: 
  - Default: `cubic-bezier(0.25, 0.1, 0.25, 1)` — basic transitions
  - Spring: `cubic-bezier(0.17, 0.67, 0.35, 1.17)` — bouncy overshoot for dock/launchpad
  - Smooth: `cubic-bezier(0.2, 0, 0, 1)` — material-style deceleration
- **Duration tokens**: Instant (0ms), Fast (100ms), Normal (200ms), Slow (300ms), Enter (350ms), Spring (400ms)
- **Window open**: Scale from 0.92 with 12px upward slide (`window-open` keyframe)
- **Window close**: Scale to 0.92 with fade out (150ms transition)
- **Minimize**: Scale to 0.85 with 40px downward translation, opacity to 0
- **Overlay enter**: Opacity + scale + translateY spring animation
- **Context menu**: Scale from 0.96 at origin point with fade

#### Iconography
- **Apple logo**: SVG mask technique — renders in current menu bar text color
- **Traffic light icons**: SVG data URIs embedded in CSS for crisp rendering
- **Desktop icons**: 44px emoji with drop-shadow for legibility against wallpapers
- **Launchpad icons**: 52px emoji with 0.2px text-shadow for dark backgrounds

#### Interactions
- **Hover states**: Consistent 100ms background transitions on all interactive elements
- **Press states**: Scale-down feedback (0.88–0.96×) on buttons, dock items, control toggles
- **Selection**: Blue-tinted background (`rgba(0,122,255,0.25)`) with `::selection` pseudo-element
- **Focus rings**: `:focus-visible` outlines in system blue for keyboard navigation
- **Scrollbar**: 6px thin scrollbar with transparent track, visible on hover

#### Reduced Motion
- `prefers-reduced-motion: reduce` media query disables all animations (0.01ms durations)

### Files Changed
| File | Change |
|------|--------|
| `public/css/style.css` | Complete rewrite — 600+ lines with design tokens, Apple HIG patterns |
| `public/js/core/window-manager.js` | Close animation, larger default window (720×500), focus/minimize refinement |
| `public/js/core/dock.js` | Proximity-based magnification system, spring easing |
| `public/js/core/spotlight.js` | Keyboard navigation (arrow keys, enter), mouse hover selection |
| `public/js/core/launchpad.js` | Escape key dismiss, click-outside dismiss |
| `public/js/core/menubar.js` | Refined Apple menu positioning, animation, action feedback |

## Completed

### Core Architecture
- [x] Express.js server on port 3080
- [x] Socket.IO for real-time communication
- [x] File-based JSON persistence (settings, windows, notes, reminders, calendar, contacts, mail)
- [x] Static file serving for frontend

### Desktop Shell
- [x] Menu bar with clock, Apple menu, app menus
- [x] Dock with all app icons and running indicators
- [x] Window manager (drag, resize, minimize, maximize, close, focus)
- [x] Persistent wallpaper (upload/save/load)
- [x] Desktop icons
- [x] Context menu (right-click)

### System Features
- [x] Spotlight search (Cmd+Space or menu bar icon)
- [x] Launchpad (F4 key)
- [x] Notification Center
- [x] Control Center (Wi-Fi, Bluetooth, AirDrop, Focus, Brightness, Volume toggles)

### Applications (21 total)
- [x] Finder — file browser with directory navigation
- [x] Calendar — monthly calendar view
- [x] Notes — create/edit/delete notes with persistence
- [x] Clock — digital clock with stopwatch and timer
- [x] Calculator — basic calculator (+, -, ×, ÷, %, ±)
- [x] Weather — city weather display
- [x] Mail — inbox with compose and read
- [x] Messages — chat interface with contacts
- [x] Contacts — contact management with CRUD
- [x] Photos — photo gallery viewer
- [x] Music — music player with track list
- [x] Reminders — to-do list with checkboxes
- [x] Preview — file previewer
- [x] Text Editor — text file editor with save
- [x] Activity Monitor — process list (ps aux)
- [x] System Settings — appearance, wallpaper, about
- [x] Terminal — command-line interface with real shell
- [x] Trash — trash with restore and empty

### Agent Applications
- [x] Hermes — chat with mock fallback when agent unavailable
- [x] OpenClaw — chat with tasks, history, logs sidebar
- [x] Agent Control — health checks, status, restart, diagnostics for all agents

### Persistence
- [x] Settings (theme, accent color)
- [x] Window positions and sizes saved/restored
- [x] Wallpaper upload and restore
- [x] App data (notes, reminders, contacts, mail, calendar)

## How to Run
```bash
cd /root/kimi-browser-desktop
node server.js
# Open http://localhost:3080 in a browser
```

## Test Commands
```bash
# Start server
cd /root/kimi-browser-desktop && node server.js &

# Test APIs
curl -s http://localhost:3080/api/settings
curl -s http://localhost:3080/api/windows
curl -s "http://localhost:3080/api/fs?dir=/root"
curl -s http://localhost:3080/api/notes
curl -s -X POST http://localhost:3080/api/settings -H 'Content-Type: application/json' -d '{"theme":"dark"}'

# Test terminal execution
curl -s -X POST http://localhost:3080/api/terminal -H 'Content-Type: application/json' -d '{"command":"echo hello"}'
```

## Known Risks / Limitations
1. **Agent backends unavailable**: Hermes and OpenClaw are configured to connect to localhost:8400/8401. Frontend gracefully falls back to mock responses when agents are offline.
2. **No authentication**: The server has no auth; intended for local loopback use only.
3. **File system access**: Finder exposes the real filesystem. Path traversal is possible but contained to server scope.
4. **Terminal execution**: Runs real shell commands. Use with caution.
5. **No mobile responsiveness**: Designed for desktop browsers only.
6. **Memory**: All state is in-memory on frontend; large data could impact performance.

## Next Steps
- [ ] Add window snapping
- [ ] Add drag-and-drop between apps
- [ ] Add more robust error handling
- [ ] Add keyboard shortcuts system
- [ ] Add theme switching (light/dark)
- [ ] Add multi-monitor support
- [ ] Browser tab title reflects focused app

## Blockers
- None currently.
