// File system routes — Finder backend with path traversal protection
const fs = require('fs/promises');
const path = require('path');

// Allowed base directories for fs operations
const ALLOWED_ROOTS = ['/root', '/home', '/tmp'];

// Never expose these, even inside allowed roots
const DENIED_PATTERNS = [
  /\/\.ssh(\/|$)/,
  /\/\.gnupg(\/|$)/,
  /\/\.env($|\.)/,
  /\/shadow$/,
  /\/id_(rsa|dsa|ecdsa|ed25519)$/,
];

function isPathSafe(targetPath) {
  const normalized = path.resolve(targetPath);
  if (DENIED_PATTERNS.some(p => p.test(normalized))) return false;
  return ALLOWED_ROOTS.some(root => {
    const r = path.resolve(root);
    return normalized === r || normalized.startsWith(r + path.sep);
  });
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
      const dir = req.query.dir || '/root';
      if (!isPathSafe(dir)) return res.status(403).json({ error: 'Access denied' });

      const entries = await fs.readdir(dir, { withFileTypes: true });
      const mapped = await Promise.all(entries.map(async (e) => {
        const fullPath = path.join(dir, e.name);
        let size = 0, mtime = null;
        try {
          const st = await fs.stat(fullPath);
          if (e.isFile()) size = st.size;
          mtime = st.mtime.toISOString();
        } catch {}
        return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size, mtime };
      }));
      // Free disk space for the Finder status bar (graceful null if unsupported)
      let free = null;
      try { const sfs = await fs.statfs(dir); free = sfs.bavail * sfs.bsize; } catch {}
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
      if (!isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });

      // Limit file size to 1MB for safety
      const stat = await fs.stat(fp);
      if (stat.size > 1024 * 1024) {
        return res.status(400).json({ error: 'File too large (>1MB)' });
      }
      const content = await fs.readFile(fp, 'utf8');
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
      if (!isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });

      await fs.writeFile(fp, content, 'utf8');
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
      if (!isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });
      const target = path.join(path.dirname(fp), newName);
      if (!isPathSafe(target)) return res.status(403).json({ error: 'Access denied' });
      await fs.rename(fp, target);
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
      if (!isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });
      const stat = await fs.stat(fp);
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
      res.sendFile(path.resolve(fp));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Move file to trash
  router.post('/api/fs/trash', async (req, res) => {
    try {
      const { path: fp } = req.body;
      if (!fp) return res.status(400).json({ error: 'No path specified' });
      if (!isPathSafe(fp)) return res.status(403).json({ error: 'Access denied' });

      await fs.mkdir(TRASH_DIR, { recursive: true });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const storedName = id + '__' + path.basename(fp);
      await fs.rename(fp, path.join(TRASH_DIR, storedName));

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
      if (!isPathSafe(item.originalPath)) return res.status(403).json({ error: 'Access denied' });

      await fs.access(path.dirname(item.originalPath)); // original folder must still exist
      await fs.rename(path.join(TRASH_DIR, item.storedName), item.originalPath);
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
