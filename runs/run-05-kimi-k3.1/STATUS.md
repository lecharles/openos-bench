# OpenOS — Status

**Run:** `npm start`  
**URL:** `http://localhost:3000` (override with `PORT`)  
**Stack:** Node/Express, dependency-free vanilla HTML/CSS/JavaScript; no build step and no third-party browser requests.

## Verified working

### Desktop shell and window manager
- Translucent menu bar with live clock, battery/Wi-Fi surfaces, Control Center, Notification Center, and working Apple/File/Edit/View/Go/Window/Help dropdowns.
- Six desktop wallpapers, three desktop icons, selection, double-click open, and right-click context menus.
- Windows support pointer drag, focus z-ordering, double-click titlebar zoom, open/close animations, and animated genie-style minimize/restore.
- All **8 resize directions** verified with real pointer input: N, S, E, W, NE, NW, SE, SW.
- Traffic lights close, minimize, and maximize/restore. Inactive windows receive subdued chrome and shadows.
- Dock has proximity magnification, running indicators, launch bounce, tooltips, and minimized-window restoration.
- Spotlight opens with **Command-Space** (Control-Space also works), fuzzy-searches apps and server files, supports arrow keys, and launches with Enter.
- Launchpad provides a second searchable app launcher.

### Finder and filesystem
- Real server-backed filesystem rooted at `workspace/` and presented as Macintosh HD.
- Folder navigation, back/forward history, breadcrumbs, favorites sidebar, icon/list views, file search, selection, keyboard open, and Get Info.
- New Folder, context-menu Rename, Move to Trash, Trash selection, Put Back, and Empty Trash all work through the UI.
- Double-click folders to browse; images open in Preview; text documents open in TextEdit.
- Seeded Documents, Desktop, Downloads, Pictures, Music, sample text files, and four local SVG landscape images.

### Applications — 14 required apps plus Finder
1. **Notes:** create, delete, search, edit, derived titles, automatic server persistence.
2. **Calendar:** month view, previous/next month, Today, add events, inspect events, double-click delete; events persist.
3. **Weather:** complete static San Francisco current/hourly/6-day forecast and detail cards.
4. **Calculator:** working arithmetic, clear, sign, percent, decimal, operator, and keyboard input.
5. **Preview:** renders real backend images with thumbnails, zoom, rotate, and download.
6. **Trash:** item inspection, selected-item restore, permanent deletion, and empty-trash confirmation.
7. **Settings:** Light/Dark/Auto, seven accent colors, six wallpapers, reduce motion, notification preferences, and About This Mac; settings persist.
8. **Clock:** four live world clocks with analog/digital displays and a working stopwatch.
9. **Contacts:** search, create, edit, contact cards, and compose-mail quick action.
10. **Music:** six demo tracks, track selection, previous/next, play/pause, progress, volume, and locally synthesized Web Audio playback.
11. **Mail:** local mock inbox/archive, search, read state, message rendering, compose, and a locally persisted Sent flow.
12. **Terminal:** sandboxed virtual shell with `help`, `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `rm` (to Trash), `open`, `echo`, `date`, `history`, `whoami`, `uname`, `clear`, and `about`. No host shell execution.
13. **Photos:** real image gallery, selection, favorites, and Preview handoff.
14. **TextEdit:** new/open/save UTF-8 documents, editable filename, basic rich formatting, font sizing, word count, dirty state, and Command-Save.

### Persistence
- Server-side JSON at `data/state.json`, written atomically.
- Window open/closed state, position, size, minimized/maximized state, settings, notes, events, contacts, and app preferences survive reload.
- Verified across both a **full browser reload** and a complete **Node process restart**.

### Security
- Filesystem access is restricted to the workspace allow-list: Desktop, Documents, Downloads, Pictures, Music, and API-managed Trash.
- Absolute host paths, traversal, encoded traversal, hidden paths, and symlink escapes are rejected.
- Existing-file writes through symlinks are checked as well as reads and directory traversal.
- `GET /api/fs/list?path=/etc/shadow` returns **HTTP 403**.
- Seven security probes pass in the repeatable API suite.

## Final automated verification

All suites passed against the restarted server with no uncaught browser exceptions:

```bash
node tests/api-smoke.js
node tests/browser-smoke.js
node tests/app-actions.js
```

Browser suites use Chromium DevTools on `127.0.0.1:9223`. They verify:
- 15/15 app windows render (Finder + 14 apps).
- Spotlight fuzzy search and Enter launch.
- Calculator arithmetic.
- Drag and every resize direction.
- Minimize/restore and maximize/zoom.
- Theme, wallpaper, notes, open windows, and layout across reload.
- Calendar event creation, Terminal execution, TextEdit filesystem save, Mail compose/send, Music playback controls, Stopwatch, and Finder rename/trash/restore.

## Intentional limits
- Weather is static demonstration data; Mail is local/mock and does not use SMTP.
- Music plays built-in synthesized demo tracks, not remote streams.
- The Terminal deliberately exposes only safe virtual-filesystem commands.
- Filesystem access is a real Linux filesystem sandbox under `workspace/`, not unrestricted host filesystem access.
- Applications use one restorable window per app.

The final workspace is clean: welcome content restored, Finder open at Macintosh HD, other apps closed, light Aurora wallpaper selected, and Trash empty.
