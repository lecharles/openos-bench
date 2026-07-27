ROLE

You are KiMi 3. This is a final polish pass for the kimi-browser-desktop project.

The project is a macOS-inspired browser desktop at /root/kimi-browser-desktop. A Node.js Express server runs on :3080. All 21 apps render and are verified working. The architecture is solid. Do NOT redesign. Do NOT add new apps. Do NOT rewrite working systems unless required for polish.

MISSION

Make this desktop feel as close as possible to a polished modern macOS experience. Favor polish over additional functionality. If there is a tradeoff, always choose the option that makes the experience feel more like macOS.

PRIORITIES (in order)

1. FINDER — Bring as close to macOS Finder as possible.
   Implement polished: Icon View, List View, Column View, Gallery View.
   Include: smooth transitions, hierarchical navigation, resizable columns, sidebar with Favorites/Recent/iCloud/mounted drives, breadcrumbs/path bar, metadata panel, status bar, keyboard shortcuts (Cmd+1/2/3/4 for views, Cmd+Up, Cmd+Down, Enter to rename), richer folder/file icons (SF Symbols-style or similar SVG), polished spacing, high-quality interactions.
   Gallery View: large preview, thumbnail strip at bottom, metadata panel on right, smooth arrow-key/click navigation between files.
   Column View: classic macOS Column View with intelligent hierarchical browsing — each column shows contents of the selected item in the previous column, resizable columns, scrollable, highlights selected item, shows preview/metadata in rightmost column.
   Sidebar: collapsible sections, Favorites (AirDrop, Recents, Applications, Desktop, Downloads, Documents), iCloud section (visual only), Locations with the current filesystem root, Tags section with colored dots. Click items to navigate.
   Path bar: at bottom showing current path as clickable breadcrumbs, or toggle with View > Show Path Bar.
   Status bar: at bottom showing "N items, XX GB available" or similar.

2. DESKTOP — Replace wallpaper with a beautiful Unsplash landscape.
   Use a URL from Unsplash that is high-resolution, royalty-free, and fits a macOS aesthetic (Lake Tahoe, Big Sur mountains, alpine lake, Yosemite, or similar). The desktop should immediately feel elegant, calm, premium, and believable.
   Set as default wallpaper. Do NOT use a placeholder gradient or solid color.

3. WINDOW SYSTEM — macOS-quality windows.
   Improve: realistic shadows (multi-layer box-shadow imitating macOS depth), translucency (backdrop-filter blur on window chrome/titlebar/sidebar), rounded corners (consistent 8-10px), smooth drag behavior (no jitter), resize from all edges/corners with visible cursor changes, correct z-order (click to bring to front), smooth focus transitions (subtle shadow change on focus/blur), opening animation (scale+fade in, ~200ms), closing animation (scale+fade out, ~150ms), minimize animation (scale down into dock position, ~300ms).

4. DOCK — macOS-quality dock.
   Implement: magnification on hover (items grow smoothly as cursor approaches, using JavaScript + CSS transforms), bounce animation (icon bounces when app launches/needs attention), running indicators (small dot below open apps, macOS-style), hover tooltip with app name, smooth launch animation, minimize animation (window animates into dock icon). Glass/blur dock background.

5. OVERALL DESIGN — Apple HIG-level polish.
   Refine: spacing consistency (use Apple's spacing scale), typography (SF Pro Display style — use -apple-system, system-ui), animation timing (Apple's default ~250ms with ease-in-out or spring curves), color palette (system colors: blue, gray, red, orange, yellow, green, teal, purple), shadows (consistent elevation model), blur (backdrop-filter with saturate), interaction quality (hover states on all interactive elements, active/pressed states), visual hierarchy (clear distinction between chrome, content, and controls). Menu bar should look like macOS menu bar. Context menus should look like macOS context menus.

RULES

- Update STATUS.md continuously with progress, decisions, and test results.
- Commit meaningful milestones locally. Do not push.
- Keep the project runnable at all times — test after each major change.
- Run the E2E test suite after completing: cd /tmp/kbd-e2e && node smoke.js && node persist.js
- Fix any regressions you introduce.
- Do not modify Hermes, OpenClaw, OpenCode, tmux, system services.
- Do not expose secrets.

ACCEPTANCE

When finished:
- All 21 apps must still render
- All 15 interaction probes must still pass  
- Windows must persist across reload
- The desktop must visually look and feel like macOS
- Print a concise summary of every improvement made
