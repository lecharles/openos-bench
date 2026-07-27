// File system routes — Finder backend with path traversal protection
const fs = require('fs/promises');
const path = require('path');

// Allowed base directories for fs operations
const ALLOWED_ROOTS = ['/root', '/home', '/tmp', '/etc', '/var'];

function isPathSafe(targetPath) {
  const normalized = path.resolve(targetPath);
  return ALLOWED_ROOTS.some(root => {
    const r = path.resolve(root);
    return normalized === r || normalized.startsWith(r + path.sep);
  });
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
        let size = 0;
        if (e.isFile()) {
          try { const st = await fs.stat(fullPath); size = st.size; } catch {}
        }
        return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size };
      }));
      res.json({ path: dir, entries: mapped });
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
}

module.exports = fsRoutes;
