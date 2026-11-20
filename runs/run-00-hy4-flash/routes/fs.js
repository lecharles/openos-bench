// File system routes — Finder backend with path traversal + symlink protection
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// macOS-style "/root" (Macintosh HD) is a virtual mount onto a real, writable
// demo folder. This keeps Finder feeling like a Mac while the service runs as
// an unprivileged VPS user that cannot read the literal /root.
const VIRTUAL_ROOT = '/root';
const REAL_HOME = path.join(os.homedir(), 'OpenOS');

function toReal(p) {
  let normalized;
  try { normalized = path.resolve(p); } catch { return p; }
  if (normalized === VIRTUAL_ROOT) return REAL_HOME;
  if (normalized.startsWith(VIRTUAL_ROOT + path.sep)) {
    return path.join(REAL_HOME, normalized.slice(VIRTUAL_ROOT.length));
  }
  return normalized;
}

// Allowed base directories for fs operations
const ALLOWED_ROOTS = ['/root', '/home', '/tmp'];

// Never expose these, even inside allowed roots
const DENIED_PATTERNS = [
  /\/\.ssh(\/|$)/,
  /\/\.gnupg(\/|$)/,
  /\/\.aws(\/|$)/,
  /\/\.env($|\.)/,
  /\/shadow$/,
  /\/id_(rsa|dsa|ecdsa|ed25519)$/,
  /\/(\.htpasswd|\.netrc|\.npmrc|\.pypirc)$/,
  /\/private_key(\.|$)/,
  /\/(passwd|group|gshadow|sudoers)$/,
];

function isLexicallySafe(targetPath) {
  let normalized;
  try { normalized = path.resolve(targetPath); } catch { return false; }
  if (DENIED_PATTERNS.some(p => p.test(normalized))) return false;
  return ALLOWED_ROOTS.some(root => {
    const r = path.resolve(root);
    return normalized === r || normalized.startsWith(r + path.sep);
  });
}

// Resolve symlinks in every existing component so a link inside an allowed
// root cannot escape to (for example) /etc/shadow.
async function isPathSafe(targetPath) {
  if (!isLexicallySafe(targetPath)) return false;
  const normalized = path.resolve(toReal(targetPath));
  if (!isLexicallySafe(normalized)) return false;
  const parts = normalized.split(path.sep).filter(Boolean);
  let cur = '';
  for (const part of parts) {
    cur += path.sep + part;
    try {
      const st = await fs.lstat(cur);
      if (st.isSymbolicLink()) {
        const real = await fs.realpath(cur);
        if (!isLexicallySafe(real)) return false;
      }
    } catch (e) {
      if (e.code !== 'ENOENT') return false;
    }
  }
  // Also validate the deepest existing ancestor's canonical path.
  let probe = normalized;
  while (true) {
    try {
      const real = await fs.realpath(probe);
      if (!isLexicallySafe(real)) return false;
      break;
    } catch (e) {
      if (e.code !== 'ENOENT') return false;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return true;
}

const TRASH_DIR = path.join(__dirname, '..', 'data', 'trash-bin');
const TRASH_MANIFEST = path.join(__dirname, '..', 'data', 'trash.json');

async function readManifest() {
  try { return JSON.parse(await fs.readFile(TRASH_MANIFEST, 'utf8')); }
  catch { return []; }
}

async function writeManifest(list) {
  await fs.mkdir(TRASH_DIR, { recursive: true });
  await fs.writeFile(TRASH_MANIFEST, JSON.stringify(list, null, 2));
}

function fsRoutes(router) {
  // List directory
  router.get('/api/fs', async (req, res) => {
    try {
      const dir = req.query.dir || VIRTUAL_ROOT;
      if (!await isPathSafe(dir)) return res.status(403).json({ error: 'Access denied' });
      const realDir = toReal(dir);

      const entries = await fs.readdir(realDir, { withFileTypes: true });
      const mapped = await Promise.all(entries.map(async (e) => {
        const fullPath = path.join(realDir, e.name);
        let size = 0, mtime = null;
        try {
          const st = await fs.stat(fullPath);
          if (e.isFile()) size = st.size;
          mtime = st.mtime.toISOString();
        } catch {}
        return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size, mtime };
      }));
      let free = null;
      try { const sfs = await fs.statfs(realDir); free = sfs.bavail * sfs.bsize; } catch {}
      res.json({ path: dir, entries: mapped, free });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Read file
  router.get('/api/fs/read', async (req, res) => {
    try {
      const fp = req.query.file;
      if (!fp) return res.status(400).json({ error: 'No file specified' });
      if (!await isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });
      const real = toReal(fp);

      const stat = await fs.stat(real);
      if (stat.size > 1024 * 1024) {
        return res.status(400).json({ error: 'File too large (>1MB)' });
      }
      const content = await fs.readFile(real, 'utf8');
      res.json({ path: fp, content });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Write file
  router.post('/api/fs/write', async (req, res) => {
    try {
      const { path: fp, content } = req.body;
      if (!fp) return res.status(400).json({ error: 'No path specified' });
      if (!await isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });

      await fs.writeFile(toReal(fp), content, 'utf8');
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Rename a file or folder (Finder inline rename)
  router.post('/api/fs/rename', async (req, res) => {
    try {
      const { path: fp, newName } = req.body;
      if (!fp || !newName) return res.status(400).json({ error: 'Missing path or newName' });
      if (newName.includes('/') || newName.includes('\\') || newName === '.' || newName === '..') {
        return res.status(400).json({ error: 'Invalid name' });
      }
      if (!await isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });
      const target = path.join(path.dirname(fp), newName);
      if (!await isPathSafe(target)) return res.status(403).json({ error: 'Access denied' });
      await fs.rename(toReal(fp), toReal(target));
      res.json({ ok: true, path: target });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Serve raw file bytes (image thumbnails/previews in Finder)
  router.get('/api/fs/raw', async (req, res) => {
    try {
      const fp = req.query.file;
      if (!fp) return res.status(400).json({ error: 'No file specified' });
      if (!await isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });
      const real = toReal(fp);
      const stat = await fs.stat(real);
      if (!stat.isFile()) return res.status(400).json({ error: 'Not a file' });
      if (stat.size > 20 * 1024 * 1024) return res.status(400).json({ error: 'File too large (>20MB)' });
      const ext = path.extname(fp).toLowerCase();
      const mime = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
        '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
      }[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(real);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Move file to trash
  router.post('/api/fs/trash', async (req, res) => {
    try {
      const { path: fp } = req.body;
      if (!fp) return res.status(400).json({ error: 'No path specified' });
      if (!await isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });

      await fs.mkdir(TRASH_DIR, { recursive: true });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const storedName = id + '__' + path.basename(fp);
      await fs.rename(toReal(fp), path.join(TRASH_DIR, storedName));

      const manifest = await readManifest();
      manifest.unshift({
        id,
        name: path.basename(fp),
        originalPath: path.resolve(fp),
        storedName,
        deletedAt: new Date().toISOString(),
      });
      await writeManifest(manifest);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // List trash
  router.get('/api/trash', async (req, res) => {
    res.json(await readManifest());
  });

  // Restore trashed item to its original location
  router.post('/api/trash/restore', async (req, res) => {
    try {
      const { id } = req.body;
      const manifest = await readManifest();
      const item = manifest.find(t => t.id === id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (!await isPathSafe(item.originalPath)) return res.status(403).json({ error: 'Access denied' });

      const restoreTo = toReal(item.originalPath);
      if (!await isPathSafe(restoreTo)) return res.status(403).json({ error: 'Access denied' });
      await fs.mkdir(path.dirname(restoreTo), { recursive: true });
      await fs.rename(path.join(TRASH_DIR, item.storedName), restoreTo);
      await writeManifest(manifest.filter(t => t.id !== id));
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Empty trash (permanently deletes trashed files)
  router.post('/api/trash/empty', async (req, res) => {
    try {
      const manifest = await readManifest();
      await Promise.all(manifest.map(t =>
        fs.rm(path.join(TRASH_DIR, t.storedName), { recursive: true, force: true }).catch(() => {})
      ));
      await writeManifest([]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = fsRoutes;
