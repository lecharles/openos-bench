'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs/promises');
const { Server } = require('socket.io');

const { storeRoutes, DATA_DIR } = require('./routes/store');
const { fsRoutes, ensureDirs, OS_HOME } = require('./routes/fs');
const { terminalRoutes } = require('./routes/terminal');
const { seed } = require('./seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');
const WALLPAPER_DIR = path.join(DATA_DIR, 'wallpaper');

app.set('io', io);
app.disable('x-powered-by');
app.use(express.json({ limit: '12mb' }));

async function boot() {
  await ensureDirs();
  await fs.mkdir(WALLPAPER_DIR, { recursive: true });
  try { await seed(); } catch (e) { console.warn('[seed]', e.message); }
}
boot();

// --- tiny request log (API only) ---
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api/') && res.statusCode >= 400) {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
    }
  });
  next();
});

app.use(express.static(PUBLIC_DIR, { index: 'index.html', maxAge: '1h' }));

// --- persistence ---
storeRoutes(app);

// --- filesystem ---
fsRoutes(app);

// --- sandboxed terminal ---
terminalRoutes(app);

// --- wallpaper upload / fetch ---
app.post('/api/wallpaper', express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], limit: '8mb' }), async (req, res) => {
  try {
    const ct = String(req.headers['content-type'] || '');
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg';
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'Empty upload' });
    await fs.mkdir(WALLPAPER_DIR, { recursive: true });
    const target = path.join(WALLPAPER_DIR, 'wallpaper.' + ext);
    await fs.writeFile(target, req.body);
    for (const e of ['png', 'jpg', 'webp', 'gif']) {
      if (e !== ext) await fs.unlink(path.join(WALLPAPER_DIR, 'wallpaper.' + e)).catch(() => {});
    }
    io.emit('wallpaper', { path: '/api/wallpaper' });
    res.json({ ok: true, path: '/api/wallpaper' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/wallpaper', async (req, res) => {
  for (const e of ['png', 'jpg', 'webp', 'gif']) {
    const fp = path.join(WALLPAPER_DIR, 'wallpaper.' + e);
    try {
      await fs.access(fp);
      res.setHeader('Content-Type', e === 'jpg' ? 'image/jpeg' : 'image/' + e);
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(fp);
    } catch { /* next */ }
  }
  res.status(404).json({ error: 'No custom wallpaper' });
});

app.delete('/api/wallpaper', async (req, res) => {
  for (const e of ['png', 'jpg', 'webp', 'gif']) {
    await fs.unlink(path.join(WALLPAPER_DIR, 'wallpaper.' + e)).catch(() => {});
  }
  io.emit('wallpaper', { path: null });
  res.json({ ok: true });
});

// --- health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), version: '1.0.0' });
});

// --- API 404 + error handler ---
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('ping', (cb) => { if (typeof cb === 'function') cb({ ok: true }); });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenOS 1.0 serving on http://127.0.0.1:${PORT} (home=${OS_HOME})`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
