'use strict';
// Finder filesystem API.
//
// The service runs on a VPS as an unprivileged user. Instead of exposing the
// real root, Finder browses a *virtual* filesystem:
//
//   /            ->  data/home     (seeded, writable; "Macintosh HD")
//   /home        ->  data/home
//   /tmp         ->  data/share    (scratch space)
//
// Anything else -- including /etc, /etc/shadow, /root, traversal and symlink
// escapes -- is rejected with 403 before a single fs call is made.
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OS_HOME = path.join(DATA_DIR, 'home');
const SHARE_DIR = path.join(DATA_DIR, 'share');
const TRASH_DIR = path.join(DATA_DIR, 'trash');
const TRASH_MANIFEST = path.join(DATA_DIR, 'trash.json');

const ROOTS = [
  { prefix: '/', real: OS_HOME },
  { prefix: '/home', real: OS_HOME },
  { prefix: '/tmp', real: SHARE_DIR },
];

// Names that are never addressable, even inside an allowed root.
const DENIED_BASENAMES = new Set([
  'shadow', 'shadow-', 'gshadow', 'passwd', 'passwd-', 'group', 'group-',
  'sudoers', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', '.htpasswd',
  '.netrc', '.npmrc', '.pypirc', '.env', '.env.local', 'private_key',
]);

function decode(p) {
  if (typeof p !== 'string') return null;
  if (p.includes('\0')) return null;
  try { return decodeURIComponent(p); } catch { return null; }
}

// Map a virtual path to a real path. Returns null when outside the allow-list.
function resolveVirtual(vpath) {
  const p = decode(vpath);
  if (p === null) return null;
  if (!p.startsWith('/')) return null;
  const norm = path.posix.normalize(p);
  for (const root of ROOTS) {
    if (norm === root.prefix) return root.real;
    if (norm.startsWith(root.prefix + '/')) {
      const rest = norm.slice(root.prefix.length);
      const real = path.resolve(root.real, '.' + rest);
      if (real === root.real || real.startsWith(root.real + path.sep)) return real;
      return null;
    }
  }
  return null;
}

function basenameOf(real) {
  return path.basename(real);
}

async function assertSafeVirtual(vpath) {
  const real = resolveVirtual(vpath);
  if (!real) return null;
  const base = basenameOf(real);
  if (DENIED_BASENAMES.has(base)) return null;
  if (base === '.ssh' || base === '.gnupg' || base === '.aws') return null;

  // Walk every existing component; a symlink may not point outside the roots.
  const parts = real.split(path.sep).filter(Boolean);
  let cur = path.sep;
  for (const part of parts) {
    cur = path.join(cur, part);
    try {
      const st = await fs.lstat(cur);
      if (st.isSymbolicLink()) {
        const target = await fs.realpath(cur);
        if (!isUnderRoot(target)) return null;
      }
    } catch (e) {
      if (e.code !== 'ENOENT') return null;
    }
  }
  // Canonicalise the deepest existing ancestor and re-check.
  let probe = real;
  for (;;) {
    try {
      const target = await fs.realpath(probe);
      if (!isUnderRoot(target)) return null;
      break;
    } catch (e) {
      if (e.code !== 'ENOENT') return null;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return real;
}

function isUnderRoot(real) {
  for (const root of ROOTS) {
    if (real === root.real || real.startsWith(root.real + path.sep)) return true;
  }
  return false;
}

async function ensureDirs() {
  await fs.mkdir(OS_HOME, { recursive: true });
  await fs.mkdir(SHARE_DIR, { recursive: true });
  await fs.mkdir(TRASH_DIR, { recursive: true });
}

async function readManifest() {
  try { return JSON.parse(await fs.readFile(TRASH_MANIFEST, 'utf8')); }
  catch { return []; }
}

async function writeManifest(list) {
  await fs.mkdir(TRASH_DIR, { recursive: true });
  await fs.writeFile(TRASH_MANIFEST, JSON.stringify(list, null, 2), 'utf8');
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};

function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

function kindOf(name, isDir) {
  if (isDir) return 'Folder';
  const ext = path.extname(name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.heic', '.bmp', '.tiff'].includes(ext)) return 'Image';
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return 'Audio';
  if (['.mp4', '.mov', '.m4v'].includes(ext)) return 'Movie';
  if (['.txt', '.md', '.rtf', '.log'].includes(ext)) return 'Plain Text';
  if (ext === '.pdf') return 'PDF Document';
  if (['.js', '.css', '.html', '.json', '.py', '.sh'].includes(ext)) return 'Source Code';
  if (['.csv', '.numbers'].includes(ext)) return 'Spreadsheet';
  return 'Document';
}

function statEntry(name, st, isDir) {
  return {
    name,
    type: isDir ? 'directory' : 'file',
    size: isDir ? 0 : st.size,
    mtime: st.mtime.toISOString(),
    kind: kindOf(name, isDir),
  };
}

function fsRoutes(router) {
  router.get('/api/fs/list', async (req, res) => {
    const vpath = req.query.path || req.query.dir || '/';
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      const entries = await fs.readdir(real, { withFileTypes: true });
      const mapped = [];
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const full = path.join(real, e.name);
        try {
          const st = await fs.stat(full);
          mapped.push(statEntry(e.name, st, e.isDirectory()));
        } catch { /* vanished */ }
      }
      mapped.sort((a, b) => {
        if ((a.type === 'directory') !== (b.type === 'directory')) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
      let free = null;
      try { const sfs = await fs.statfs(real); free = sfs.bavail * sfs.bsize; } catch {}
      res.json({ path: path.posix.normalize(decode(vpath) || '/'), entries: mapped, free });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/api/fs/read', async (req, res) => {
    const vpath = decode(req.query.file || req.query.path || '');
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      const st = await fs.stat(real);
      if (st.isDirectory()) return res.status(400).json({ error: 'Is a directory' });
      if (st.size > 4 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
      const content = await fs.readFile(real, 'utf8');
      res.json({ path: vpath, content, size: st.size });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/api/fs/raw', async (req, res) => {
    const vpath = decode(req.query.file || req.query.path || '');
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      const st = await fs.stat(real);
      if (!st.isFile()) return res.status(400).json({ error: 'Not a file' });
      if (st.size > 25 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
      res.setHeader('Content-Type', mimeFor(real));
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Length', st.size);
      const stream = require('fs').createReadStream(real);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/api/fs/write', async (req, res) => {
    const vpath = decode(req.body && req.body.path || '');
    const content = req.body && typeof req.body.content === 'string' ? req.body.content : '';
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      const st = await fs.stat(real).catch(() => null);
      if (st && st.isDirectory()) return res.status(400).json({ error: 'Is a directory' });
      await fs.mkdir(path.dirname(real), { recursive: true });
      await fs.writeFile(real, content, 'utf8');
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/api/fs/mkdir', async (req, res) => {
    const vpath = decode(req.body && req.body.path || '');
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      await fs.mkdir(real, { recursive: false });
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/api/fs/rename', async (req, res) => {
    const vpath = decode(req.body && req.body.path || '');
    const newName = req.body && String(req.body.name || '').trim();
    if (!newName || /[/\\]/.test(newName) || newName === '.' || newName === '..') {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    const targetReal = path.join(path.dirname(real), newName);
    if (!isUnderRoot(targetReal)) return res.status(403).json({ error: 'Access denied' });
    const targetV = path.posix.join(path.posix.dirname(decode(vpath) || '/'), newName);
    try {
      await fs.rename(real, targetReal);
      res.json({ ok: true, path: targetV });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/api/fs/trash', async (req, res) => {
    const vpath = decode(req.body && req.body.path || '');
    const real = await assertSafeVirtual(vpath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      const st = await fs.lstat(real);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const stored = id + '__' + path.basename(real);
      await fs.mkdir(TRASH_DIR, { recursive: true });
      await fs.rename(real, path.join(TRASH_DIR, stored));
      const manifest = await readManifest();
      manifest.unshift({
        id,
        name: path.basename(real),
        originalPath: path.posix.normalize(decode(vpath) || '/'),
        storedName: stored,
        deletedAt: new Date().toISOString(),
        isDir: st.isDirectory(),
      });
      await writeManifest(manifest);
      res.json({ ok: true, id });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/api/fs/trash', async (req, res) => {
    res.json(await readManifest());
  });

  router.post('/api/fs/trash/restore', async (req, res) => {
    const id = String((req.body && req.body.id) || '');
    if (!/^[a-z0-9]{6,20}$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    const manifest = await readManifest();
    const item = manifest.find(t => t.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const real = await assertSafeVirtual(item.originalPath);
    if (!real) return res.status(403).json({ error: 'Access denied' });
    try {
      await fs.mkdir(path.dirname(real), { recursive: true });
      await fs.rename(path.join(TRASH_DIR, item.storedName), real);
      await writeManifest(manifest.filter(t => t.id !== id));
      res.json({ ok: true, path: item.originalPath });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/api/fs/trash/empty', async (req, res) => {
    const manifest = await readManifest();
    await Promise.all(manifest.map(t =>
      fs.rm(path.join(TRASH_DIR, t.storedName), { recursive: true, force: true }).catch(() => {})
    ));
    await writeManifest([]);
    res.json({ ok: true });
  });

  router.get('/api/fs/search', async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const rootV = decode(req.query.path || '/');
    const realRoot = await assertSafeVirtual(rootV);
    if (!realRoot) return res.status(403).json({ error: 'Access denied' });
    if (!q) return res.json({ results: [] });
    const results = [];
    async function walk(dir, depth) {
      if (depth > 6 || results.length > 60) return;
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.name.toLowerCase().includes(q)) {
          results.push({ name: e.name, path: virtualFromReal(full), type: e.isDirectory() ? 'directory' : 'file' });
        }
        if (e.isDirectory()) await walk(full, depth + 1);
      }
    }
    await walk(realRoot, 0);
    res.json({ results: results.slice(0, 60) });
  });
}

function virtualFromReal(real) {
  for (const root of ROOTS) {
    if (real === root.real) return root.prefix;
    if (real.startsWith(root.real + path.sep)) {
      const rest = real.slice(root.real.length);
      return root.prefix + rest.split(path.sep).join('/');
    }
  }
  return '/';
}

module.exports = {
  fsRoutes, resolveVirtual, assertSafeVirtual, virtualFromReal,
  OS_HOME, SHARE_DIR, TRASH_DIR, DATA_DIR, ensureDirs, readManifest, writeManifest,
};
