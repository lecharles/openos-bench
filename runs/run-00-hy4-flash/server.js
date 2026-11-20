const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const fsSync = require('fs');
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

// Seed a small, writable "Macintosh HD" so Finder has real content to browse
(async () => {
  const home = path.join(os.homedir(), 'OpenOS');
  try {
    for (const folder of ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Applications', 'Projects']) {
      await fs.mkdir(path.join(home, folder), { recursive: true });
    }
    const seeds = {
      'README.md': '# Welcome to OpenOS\n\nThis is a real folder on the VPS, served through the Finder API.\n\n' +
        'Try the four Finder views (⌘1–⌘4), rename a file, or move it to the Trash and restore it.\n',
      'Desktop/Read Me.txt': 'Double-click a desktop icon, or right-click the wallpaper for more options.\n',
      'Documents/Welcome.md': '# Welcome\n\nNotes, Calendar events and Settings are all persisted server-side in the data folder.\n',
      'Documents/Project Notes.txt': 'OpenOS — browser desktop\n- Window manager with 8-way resize\n- Dock with magnification and genie minimize\n- Spotlight with fuzzy app search\n',
      'Documents/Budget.csv': 'Item,Amount\nCoffee,4.50\nLaptop,1299.00\n',
      'Pictures/Gradient Art.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E5CE6"/><stop offset="0.5" stop-color="#FF375F"/><stop offset="1" stop-color="#FF9F0A"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><circle cx="190" cy="150" r="90" fill="#ffffff" opacity="0.18"/><circle cx="450" cy="260" r="140" fill="#ffffff" opacity="0.12"/></svg>',
      'Pictures/Sunset.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1D51"/><stop offset="0.55" stop-color="#FF7E67"/><stop offset="1" stop-color="#FFC86B"/></linearGradient></defs><rect width="640" height="400" fill="url(#s)"/><circle cx="450" cy="250" r="58" fill="#FFF3C4" opacity="0.9"/><path d="M0 330 Q160 270 320 330 T640 320 V400 H0Z" fill="#141A3A" opacity="0.75"/></svg>',
      'Projects/Roadmap.txt': 'OpenOS roadmap\n1. Desktop shell + window manager\n2. Dock, Spotlight, Finder\n3. Twelve apps\n4. Server-side persistence\n',
    };
    await Promise.all(Object.entries(seeds).map(async ([rel, content]) => {
      const fp = path.join(home, rel);
      try { await fs.access(fp); } catch { await fs.writeFile(fp, content, 'utf8'); }
    }));
  } catch (e) {
    console.warn('Could not seed demo home:', e.message);
  }
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
    // Remove the other format so restore never picks a stale image
    const other = path.join(DATA_DIR, 'wallpaper.' + (ext === 'png' ? 'jpg' : 'png'));
    await fs.unlink(other).catch(() => {});
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
crudRoutes(app, 'messages.json', 'messages:updated');

// Agent proxy
agentRoutes(app);

// File system
fsRoutes(app);

// Terminal — sandboxed to the user's allowed folders with a command denylist
const TERMINAL_ROOTS = ['/root', '/home', '/tmp'];
const TERMINAL_BLOCKED = [
  /:\(\)\s*\{\s*:\|\s*:\s*&\s*\}\s*;:/,          // fork bomb
  /\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+(\/|~|(\.\.\/)+)(\s|$)/,
  /\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+\*\s*$/,
  /\bmkfs\b/, /\bdd\s+if=/, /\bshred\b/,
  /\b(sudo|su|doas|systemctl|service|reboot|shutdown|halt|init)\b/,
  /\b(chmod|chown|chgrp)\b/,
  /\b(curl|wget|nc|ncat|netcat|telnet|ssh|scp|sftp|rsync|git\s+clone)\b/,
  /\b(kill|pkill|killall)\s+-?9?\s*(1|-1|init|systemd)\b/,
  /\/etc\/(shadow|gshadow|sudoers|passwd)/,
  /(>|\>>)\s*(\/etc|\/usr|\/bin|\/sbin|\/boot|\/var)/,
];

function safeTerminalCwd(cwd) {
  let target = path.resolve(cwd || '/root');
  if (!TERMINAL_ROOTS.some(root => target === root || target.startsWith(root + path.sep))) {
    return null;
  }
  if (target === '/root') target = path.join(os.homedir(), 'OpenOS');
  else if (target.startsWith('/root' + path.sep)) {
    target = path.join(os.homedir(), 'OpenOS', target.slice('/root'.length));
  }
  try {
    const real = fsSync.realpathSync(target);
    if (!TERMINAL_ROOTS.some(root => real === root || real.startsWith(root + path.sep))) return null;
    return real;
  } catch { return null; }
}

app.post('/api/terminal', (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'No command' });
  if (typeof command !== 'string' || command.length > 2000) {
    return res.status(400).json({ error: 'Invalid command' });
  }
  if (TERMINAL_BLOCKED.some(re => re.test(command))) {
    return res.status(400).json({ error: 'Blocked command (sandbox)' });
  }
  const workdir = safeTerminalCwd(cwd);
  if (!workdir) return res.status(400).json({ error: 'Access denied (sandbox)' });

  const { exec } = require('child_process');
  exec(command, {
    cwd: workdir,
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: workdir, TERM: 'xterm-256color', LANG: 'C.UTF-8' }
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
  console.log(`OpenOS running on http://localhost:${PORT}`);
});
