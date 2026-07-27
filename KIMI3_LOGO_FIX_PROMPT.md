ROLE

You are KiMi 3. This is a single targeted change for the kimi-browser-desktop project at /root/kimi-browser-desktop.

MISSION

Replace the Apple logo in the top-left menu bar with a simple white circular glyph.

The current logo is rendered via CSS on `.apple-menu::before` at `/root/kimi-browser-desktop/public/css/style.css` around line 337. It uses an SVG mask of the Apple logo shape.

Replace it with:
- A solid white circle
- Same size (15x15px) and visual weight as the current logo
- Same alignment and spacing within the menu bar
- Slight antialiasing/soft edges so it feels native (use border-radius: 50%)

Do NOT change:
- Any other menu bar behavior
- The `.apple-menu` class behavior
- Any other CSS or JS

RULES
- Keep the project runnable.
- Verify the change renders correctly (the server is running on :3080).
- Update STATUS.md with this change.
- Do not expose secrets.
- Commit the change.

ACCEPTANCE
- The circle icon should be visible in the top-left of the menu bar
- All 21 apps must still render
- Run: cd /tmp/kbd-e2e && node smoke.js
