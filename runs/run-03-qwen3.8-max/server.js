'use strict';
/**
 * OpenOS backend — Express + socket.io
 *  - serves the static desktop from /public
 *  - sandboxed filesystem API rooted at /fsroot (allow-list enforced, /etc/shadow -> 403)
 *  - server-side JSON persistence at /data/state.json
 */
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const fsp = require('fs/promises');
const fs = require('fs');
const { Server } = require('socket.io');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const FS_ROOT = path.join(ROOT, 'fsroot');
const DATA_DIR = process.env.OPENOS_DATA_DIR || path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// ---- allow-list -----------------------------------------------------------
const ALLOWED_ROOTS = [FS_ROOT];
const MAX_TEXT = 2 * 1024 * 1024;       // 2 MB text read cap
const MAX_STATE = 4 * 1024 * 1024;      // 4 MB state cap

function underAllowed(abs) {
  return ALLOWED_ROOTS.some((r) => abs === r || abs.startsWith(r + path.sep));
}

/**
 * Resolve a client-supplied path (relative => under fsroot, absolute => must be
 * an allow-listed absolute path). Returns null when the path is outside the
 * allow-list (callers must answer 403).
 */
function resolveFSPath(p) {
  if (typeof p !== 'string') return null;
  let abs;
  if (p.startsWith('/')) {
    abs = path.resolve(p);
  } else {
    abs = path.resolve(FS_ROOT, p.replace(/\\/g, '/'));
  }
  if (!underAllowed(abs)) return null;
  return abs;
}

/** Same as resolveFSPath but also refuses symlink hops out of the allow-list. */
async function resolveReal(p) {
  const abs = resolveFSPath(p);
  if (abs === null) return null;
  try {
    const real = await fsp.realpath(abs);
    return underAllowed(real) ? abs : null;
  } catch {
    return abs; // doesn't exist yet — structural check already passed
  }
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.m3u': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg',
};
const TEXT_EXT = new Set(['.txt', '.md', '.json', '.csv', '.html', '.css', '.js', '.m3u', '.log', '.xml', '.yml', '.yaml', '.sh', '.ini', '.conf', '']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);

function toPosix(p) { return p.split(path.sep).join('/'); }
function relOf(abs) { return toPosix(path.relative(FS_ROOT, abs)); }

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16mb' }));

const server = http.createServer(app);
const io = new Server(server);

// ---- socket.io: presence + hello ------------------------------------------
let clients = 0;
io.on('connection', (socket) => {
  clients++;
  socket.emit('hello', { t: Date.now(), serverUptime: process.uptime() });
  io.emit('presence', { count: clients });
  socket.on('ping2', () => socket.emit('pong2', { t: Date.now() }));
  socket.on('disconnect', () => {
    clients--;
    io.emit('presence', { count: clients });
  });
});

// ---- state persistence ------------------------------------------------------
let memState = {};
(async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    memState = JSON.parse(await fsp.readFile(STATE_FILE, 'utf8'));
  } catch { memState = {}; }
})();

function saveStateNow() {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(memState));
  fs.renameSync(tmp, STATE_FILE);
}
let saveTimer = null;
function saveStateSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; try { saveStateNow(); } catch (e) { console.error('state save failed', e); } }, 120);
}

app.get('/api/state', (req, res) => res.json(memState));
app.put('/api/state', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'object required' });
  if (JSON.stringify(body).length > MAX_STATE) return res.status(413).json({ error: 'state too large' });
  memState = body;
  saveStateSoon();
  res.json({ ok: true });
});
// POST alias so navigator.sendBeacon works on unload
app.post('/api/state', (req, res) => {
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body) && JSON.stringify(body).length <= MAX_STATE) {
    memState = body;
    try { saveStateNow(); } catch {}
  }
  res.json({ ok: true });
});

// ---- system info -------------------------------------------------------------
app.get('/api/system', (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    node: process.version,
    cpus: os.cpus().length,
    cpuModel: (os.cpus()[0] || {}).model || 'unknown',
    memTotal: os.totalmem(),
    memFree: os.freemem(),
    uptime: os.uptime(),
    serverUptime: process.uptime(),
    version: 'OpenOS 1.0',
  });
});
app.get('/health', (req, res) => res.json({ ok: true }));

// ---- filesystem API ----------------------------------------------------------
const fsRouter = express.Router();

async function guard(req, res) {
  const raw = req.method === 'GET' ? req.query.path : (req.body && req.body.path);
  const abs = await resolveReal(raw === undefined ? '' : raw);
  if (abs === null) {
    res.status(403).json({ error: 'forbidden', detail: 'path is outside the allow-list' });
    return null;
  }
  return abs;
}

fsRouter.get('/list', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  try {
    const st = await fsp.stat(abs);
    if (!st.isDirectory()) return res.status(400).json({ error: 'not a directory' });
    const dirents = await fsp.readdir(abs, { withFileTypes: true });
    const entries = await Promise.all(dirents.map(async (d) => {
      const full = path.join(abs, d.name);
      const e = { name: d.name, path: relOf(full) || d.name, kind: d.isDirectory() ? 'dir' : 'file' };
      try {
        const s = await fsp.stat(full);
        e.size = s.size; e.mtime = s.mtimeMs; e.ctime = s.ctimeMs;
      } catch { e.size = 0; e.mtime = Date.now(); }
      if (e.kind === 'file') {
        const ext = path.extname(d.name).toLowerCase();
        e.ext = ext;
        e.mime = MIME[ext] || 'application/octet-stream';
        e.image = IMAGE_EXT.has(ext);
        e.text = TEXT_EXT.has(ext);
      }
      return e;
    }));
    res.json({ path: relOf(abs), name: path.basename(abs) || 'OpenOS', entries });
  } catch (err) {
    res.status(404).json({ error: 'not found', detail: err.code || String(err) });
  }
});

fsRouter.get('/read', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  try {
    const st = await fsp.stat(abs);
    if (st.isDirectory()) return res.status(400).json({ error: 'is a directory' });
    if (st.size > MAX_TEXT) return res.status(413).json({ error: 'file too large' });
    const ext = path.extname(abs).toLowerCase();
    if (!TEXT_EXT.has(ext)) return res.json({ path: relOf(abs), binary: true, size: st.size });
    const content = await fsp.readFile(abs, 'utf8');
    res.json({ path: relOf(abs), content, size: st.size, mtime: st.mtimeMs });
  } catch (err) {
    res.status(404).json({ error: 'not found', detail: err.code || String(err) });
  }
});

fsRouter.get('/raw', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  try {
    const st = await fsp.stat(abs);
    if (!st.isFile()) return res.status(400).json({ error: 'not a file' });
    const ext = path.extname(abs).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(abs);
  } catch (err) {
    res.status(404).json({ error: 'not found', detail: err.code || String(err) });
  }
});

async function guardTwo(req, res, a, b) {
  const ra = await resolveReal(a), rb = await resolveReal(b);
  if (ra === null || rb === null) { res.status(403).json({ error: 'forbidden' }); return null; }
  return [ra, rb];
}

fsRouter.post('/write', async (req, res) => {
  const { path: p, content } = req.body || {};
  const abs = await resolveReal(p);
  if (abs === null) return res.status(403).json({ error: 'forbidden' });
  if (abs === FS_ROOT) return res.status(400).json({ error: 'cannot write root' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'content string required' });
  try {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    const tmp = abs + '.write-tmp';
    await fsp.writeFile(tmp, content, 'utf8');
    await fsp.rename(tmp, abs);
    const st = await fsp.stat(abs);
    res.json({ ok: true, path: relOf(abs), size: st.size, mtime: st.mtimeMs });
  } catch (err) { res.status(500).json({ error: 'write failed', detail: String(err) }); }
});

fsRouter.post('/mkdir', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  try {
    await fsp.mkdir(abs, { recursive: true });
    res.json({ ok: true, path: relOf(abs) });
  } catch (err) { res.status(500).json({ error: 'mkdir failed', detail: String(err) }); }
});

fsRouter.post('/rename', async (req, res) => {
  const { path: p, name } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
    return res.status(400).json({ error: 'invalid name' });
  }
  const abs = await resolveReal(p);
  if (abs === null) return res.status(403).json({ error: 'forbidden' });
  if (abs === FS_ROOT) return res.status(400).json({ error: 'cannot rename root' });
  const dest = path.join(path.dirname(abs), name.trim());
  if (!underAllowed(dest)) return res.status(403).json({ error: 'forbidden' });
  try {
    if (dest !== abs) await fsp.access(dest).then(() => Promise.reject(new Error('exists')), () => {});
    await fsp.rename(abs, dest);
    res.json({ ok: true, path: relOf(dest), name: name.trim() });
  } catch (err) {
    if (String(err.message).includes('exists')) return res.status(409).json({ error: 'exists' });
    res.status(500).json({ error: 'rename failed', detail: String(err) });
  }
});

fsRouter.post('/move', async (req, res) => {
  const { from, to } = req.body || {};
  const pair = await guardTwo(req, res, from, to); if (!pair) return;
  const [src, dst] = pair;
  if (src === FS_ROOT) return res.status(400).json({ error: 'cannot move root' });
  try {
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.access(dst).then(() => Promise.reject(new Error('exists')), () => {});
    await fsp.rename(src, dst);
    res.json({ ok: true, path: relOf(dst) });
  } catch (err) {
    if (String(err.message).includes('exists')) return res.status(409).json({ error: 'exists' });
    res.status(500).json({ error: 'move failed', detail: String(err) });
  }
});

fsRouter.post('/delete', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  if (abs === FS_ROOT) return res.status(400).json({ error: 'cannot delete root' });
  try {
    const st = await fsp.stat(abs);
    if (st.isDirectory()) await fsp.rm(abs, { recursive: true, force: true });
    else await fsp.unlink(abs);
    res.json({ ok: true, path: relOf(abs) });
  } catch (err) { res.status(404).json({ error: 'not found', detail: err.code || String(err) }); }
});

fsRouter.post('/stat', async (req, res) => {
  const abs = await guard(req, res); if (abs === null) return;
  try {
    const st = await fsp.stat(abs);
    res.json({ path: relOf(abs), name: path.basename(abs) || 'OpenOS', isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs, ctime: st.ctimeMs });
  } catch (err) { res.status(404).json({ error: 'not found', detail: err.code || String(err) }); }
});

app.use('/api/fs', fsRouter);

// ---- static frontend ----------------------------------------------------------
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], setHeaders(res, p) { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('*', (req, res) => res.status(404).send('not found'));

// ---- boot -----------------------------------------------------------------------
async function ensureSeed() {
  await fsp.mkdir(FS_ROOT, { recursive: true });
  for (const d of ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', '.Trash']) {
    await fsp.mkdir(path.join(FS_ROOT, d), { recursive: true });
  }
}

function listen(port, tries = 0) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && tries < 20) {
      console.warn(`[openos] port ${port} busy, trying ${port + 1}...`);
      server.removeAllListeners('error');
      listen(port + 1, tries + 1);
    } else {
      console.error('[openos] fatal:', err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    const a = server.address();
    console.log(`[openos] desktop ready → http://localhost:${a.port}  (fsroot: ${FS_ROOT})`);
    fs.writeFileSync(path.join(DATA_DIR, 'port.txt'), String(a.port));
  });
}

ensureSeed().then(() => listen(parseInt(process.env.PORT || '3000', 10)));
