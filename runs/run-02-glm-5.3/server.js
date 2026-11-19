'use strict';
/* OpenOS server — Express backend.
 * - Static frontend from ./public
 * - Allow-listed filesystem API (probes outside the allow-list get 403)
 * - Server-side JSON persistence: settings, layout, notes, events, contacts, trash meta
 * - Trash: move / restore / empty with metadata
 * - socket.io attached for live settings sync between tabs
 */
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const express = require('express');
const http = require('http');
const { generateAll } = require('./scripts/gen-assets');

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;
const DATA = path.join(ROOT, 'os-data');
const USER = path.join(DATA, 'user');            // Home folder (sandbox)
const TRASHDIR = path.join(DATA, 'trash');       // trashed file storage
const STORE = path.join(DATA, 'store');          // JSON stores
const PUBLIC_DIR = path.join(ROOT, 'public');
const SHARE = '/tmp/openos-share';                   // extra browsable location (scrubbed for public hygiene)

const VERSION = '1.0.0';
const APPS_LIST = ['finder', 'notes', 'calendar', 'weather', 'calculator', 'preview', 'trash', 'settings', 'clock', 'contacts', 'music', 'mail', 'terminal', 'photos', 'textedit'];

/* ------------------------------------------------------------------ */
/* Seed ----------------------------------------------------------------*/
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff']);
const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'json', 'js', 'mjs', 'css', 'html', 'htm', 'csv', 'xml', 'log', 'yml', 'yaml', 'ini', 'sh', 'py', 'ts', 'jsx', 'tsx', 'conf', 'env', 'gitignore', 'svg']);

function todayISO() { return new Date().toISOString().slice(0, 10); }
function offsetDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function kindOf(name, isDir) {
  if (isDir) return 'folder';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (TEXT_EXT.has(ext)) return 'text';
  return 'other';
}

async function ensureSeed() {
  for (const d of [USER, TRASHDIR, STORE, path.join(USER, 'Desktop'), path.join(USER, 'Documents'), path.join(USER, 'Downloads'), path.join(USER, 'Pictures')]) {
    fs.mkdirSync(d, { recursive: true });
  }
  if (!fs.existsSync(SHARE)) fs.mkdirSync(SHARE, { recursive: true });

  // Real image assets (generated deterministically)
  generateAll(path.join(USER, 'Pictures'));
  const sunset = path.join(USER, 'Pictures', 'sunset.png');
  const deskSunset = path.join(USER, 'Desktop', 'sunset.png');
  if (fs.existsSync(sunset) && !fs.existsSync(deskSunset)) fs.copyFileSync(sunset, deskSunset);

  const seedFile = (rel, content) => {
    const p = path.join(USER, rel);
    if (!fs.existsSync(p)) fs.writeFileSync(p, content);
  };
  seedFile('Desktop/Welcome to OpenOS.txt',
`Welcome to OpenOS!

This desktop runs entirely in your browser, backed by a small
Node/Express server. A few things to try:

  - Press Cmd+Space (or Ctrl+Space) for Spotlight
  - Hover the Dock to see magnification
  - Double-click folders and files on the Desktop
  - Right-click the Desktop for more options
  - Open Terminal and type "help"
  - Change your wallpaper in System Settings

Everything you see here persists on the server across reloads.
Enjoy your stay.

-- The OpenOS Team`);
  seedFile('Desktop/Shortcuts.md',
`# Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Space | Spotlight search |
| Cmd+W | Close front window |
| Cmd+M | Minimize front window |
| Cmd+Q | Quit front app |
| Cmd+Tab | Switch apps |
| Cmd+, | Open Settings |
| Esc | Dismiss overlays |

# Notes
- The Terminal is sandboxed: it can only touch allow-listed folders.
- Finder browses the real filesystem through the backend API.`);
  seedFile('Documents/Project Notes.md',
`# OpenOS Project Notes

## Status
- Window manager: done (drag, 8-way resize, traffic lights, focus z-ordering)
- Dock: magnification, running indicators, launch bounce, genie minimize
- Spotlight: fuzzy search across apps + files
- 14 apps shipped

## Ideas
- Multiple desktops / spaces
- Widgets in Notification Center
- Menu bar extras: Now Playing

_Feel free to edit this file in TextEdit._`);
  seedFile('Documents/poem.txt',
`the windows float
like leaves on water
each one a small machine
dreaming in the dock

— anonymous, circa 2026`);
  seedFile('Documents/budget.csv',
`Item,Planned,Actual
Coffee,120,184
Mechanical keyboard,0,220
Server hosting,25,25
Domain,12,12
Notion subscription,10,10`);
  seedFile('Documents/meeting-notes.txt',
`Standup — 9:30am

Attendees: everyone

- WM drag now uses pointer capture, no more lost drags at screen edge
- Dock magnification curve tuned (cubic falloff feels smoother)
- Trash restore verified end-to-end
- Next: polish context menus, ship nightly build

Action items:
[ ] Dana: finalize icon set
[x] Sam: settings persistence (server-side JSON)
[ ] You: try right-clicking things`);
  seedFile('Downloads/openos-whitepaper.md',
`# OpenOS: A Desktop Environment for the Browser

## Abstract
OpenOS demonstrates that a macOS-class desktop experience — window
management, a dock with magnification, spotlight search, and a suite
of real apps — can run as a plain web page with vanilla JavaScript.

## Architecture
- Frontend: vanilla JS ES modules, CSS variables for theming
- Backend: Node + Express, allow-listed filesystem API
- Persistence: server-side JSON documents
- Realtime: socket.io for cross-tab settings sync

## Conclusion
It boots in about two seconds and feels like home.`);
  seedFile('Downloads/invoice-template.txt',
`INVOICE #0001
Date: __________
Bill to: __________

Description          Hours   Rate   Total
------------------------------------------
Window polishing      2      99     198
Dock alignment        1      99      99
Spotlight re-aiming   1      99      99
------------------------------------------
TOTAL                               396

Thank you for your business!`);

  const store = (file, def) => {
    const p = path.join(STORE, file);
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(def, null, 2));
    return p;
  };
  store('settings.json', { theme: 'light', wallpaper: 'horizon', accent: 'blue', dockSize: 52, dockMagnify: 0.7 });
  store('layout.json', { windows: [], desktopIcons: {} });
  store('notes.json', [
    { id: 'n1', body: 'Welcome to Notes\n\nEverything you type here is saved to the server automatically. Create a new note with the + button, or search across all notes with the search field.\n\nTry deleting me. I will not mind.', updated: Date.now() - 86400000, created: Date.now() - 86400000 },
    { id: 'n2', body: 'Grocery list\n\n- Espresso beans\n- Sourdough\n- Olive oil\n- Raspberries\n- Parmesan', updated: Date.now() - 3600000, created: Date.now() - 7200000 },
  ]);
  store('events.json', [
    { id: 'e1', date: todayISO(), time: '09:30', title: 'Standup' },
    { id: 'e2', date: todayISO(), time: '14:00', title: 'Design Review' },
    { id: 'e3', date: offsetDate(1), time: '11:00', title: '1:1 with Dana' },
    { id: 'e4', date: offsetDate(2), time: '18:30', title: 'Gym' },
    { id: 'e5', date: offsetDate(3), time: '10:00', title: 'Ship OpenOS Nightly' },
    { id: 'e6', date: offsetDate(5), time: '19:00', title: 'Dinner at Buca di Beppo' },
  ]);
  store('contacts.json', [
    { id: 'c1', first: 'Ada', last: 'Lovelace', phone: '+1 (555) 010-1815', email: 'ada@analyticalengine.org', city: 'London', company: 'Analytical Engines Ltd.' },
    { id: 'c2', first: 'Grace', last: 'Hopper', phone: '+1 (555) 010-1906', email: 'grace@navy.mil', city: 'Arlington', company: 'US Navy' },
    { id: 'c3', first: 'Alan', last: 'Turing', phone: '+44 (20) 010-1912', email: 'alan@bletchley.uk', city: 'Manchester', company: 'Bletchley Park' },
    { id: 'c4', first: 'Katherine', last: 'Johnson', phone: '+1 (555) 010-1918', email: 'katherine@nasa.gov', city: 'Hampton', company: 'NASA' },
    { id: 'c5', first: 'Linus', last: 'Torvalds', phone: '+358 (40) 010-1969', email: 'linus@kernel.org', city: 'Helsinki', company: 'Linux Foundation' },
    { id: 'c6', first: 'Margaret', last: 'Hamilton', phone: '+1 (555) 010-1936', email: 'margaret@mit.edu', city: 'Cambridge', company: 'MIT' },
    { id: 'c7', first: 'Barbara', last: 'Liskov', phone: '+1 (555) 010-1939', email: 'barbara@csail.mit.edu', city: 'Boston', company: 'MIT CSAIL' },
    { id: 'c8', first: 'Radia', last: 'Perlman', phone: '+1 (555) 010-1951', email: 'radia@sunbeam.net', city: 'Boston', company: 'Retired' },
    { id: 'c9', first: 'Guido', last: 'van Rossum', phone: '+1 (555) 010-1956', email: 'guido@python.org', city: 'San Francisco', company: 'Python Software Foundation' },
    { id: 'c10', first: 'Dana', last: 'Nguyen', phone: '+1 (555) 010-1975', email: 'dana@dyssonance.ai', city: 'Cupertino', company: 'Dyssonance' },
  ]);
  store('trash.json', []);
}

/* ------------------------------------------------------------------ */
/* Allow-list ------------------------------------------------------------*/
let ALLOWED_REAL = [];
function refreshAllowlist() {
  ALLOWED_REAL = [USER, PUBLIC_DIR, SHARE].map((p) => fs.realpathSync(p));
}
function isAllowed(abs) {
  return ALLOWED_REAL.some((r) => abs === r || abs.startsWith(r + path.sep));
}
/* Resolve a request path to an absolute path inside the allow-list.
 * Handles ~ (home), relative-looking paths, and symlinks via realpath of
 * the deepest existing ancestor. Returns null if outside the allow-list. */
function safeResolve(p) {
  if (typeof p !== 'string') return null;
  let abs = p.replace(/^~(?=$|\/)/, USER);
  if (!path.isAbsolute(abs)) abs = path.join(USER, abs);
  abs = path.normalize(abs);
  // walk to deepest existing ancestor, realpath it, then rejoin the remainder
  let cur = abs;
  const tail = [];
  while (!fs.existsSync(cur)) {
    if (cur === path.parse(cur).root) break;
    tail.unshift(path.basename(cur));
    cur = path.dirname(cur);
  }
  try { cur = fs.realpathSync(cur); } catch { return null; }
  abs = tail.length ? path.join(cur, ...tail) : cur;
  abs = path.normalize(abs);
  if (!isAllowed(abs)) return null;
  return abs;
}
function forbidden(res) { res.status(403).json({ error: 'Forbidden: path is outside the allow-list' }); }

/* ------------------------------------------------------------------ */
/* JSON store helpers -----------------------------------------------------*/
async function readJSON(file, fallback) {
  try {
    const p = path.join(STORE, file);
    return JSON.parse(await fsp.readFile(p, 'utf8'));
  } catch { return fallback; }
}
async function writeJSON(file, obj) {
  const p = path.join(STORE, file);
  const tmp = p + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2));
  await fsp.rename(tmp, p);
}

/* ------------------------------------------------------------------ */
/* App ---------------------------------------------------------------------*/
ensureSeed();
refreshAllowlist();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16mb' }));

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[api]', err);
    res.status(500).json({ error: String(err && err.message || err) });
  });
};

app.get('/api/health', (req, res) => {
  res.json({
    ok: true, name: 'OpenOS', version: VERSION, node: process.version,
    apps: APPS_LIST.length, uptime: Math.round(process.uptime() * 1000),
    locations: [
      { id: 'home', name: 'Home', path: '~', icon: 'homeS' },
      { id: 'project', name: 'Macintosh HD', path: PUBLIC_DIR, icon: 'displayS' },
      { id: 'share', name: 'VPS Shared', path: SHARE, icon: 'folderS' },
    ],
  });
});

/* ---------------- settings / layout / stores ---------------- */
app.get('/api/settings', wrap(async (req, res) => {
  res.json(await readJSON('settings.json', {}));
}));
app.put('/api/settings', wrap(async (req, res) => {
  const cur = await readJSON('settings.json', {});
  const next = Object.assign({}, cur, req.body || {});
  await writeJSON('settings.json', next);
  if (io) io.emit('settings:updated', next);
  res.json(next);
}));
app.get('/api/layout', wrap(async (req, res) => {
  res.json(await readJSON('layout.json', { windows: [], desktopIcons: {} }));
}));
async function handleLayoutPut(req, res) {
  const body = req.body || {};
  const next = { windows: Array.isArray(body.windows) ? body.windows : [], desktopIcons: body.desktopIcons && typeof body.desktopIcons === 'object' ? body.desktopIcons : {} };
  await writeJSON('layout.json', next);
  res.json(next);
}
app.put('/api/layout', wrap(handleLayoutPut));
app.post('/api/layout', wrap(handleLayoutPut)); // sendBeacon can only POST
for (const name of ['notes', 'events', 'contacts']) {
  app.get(`/api/${name}`, wrap(async (req, res) => {
    res.json(await readJSON(name + '.json', []));
  }));
  app.put(`/api/${name}`, wrap(async (req, res) => {
    const data = Array.isArray(req.body) ? req.body : [];
    await writeJSON(name + '.json', data);
    res.json(data);
  }));
}

/* ---------------- filesystem API ---------------- */
app.get('/api/fs/list', wrap(async (req, res) => {
  const abs = safeResolve(String(req.query.path || '~'));
  if (!abs) return forbidden(res);
  let dirents;
  try { dirents = await fsp.readdir(abs, { withFileTypes: true }); }
  catch (err) { return res.status(err.code === 'ENOTDIR' ? 400 : 404).json({ error: err.code === 'ENOTDIR' ? 'Not a folder' : 'Not found' }); }
  const entries = [];
  for (const d of dirents) {
    if (d.name === '.DS_Store') continue;
    const full = path.join(abs, d.name);
    let size = 0, mtime = null;
    try {
      const st = await fsp.stat(full);
      size = st.size; mtime = st.mtimeMs;
    } catch {}
    entries.push({ name: d.name, isDir: d.isDirectory(), kind: kindOf(d.name, d.isDirectory()), size, mtime });
  }
  entries.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  res.json({ path: abs, parent: path.dirname(abs), entries, count: entries.length });
}));

app.get('/api/fs/read', wrap(async (req, res) => {
  const abs = safeResolve(String(req.query.path || ''));
  if (!abs) return forbidden(res);
  const mode = String(req.query.mode || 'text');
  let st;
  try { st = await fsp.stat(abs); } catch { return res.status(404).json({ error: 'Not found' }); }
  if (st.isDirectory()) return res.status(400).json({ error: 'Is a folder' });
  const ext = (abs.split('.').pop() || '').toLowerCase();
  if (mode === 'stat') {
    return res.json({ path: abs, name: path.basename(abs), size: st.size, mtime: st.mtimeMs, kind: kindOf(path.basename(abs), false) });
  }
  if (st.size > 8 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
  if (mode === 'base64' || (mode === 'auto' && IMAGE_EXT.has(ext))) {
    const buf = await fsp.readFile(abs);
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : 'application/octet-stream';
    return res.json({ base64: buf.toString('base64'), mime, size: st.size });
  }
  const text = await fsp.readFile(abs, 'utf8');
  res.json({ text, size: st.size, mtime: st.mtimeMs });
}));

app.post('/api/fs/write', wrap(async (req, res) => {
  const abs = safeResolve(String((req.body || {}).path || ''));
  if (!abs) return forbidden(res);
  const content = String((req.body || {}).content ?? '');
  const encoding = (req.body || {}).encoding === 'base64' ? 'base64' : 'utf8';
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, Buffer.from(content, encoding));
  const st = await fsp.stat(abs);
  res.json({ ok: true, path: abs, size: st.size });
}));

app.post('/api/fs/mkdir', wrap(async (req, res) => {
  const abs = safeResolve(String((req.body || {}).path || ''));
  if (!abs) return forbidden(res);
  try { await fsp.mkdir(abs, { recursive: true }); } catch (err) { return res.status(400).json({ error: err.message }); }
  res.json({ ok: true, path: abs });
}));

app.post('/api/fs/rename', wrap(async (req, res) => {
  const { from, to } = req.body || {};
  const aFrom = safeResolve(String(from || ''));
  const aTo = safeResolve(String(to || ''));
  if (!aFrom || !aTo) return forbidden(res);
  if (fs.existsSync(aTo)) return res.status(409).json({ error: 'Target already exists' });
  try { await fsp.rename(aFrom, aTo); } catch (err) { return res.status(400).json({ error: err.message }); }
  res.json({ ok: true, from: aFrom, to: aTo });
}));

app.post('/api/fs/delete', wrap(async (req, res) => {
  const abs = safeResolve(String((req.body || {}).path || ''));
  if (!abs) return forbidden(res);
  if (abs === USER || abs === PUBLIC_DIR || abs === SHARE) return res.status(400).json({ error: 'Cannot delete root' });
  try { await fsp.rm(abs, { recursive: true, force: true }); } catch (err) { return res.status(400).json({ error: err.message }); }
  res.json({ ok: true });
}));

/* ---------------- trash (move / restore / empty) ---------------- */
async function trashMeta() { return readJSON('trash.json', []); }

app.post('/api/fs/trash', wrap(async (req, res) => {
  const abs = safeResolve(String((req.body || {}).path || ''));
  if (!abs) return forbidden(res);
  if (abs === USER || abs === PUBLIC_DIR || abs === SHARE) return res.status(400).json({ error: 'Cannot trash root' });
  let st;
  try { st = await fsp.stat(abs); } catch { return res.status(404).json({ error: 'Not found' }); }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const name = path.basename(abs);
  const stored = path.join(TRASHDIR, id + '__' + name.replace(/[^\w .-]/g, '_'));
  await fsp.rename(abs, stored);
  const meta = await trashMeta();
  meta.push({ id, name, origPath: abs, deletedAt: Date.now(), isDir: st.isDirectory(), size: st.size });
  await writeJSON('trash.json', meta);
  if (io) io.emit('trash:changed', { count: meta.length });
  res.json({ ok: true, id, count: meta.length });
}));

app.get('/api/trash', wrap(async (req, res) => {
  res.json({ items: await trashMeta() });
}));

app.post('/api/fs/restore', wrap(async (req, res) => {
  const id = String((req.body || {}).id || '');
  if (!/^[a-z0-9]+$/i.test(id)) return res.status(400).json({ error: 'Bad id' });
  const meta = await trashMeta();
  const item = meta.find((m) => m.id === id);
  if (!item) return res.status(404).json({ error: 'Trash item not found' });
  const stored = path.join(TRASHDIR, id + '__' + item.name.replace(/[^\w .-]/g, '_'));
  let target = item.origPath;
  if (fs.existsSync(target)) {
    const dirn = path.dirname(item.origPath);
    const base = path.basename(item.origPath);
    target = path.join(dirn, base.replace(/(\.[^./\\]+)?$/, (m) => ' (restored)' + m));
  }
  await fsp.mkdir(path.dirname(target), { recursive: true });
  try { await fsp.rename(stored, target); } catch (err) { return res.status(400).json({ error: err.message }); }
  const next = meta.filter((m) => m.id !== id);
  await writeJSON('trash.json', next);
  if (io) io.emit('trash:changed', { count: next.length });
  res.json({ ok: true, restoredTo: target });
}));

app.post('/api/fs/empty-trash', wrap(async (req, res) => {
  await fsp.rm(TRASHDIR, { recursive: true, force: true });
  await fsp.mkdir(TRASHDIR, { recursive: true });
  await writeJSON('trash.json', []);
  if (io) io.emit('trash:changed', { count: 0 });
  res.json({ ok: true });
}));

/* ---------------- static ---------------- */
app.use(express.static(PUBLIC_DIR, { index: 'index.html', maxAge: 0 }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'No such API endpoint' });
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const server = http.createServer(app);
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(server, { serveClient: true });
  io.on('connection', (sock) => {
    sock.emit('hello', { name: 'OpenOS', version: VERSION });
    sock.on('fs:changed', () => sock.broadcast.emit('fs:changed'));
  });
} catch (err) {
  console.warn('socket.io not available:', err.message);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenOS v${VERSION} — serving on http://0.0.0.0:${PORT}`);
  console.log('FS allow-list roots:');
  for (const r of ALLOWED_REAL) console.log('  ✓', r);
  console.log('Home folder:', USER);
});
