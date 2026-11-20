'use strict';
// Server-side JSON persistence. Every key is a file under data/store/.
// The browser never touches localStorage for durable state (localStorage is
// only used as a paint-time theme hint so there is no light/dark flash).
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_DIR = path.join(DATA_DIR, 'store');

const ALLOWED_KEYS = new Set([
  'settings', 'layout', 'notes', 'calendar', 'contacts', 'mail',
  'music', 'photos', 'textedit', 'ui', 'about', 'notifications',
]);

function safeKey(key) {
  if (typeof key !== 'string') return null;
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(key)) return null;
  if (!ALLOWED_KEYS.has(key)) return null;
  return key;
}

async function readKey(key) {
  try {
    return JSON.parse(await fs.readFile(path.join(STORE_DIR, key + '.json'), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function writeKey(key, value) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const target = path.join(STORE_DIR, key + '.json');
  const tmp = target + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2);
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, target);
}

async function readAll() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const out = {};
  for (const key of ALLOWED_KEYS) {
    const v = await readKey(key);
    if (v !== null) out[key] = v;
  }
  return out;
}

function storeRoutes(router) {
  router.get('/api/store', async (req, res) => {
    try { res.json(await readAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/api/store/:key', async (req, res) => {
    const key = safeKey(req.params.key);
    if (!key) return res.status(403).json({ error: 'Unknown store key' });
    try { res.json({ key, value: await readKey(key) }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/api/store/:key', async (req, res) => {
    const key = safeKey(req.params.key);
    if (!key) return res.status(403).json({ error: 'Unknown store key' });
    if (req.body === undefined || req.body === null) return res.status(400).json({ error: 'Empty body' });
    try {
      await writeKey(key, req.body);
      const io = req.app.get('io');
      if (io) io.emit('store', { key, value: req.body });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { storeRoutes, readKey, writeKey, STORE_DIR, DATA_DIR };
