const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs/promises');
const { crudRoutes, readJSON, writeJSON } = require('./routes/persistence');
const fsRoutes = require('./routes/fs');
const { agentRoutes, agentConfigs } = require('./routes/agent');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3080;
const DATA_DIR = path.join(__dirname, 'data');

// Make io accessible in routes
app.set('io', io);

// Ensure data directory exists
(async () => {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
})();

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Request logging in dev ---
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (req.path.startsWith('/api/')) {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });
}

// --- API Routes ---

// Settings
crudRoutes(app, 'settings.json', 'settings:updated', {
  defaultValue: { wallpaper: '', theme: 'auto', accent: '#007AFF' }
});

// Windows
app.get('/api/windows', async (req, res) => {
  try {
    const data = await readJSON('windows.json');
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/windows', async (req, res) => {
  try {
    await writeJSON('windows.json', req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Wallpaper
app.post('/api/wallpaper', express.raw({ type: 'image/*', limit: '5mb' }), async (req, res) => {
  try {
    const ext = req.headers['content-type']?.includes('png') ? 'png' : 'jpg';
    const fp = path.join(DATA_DIR, 'wallpaper.' + ext);
    await fs.writeFile(fp, req.body);
    res.json({ ok: true, path: '/data/wallpaper.' + ext });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/data/wallpaper.jpg', async (req, res) => {
  try { const fp = path.join(DATA_DIR, 'wallpaper.jpg'); await fs.access(fp); res.sendFile(fp); }
  catch { res.status(404).end(); }
});
app.get('/data/wallpaper.png', async (req, res) => {
  try { const fp = path.join(DATA_DIR, 'wallpaper.png'); await fs.access(fp); res.sendFile(fp); }
  catch { res.status(404).end(); }
});

// CRUD resources
crudRoutes(app, 'notes.json', 'notes:updated');
crudRoutes(app, 'reminders.json', 'reminders:updated');
crudRoutes(app, 'calendar.json', 'calendar:updated');
crudRoutes(app, 'contacts.json', 'contacts:updated');
crudRoutes(app, 'mail.json', 'mail:updated');

// Agent proxy
agentRoutes(app);

// File system
fsRoutes(app);

// Terminal
app.post('/api/terminal', (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'No command' });

  // Basic command sanitization
  const blocked = ['rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:'];
  if (blocked.some(b => command.includes(b))) {
    return res.status(400).json({ error: 'Blocked command' });
  }

  const { exec } = require('child_process');
  exec(command, {
    cwd: cwd || '/root',
    timeout: 10000,
    maxBuffer: 1024 * 1024
  }, (err, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code || 1) : 0
    });
  });
});

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), memory: process.memoryUsage().rss });
});

// --- Global error handler ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- 404 ---
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
  }
  // Let static middleware handle non-API 404s
});

// --- Socket.IO realtime ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('agent:chat', async (data) => {
    const { agent, message, history } = data;
    const cfg = agentConfigs[agent];
    if (!cfg) {
      socket.emit('agent:error', { agent, error: 'Unknown agent' });
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);

      const resp = await fetch(cfg.url + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!resp.ok) {
        socket.emit('agent:error', { agent, error: 'Agent returned ' + resp.status });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6);
            if (chunk === '[DONE]') {
              socket.emit('agent:done', { agent });
            } else {
              try {
                const parsed = JSON.parse(chunk);
                socket.emit('agent:chunk', { agent, content: parsed.content || parsed.text || chunk });
              } catch {
                socket.emit('agent:chunk', { agent, content: chunk });
              }
            }
          }
        }
      }
    } catch (e) {
      socket.emit('agent:error', { agent, error: e.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`KiMi Browser Desktop running on http://localhost:${PORT}`);
});
