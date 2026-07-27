const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3080;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Persistence helpers ---
function readJSON(filename) {
  const fp = path.join(DATA_DIR, filename);
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// --- API: Settings ---
app.get('/api/settings', (req, res) => {
  res.json(readJSON('settings.json') || { wallpaper: '', theme: 'auto', accent: '#007AFF' });
});
app.post('/api/settings', (req, res) => {
  writeJSON('settings.json', req.body);
  io.emit('settings:updated', req.body);
  res.json({ ok: true });
});

// --- API: Windows ---
app.get('/api/windows', (req, res) => {
  res.json(readJSON('windows.json') || []);
});
app.post('/api/windows', (req, res) => {
  writeJSON('windows.json', req.body);
  res.json({ ok: true });
});

// --- API: Wallpaper ---
app.post('/api/wallpaper', express.raw({ type: 'image/*', limit: '5mb' }), (req, res) => {
  const ext = req.headers['content-type']?.includes('png') ? 'png' : 'jpg';
  const fp = path.join(DATA_DIR, 'wallpaper.' + ext);
  fs.writeFileSync(fp, req.body);
  res.json({ ok: true, path: '/data/wallpaper.' + ext });
});
app.get('/data/wallpaper.jpg', (req, res) => {
  const fp = path.join(DATA_DIR, 'wallpaper.jpg');
  if (fs.existsSync(fp)) res.sendFile(fp);
  else res.status(404).end();
});
app.get('/data/wallpaper.png', (req, res) => {
  const fp = path.join(DATA_DIR, 'wallpaper.png');
  if (fs.existsSync(fp)) res.sendFile(fp);
  else res.status(404).end();
});

// --- API: Agent proxy (Hermes / OpenClaw) ---
const agentConfigs = {
  hermes: { url: process.env.HERMES_URL || 'http://127.0.0.1:8400' },
  openclaw: { url: process.env.OPENCLAW_URL || 'http://127.0.0.1:8401' }
};

app.post('/api/agent/:agent/chat', async (req, res) => {
  const { agent } = req.params;
  const cfg = agentConfigs[agent];
  if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
  try {
    const resp = await fetch(cfg.url + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Agent unavailable', detail: e.message });
  }
});

app.get('/api/agent/:agent/health', async (req, res) => {
  const { agent } = req.params;
  const cfg = agentConfigs[agent];
  if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
  try {
    const resp = await fetch(cfg.url + '/health');
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Agent unavailable', detail: e.message });
  }
});

app.get('/api/agent/:agent/status', async (req, res) => {
  const { agent } = req.params;
  const cfg = agentConfigs[agent];
  if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
  try {
    const resp = await fetch(cfg.url + '/status');
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Agent unavailable', detail: e.message });
  }
});

app.post('/api/agent/:agent/restart', async (req, res) => {
  const { agent } = req.params;
  const cfg = agentConfigs[agent];
  if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
  try {
    const resp = await fetch(cfg.url + '/restart', { method: 'POST' });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Agent unavailable', detail: e.message });
  }
});

// --- API: File System (Finder backend) ---
app.get('/api/fs', (req, res) => {
  const dir = req.query.dir || '/root';
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      size: e.isFile() ? fs.statSync(path.join(dir, e.name)).size : 0
    }));
    res.json({ path: dir, entries });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/fs/read', (req, res) => {
  const fp = req.query.file;
  if (!fp) return res.status(400).json({ error: 'No file specified' });
  try {
    const content = fs.readFileSync(fp, 'utf8');
    res.json({ path: fp, content });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/fs/write', (req, res) => {
  const { path: fp, content } = req.body;
  if (!fp) return res.status(400).json({ error: 'No path specified' });
  try {
    fs.writeFileSync(fp, content, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- API: Notes ---
const notesFile = 'notes.json';
app.get('/api/notes', (req, res) => {
  res.json(readJSON(notesFile) || []);
});
app.post('/api/notes', (req, res) => {
  writeJSON(notesFile, req.body);
  io.emit('notes:updated', req.body);
  res.json({ ok: true });
});

// --- API: Reminders ---
const remindersFile = 'reminders.json';
app.get('/api/reminders', (req, res) => {
  res.json(readJSON(remindersFile) || []);
});
app.post('/api/reminders', (req, res) => {
  writeJSON(remindersFile, req.body);
  io.emit('reminders:updated', req.body);
  res.json({ ok: true });
});

// --- API: Calendar ---
const calendarFile = 'calendar.json';
app.get('/api/calendar', (req, res) => {
  res.json(readJSON(calendarFile) || []);
});
app.post('/api/calendar', (req, res) => {
  writeJSON(calendarFile, req.body);
  io.emit('calendar:updated', req.body);
  res.json({ ok: true });
});

// --- API: Contacts ---
const contactsFile = 'contacts.json';
app.get('/api/contacts', (req, res) => {
  res.json(readJSON(contactsFile) || []);
});
app.post('/api/contacts', (req, res) => {
  writeJSON(contactsFile, req.body);
  io.emit('contacts:updated', req.body);
  res.json({ ok: true });
});

// --- API: Mail (mock) ---
const mailFile = 'mail.json';
app.get('/api/mail', (req, res) => {
  res.json(readJSON(mailFile) || []);
});
app.post('/api/mail', (req, res) => {
  writeJSON(mailFile, req.body);
  io.emit('mail:updated', req.body);
  res.json({ ok: true });
});

// --- API: Terminal execute ---
app.post('/api/terminal', (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'No command' });
  const { exec } = require('child_process');
  exec(command, { cwd: cwd || '/root', timeout: 10000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code || 1) : 0
    });
  });
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
      const resp = await fetch(cfg.url + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: AbortSignal.timeout(120000)
      });
      if (!resp.ok) throw new Error('Agent returned ' + resp.status);
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
