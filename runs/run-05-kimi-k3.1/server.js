const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(process.env.OPENOS_FS_ROOT || path.join(__dirname, 'workspace'));
const DATA = path.resolve(process.env.OPENOS_DATA_DIR || path.join(__dirname, 'data'));
const TRASH = path.join(ROOT, '.Trash');
const STATE_FILE = path.join(DATA, 'state.json');
const TRASH_FILE = path.join(DATA, 'trash.json');
const PUBLIC_ROOT = path.join(__dirname, 'public');
const ALLOWED = new Set(['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', '.Trash']);
const IMAGE_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(TRASH, { recursive: true });

function writeAtomic(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
}

function seedFile(file, content) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

for (const dir of ALLOWED) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'Documents', 'Projects'), { recursive: true });
seedFile(path.join(ROOT, 'Documents', 'Welcome.txt'), `Welcome to OpenOS\n\nThis is your personal workspace. Everything you create here lives on the server.\n\nTry these things:\n• Open Notes and write something.\n• Press ⌘ Space to find an app.\n• Drag windows by their title bar and resize from any edge.\n• Move a file to Trash, then restore it.\n• Make the desktop yours in Settings.\n\nHave a wonderful day.\n`);
seedFile(path.join(ROOT, 'Documents', 'Ideas.txt'), `Ideas worth keeping\n\n— Build something calm and useful.\n— Take the scenic route.\n— Make room for a little wonder.\n`);
seedFile(path.join(ROOT, 'Documents', 'Projects', 'OpenOS.md'), `# OpenOS\n\nA small, thoughtful desktop for the web.\n\n## Today\n- Explore the desktop\n- Organize Documents\n- Add an event in Calendar\n`);
seedFile(path.join(ROOT, 'Desktop', 'About OpenOS.txt'), 'OpenOS — a little desktop, right in your browser.\n');

const svgs = {
  'Golden Hour.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#6079b5"/><stop offset=".52" stop-color="#f4ac82"/><stop offset="1" stop-color="#f8d89b"/></linearGradient><linearGradient id="m" x2="0" y2="1"><stop stop-color="#765b78"/><stop offset="1" stop-color="#293b52"/></linearGradient></defs><rect width="1200" height="800" fill="url(#s)"/><circle cx="820" cy="305" r="102" fill="#ffe9b0" opacity=".9"/><path d="M0 510L180 320l130 150 170-250 260 300 150-160 310 280v160H0" fill="url(#m)"/><path d="M0 600l250-120 180 100 260-60 240 100 270-70v250H0" fill="#172d42" opacity=".8"/><path d="M0 685q250-90 480 5t720-15v125H0" fill="#0c2331"/></svg>`,
  'Pacific Coast.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#89c9e8"/><stop offset="1" stop-color="#e4f2e9"/></linearGradient><linearGradient id="b" x2="1" y2="1"><stop stop-color="#30a7bd"/><stop offset="1" stop-color="#075c86"/></linearGradient></defs><rect width="1200" height="800" fill="url(#a)"/><path d="M0 390q240-70 480 15t720-20v415H0" fill="url(#b)"/><g fill="none" stroke="#d7ffff" stroke-width="8" opacity=".55"><path d="M0 490q250-70 510 10t690-30"/><path d="M0 595q210-60 440 5t760-25"/><path d="M0 700q300-50 600 10t600-30"/></g><path d="M0 270l190-80 210 130 160 90-80 160L0 625" fill="#315f51"/><path d="M0 360l250-80 210 160-80 95L0 635" fill="#b5a873"/><circle cx="945" cy="155" r="75" fill="#fff4c9" opacity=".8"/></svg>`,
  'Desert Bloom.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#eaa38c"/><stop offset="1" stop-color="#ffe0ac"/></linearGradient></defs><rect width="1200" height="800" fill="url(#a)"/><circle cx="290" cy="225" r="110" fill="#ffe4b5"/><path d="M0 570q250-230 540 5t660-60v285H0" fill="#c26e60"/><path d="M0 665q330-180 640-20t560-50v205H0" fill="#7e4851"/><path d="M880 735V450q0-30 30-30t30 30v65q55-5 55-70v-45q0-25 25-25t25 25v55q0 120-110 125v155" fill="#294e48"/><g fill="#f8c78d"><circle cx="908" cy="417" r="18"/><circle cx="1020" cy="372" r="14"/></g></svg>`,
  'Alpine Air.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#b8d9e8"/><stop offset="1" stop-color="#f1ede3"/></linearGradient></defs><rect width="1200" height="800" fill="url(#a)"/><path d="M0 610L280 180l130 190L640 90l300 420 120-190 140 200v280H0" fill="#758e9d"/><path d="M100 410l180-230 130 190 230-280 160 225-110-50-70 40-80-95-70 100-70-30-80 80-50-20" fill="#f5f6f2"/><path d="M0 650q200-100 400 20t400-10 400-10v150H0" fill="#365b59"/><g fill="#183f3e"><path d="M100 730l45-180 45 180z"/><path d="M900 740l60-240 60 240z"/><path d="M1040 750l42-170 42 170z"/></g></svg>`
};
for (const [name, svg] of Object.entries(svgs)) seedFile(path.join(ROOT, 'Pictures', name), svg);
seedFile(path.join(ROOT, 'Music', 'About this folder.txt'), 'Your music library lives here. The Music app includes a built-in demo collection.\n');

function dateStamp(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const defaultState = {
  version: 1,
  settings: { theme: 'light', wallpaper: 'aurora', accent: 'blue', reduceMotion: false, dockSize: 58, showHidden: false },
  windows: {},
  notes: [{ id: 'welcome', title: 'Welcome to Notes', body: 'A quiet place for your thoughts.\n\nYour notes are saved automatically on the server.', updatedAt: new Date().toISOString() }],
  events: [
    { id: 'design-review', date: dateStamp(1), time: '10:00', title: 'Design review', color: 'blue' },
    { id: 'lunch', date: dateStamp(3), time: '12:30', title: 'Lunch with Maya', color: 'green' },
    { id: 'focus', date: dateStamp(7), time: '09:00', title: 'Focus time', color: 'purple' }
  ],
  contacts: [], preferences: {}
};
if (!fs.existsSync(STATE_FILE)) writeAtomic(STATE_FILE, defaultState);
if (!fs.existsSync(TRASH_FILE)) writeAtomic(TRASH_FILE, {});
let state;
try { state = { ...defaultState, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; }
catch { state = defaultState; writeAtomic(STATE_FILE, state); }
let trashMeta;
try { trashMeta = JSON.parse(fs.readFileSync(TRASH_FILE, 'utf8')); } catch { trashMeta = {}; }

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function readTrashMeta() { try { trashMeta = JSON.parse(fs.readFileSync(TRASH_FILE, 'utf8')); } catch {} return trashMeta; }
function saveTrashMeta() { writeAtomic(TRASH_FILE, trashMeta); }

async function safePath(input, options = {}) {
  if (typeof input !== 'string' || !input || input.includes('\0')) throw httpError(400, 'A valid virtual path is required');
  if (!input.startsWith('/')) throw httpError(403, 'Only OpenOS virtual paths are allowed');
  let decoded = input;
  try { decoded = decodeURIComponent(input); } catch {}
  const rawParts = decoded.split('/');
  if (rawParts.includes('..')) throw httpError(403, 'Path traversal is not allowed');
  const normalized = path.posix.normalize(decoded);
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length && !ALLOWED.has(parts[0])) throw httpError(403, 'This location is outside the OpenOS allow-list');
  if (!options.trash && parts[0] === '.Trash') throw httpError(403, 'Use the Trash API for this location');
  if (parts.some(part => part.startsWith('.') && part !== '.Trash')) throw httpError(403, 'Hidden files are not accessible');
  const absolute = path.resolve(ROOT, ...parts);
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) throw httpError(403, 'Path escapes workspace');
  const rootReal = await fsp.realpath(ROOT);
  let check = absolute;
  if (options.parent) check = path.dirname(absolute);
  try {
    const real = await fsp.realpath(check);
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) throw httpError(403, 'Symbolic-link escapes are not allowed');
    if (!options.parent && real !== absolute && !real.startsWith(rootReal + path.sep)) throw httpError(403, 'Symbolic-link escapes are not allowed');
    if (options.parent) {
      try {
        const existingReal = await fsp.realpath(absolute);
        if (existingReal !== rootReal && !existingReal.startsWith(rootReal + path.sep)) throw httpError(403, 'Symbolic-link escapes are not allowed');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  } catch (error) {
    if (error.status) throw error;
    if (error.code !== 'ENOENT') throw error;
    if (!options.allowMissing) throw httpError(404, 'File or folder not found');
    const parentReal = await fsp.realpath(path.dirname(check)).catch(() => null);
    if (!parentReal || (parentReal !== rootReal && !parentReal.startsWith(rootReal + path.sep))) throw httpError(403, 'Invalid destination');
  }
  return { absolute, virtual: '/' + parts.join('/'), parts };
}

function cleanName(name) {
  if (typeof name !== 'string' || !name.trim() || name === '.' || name === '..' || name.includes('/') || name.includes('\\') || name.includes('\0') || name.startsWith('.')) throw httpError(400, 'Enter a valid file name');
  if (name.length > 180) throw httpError(400, 'File name is too long');
  return name.trim();
}

async function itemInfo(absolute, virtual, extra = {}) {
  const stat = await fsp.stat(absolute);
  const name = path.basename(absolute) || 'OpenOS';
  const extension = stat.isDirectory() ? '' : path.extname(name).toLowerCase();
  return { name, path: virtual || '/', isDirectory: stat.isDirectory(), isFile: stat.isFile(), size: stat.size, modified: stat.mtime.toISOString(), extension, kind: stat.isDirectory() ? 'Folder' : (extension.slice(1).toUpperCase() + ' File' || 'Document'), ...extra };
}

function sanitizeState(value, depth = 0) {
  if (depth > 12) throw httpError(400, 'State is too deeply nested');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw httpError(400, 'Invalid number'); return value; }
  if (Array.isArray(value)) return value.slice(0, 5000).map(v => sanitizeState(v, depth + 1));
  if (typeof value === 'object') {
    const out = Object.create(null);
    for (const [key, val] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      out[key] = sanitizeState(val, depth + 1);
    }
    return out;
  }
  throw httpError(400, 'Unsupported state value');
}
function merge(a, b) {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value) && a[key] && typeof a[key] === 'object' && !Array.isArray(a[key]) ? merge(a[key], value) : value;
  }
  return out;
}
function persistState(next) { state = next; writeAtomic(STATE_FILE, state); }

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'OpenOS', version: '1.0.0' }));
app.get('/api/state', (req, res) => res.json(state));
app.put('/api/state', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw httpError(400, 'State must be an object');
  persistState(sanitizeState(req.body)); res.json({ ok: true, state });
});
app.patch('/api/state', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw httpError(400, 'State must be an object');
  persistState(merge(state, sanitizeState(req.body))); res.json({ ok: true, state });
});

app.get('/api/fs/list', asyncRoute(async (req, res) => {
  const target = await safePath(req.query.path || '/', { trash: req.query.path === '/.Trash' });
  const stat = await fsp.stat(target.absolute);
  if (!stat.isDirectory()) throw httpError(400, 'This is not a folder');
  const names = await fsp.readdir(target.absolute);
  const items = [];
  for (const name of names) {
    if (name.startsWith('.') && target.virtual !== '/.Trash') continue;
    try { items.push(await itemInfo(path.join(target.absolute, name), path.posix.join(target.virtual, name), target.virtual === '/.Trash' ? { originalPath: readTrashMeta()[name]?.originalPath, deletedAt: readTrashMeta()[name]?.deletedAt } : {})); } catch {}
  }
  items.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const parent = target.virtual === '/' ? null : path.posix.dirname(target.virtual);
  res.json({ path: target.virtual, parent, items });
}));

app.get('/api/fs/file', asyncRoute(async (req, res) => {
  const target = await safePath(req.query.path);
  const stat = await fsp.stat(target.absolute);
  if (!stat.isFile()) throw httpError(400, 'This is not a file');
  if (stat.size > 2 * 1024 * 1024) throw httpError(413, 'File is too large to preview as text');
  if (IMAGE_TYPES[path.extname(target.absolute).toLowerCase()]) throw httpError(400, 'Use the image preview for this file');
  const content = await fsp.readFile(target.absolute, 'utf8');
  res.json({ ...(await itemInfo(target.absolute, target.virtual)), content });
}));

app.get('/api/fs/raw', asyncRoute(async (req, res) => {
  const target = await safePath(req.query.path);
  const ext = path.extname(target.absolute).toLowerCase();
  if (!IMAGE_TYPES[ext]) throw httpError(400, 'Only image files can be previewed');
  const stat = await fsp.stat(target.absolute);
  if (!stat.isFile() || stat.size > 15 * 1024 * 1024) throw httpError(400, 'Image cannot be previewed');
  res.setHeader('Content-Type', IMAGE_TYPES[ext]);
  if (ext === '.svg') res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader('Cache-Control', 'private, max-age=60');
  fs.createReadStream(target.absolute).pipe(res);
}));

app.post('/api/fs/mkdir', asyncRoute(async (req, res) => {
  let parentPath = req.body.path || '/';
  let name = req.body.name;
  if (!name) { name = path.posix.basename(parentPath); parentPath = path.posix.dirname(parentPath); }
  name = cleanName(name);
  const parent = await safePath(parentPath);
  if (!(await fsp.stat(parent.absolute)).isDirectory()) throw httpError(400, 'Destination is not a folder');
  const target = await safePath(path.posix.join(parent.virtual, name), { parent: true, allowMissing: true });
  await fsp.mkdir(target.absolute);
  res.status(201).json({ ok: true, item: await itemInfo(target.absolute, target.virtual) });
}));

app.post('/api/fs/write', asyncRoute(async (req, res) => {
  if (typeof req.body.content !== 'string') throw httpError(400, 'Content must be text');
  if (Buffer.byteLength(req.body.content) > 2 * 1024 * 1024) throw httpError(413, 'Document is too large');
  const target = await safePath(req.body.path, { parent: true, allowMissing: true });
  if (!target.parts.length || target.parts[0] === '.Trash') throw httpError(403, 'Cannot write here');
  try { if ((await fsp.stat(target.absolute)).isDirectory()) throw httpError(400, 'Cannot overwrite a folder'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fsp.writeFile(target.absolute, req.body.content, 'utf8');
  res.json({ ok: true, item: await itemInfo(target.absolute, target.virtual) });
}));

app.post('/api/fs/rename', asyncRoute(async (req, res) => {
  const name = cleanName(req.body.newName);
  const source = await safePath(req.body.path);
  if (source.parts.length < 2 && source.parts[0] !== 'Desktop' && source.parts[0] !== 'Documents' && source.parts[0] !== 'Downloads' && source.parts[0] !== 'Pictures' && source.parts[0] !== 'Music') throw httpError(400, 'This location cannot be renamed');
  if (source.parts.length === 1) throw httpError(400, 'Favorite folders cannot be renamed');
  const destination = await safePath(path.posix.join(path.posix.dirname(source.virtual), name), { parent: true, allowMissing: true });
  await fsp.rename(source.absolute, destination.absolute);
  res.json({ ok: true, item: await itemInfo(destination.absolute, destination.virtual) });
}));

app.post('/api/fs/trash', asyncRoute(async (req, res) => {
  const source = await safePath(req.body.path);
  if (source.parts.length < 2) throw httpError(400, 'Favorite folders cannot be moved to Trash');
  const stat = await fsp.lstat(source.absolute);
  const baseName = path.basename(source.absolute), parsed = path.parse(baseName);
  let name = baseName, suffix = 0;
  let destination = path.join(TRASH, name);
  while (fs.existsSync(destination)) { suffix += 1; name = `${parsed.name}-${Date.now()}-${suffix}${parsed.ext}`; destination = path.join(TRASH, name); }
  await fsp.rename(source.absolute, destination);
  readTrashMeta(); trashMeta[name] = { originalPath: source.virtual, deletedAt: new Date().toISOString(), isDirectory: stat.isDirectory() }; saveTrashMeta();
  res.json({ ok: true, trashPath: `/.Trash/${name}` });
}));

app.get('/api/fs/trash', asyncRoute(async (req, res) => {
  readTrashMeta();
  const names = await fsp.readdir(TRASH);
  const items = [];
  for (const name of names) {
    try { items.push(await itemInfo(path.join(TRASH, name), `/.Trash/${name}`, { originalPath: trashMeta[name]?.originalPath || '/', deletedAt: trashMeta[name]?.deletedAt })); } catch {}
  }
  items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  res.json({ path: '/.Trash', items });
}));

app.post('/api/fs/restore', asyncRoute(async (req, res) => {
  const source = await safePath(req.body.path, { trash: true });
  if (source.parts[0] !== '.Trash' || source.parts.length !== 2) throw httpError(400, 'Choose an item in Trash');
  readTrashMeta();
  const original = trashMeta[path.basename(source.absolute)]?.originalPath || '/Documents/' + path.basename(source.absolute);
  let destination = await safePath(original, { parent: true, allowMissing: true });
  if (fs.existsSync(destination.absolute)) destination = await safePath(path.posix.join(path.posix.dirname(original), `${path.parse(original).name} restored${path.extname(original)}`), { parent: true, allowMissing: true });
  await fsp.mkdir(path.dirname(destination.absolute), { recursive: true });
  await fsp.rename(source.absolute, destination.absolute);
  delete trashMeta[path.basename(source.absolute)]; saveTrashMeta();
  res.json({ ok: true, restoredPath: destination.virtual });
}));

async function removeTrash(target) {
  if (target.parts[0] !== '.Trash' || target.parts.length !== 2) throw httpError(403, 'Permanent deletion is only available inside Trash');
  await fsp.rm(target.absolute, { recursive: true, force: false });
  readTrashMeta(); delete trashMeta[path.basename(target.absolute)]; saveTrashMeta();
}
app.delete('/api/fs/trash', asyncRoute(async (req, res) => {
  if (req.query.path) await removeTrash((await safePath(req.query.path, { trash: true })));
  else { for (const name of await fsp.readdir(TRASH)) await fsp.rm(path.join(TRASH, name), { recursive: true, force: true }); trashMeta = {}; saveTrashMeta(); }
  res.json({ ok: true });
}));
app.post('/api/fs/delete', asyncRoute(async (req, res) => {
  if (!req.body.permanent) throw httpError(400, 'Use move to Trash instead');
  await removeTrash(await safePath(req.body.path, { trash: true })); res.json({ ok: true });
}));

app.get('/api/fs/search', asyncRoute(async (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) return res.json({ items: [] });
  const results = [];
  async function walk(dir, virtual, depth) {
    if (depth > 8 || results.length >= 100) return;
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(dir, entry.name); const v = path.posix.join(virtual, entry.name);
      if (entry.name.toLowerCase().includes(query)) { results.push(await itemInfo(absolute, v)); if (results.length >= 100) break; }
      if (entry.isDirectory()) await walk(absolute, v, depth + 1);
    }
  }
  await walk(ROOT, '/', 0); res.json({ items: results });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.use(express.static(PUBLIC_ROOT, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_ROOT, 'index.html')));
app.use((error, req, res, next) => {
  console.error(`[OpenOS] ${req.method} ${req.path}: ${error.message}`);
  const status = error.status || (error.code === 'EEXIST' ? 409 : error.code === 'ENOENT' ? 404 : error.code === 'ENOSPC' ? 507 : 500);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
});

if (require.main === module) server.listen(PORT, '127.0.0.1', () => console.log(`OpenOS is ready at http://127.0.0.1:${PORT}`));
module.exports = { app, server, ROOT, DATA };
