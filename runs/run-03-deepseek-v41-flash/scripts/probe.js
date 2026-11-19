'use strict';
/* Debug probe: does Runtime.evaluate work in the screenshot harness? */
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const net = require('net');
const CHROME = '/usr/bin/chromium-browser';

class WS {
  constructor() { this.socket = null; this.buf = Buffer.alloc(0); this.msgHandlers = []; this.open = false; }
  connect(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const key = crypto.randomBytes(16).toString('base64');
      const sock = net.connect(Number(u.port), u.hostname, () => {
        sock.write(
          `GET ${u.pathname} HTTP/1.1\r\n` +
          `Host: ${u.hostname}:${u.port}\r\n` +
          `Upgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      sock.once('error', reject);
      let headerBuf = Buffer.alloc(0);
      const onData = (chunk) => {
        if (!this.open) {
          headerBuf = Buffer.concat([headerBuf, chunk]);
          const idx = headerBuf.indexOf('\r\n\r\n');
          if (idx === -1) return;
          this.open = true;
          this.buf = headerBuf.slice(idx + 4);
          sock.off('data', onData);
          sock.on('data', (c) => this._onData(c));
          resolve();
        }
      };
      sock.on('data', onData);
      this.socket = sock;
    });
  }
  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      const f = this._readFrame();
      if (!f) break;
      if (f.opcode === 0x1) { const m = f.payload.toString('utf8'); for (const h of this.msgHandlers) h(m); }
      else if (f.opcode === 0x8) { this.open = false; this.socket.destroy(); }
    }
  }
  _readFrame() {
    if (this.buf.length < 2) return null;
    const b0 = this.buf[0], b1 = this.buf[1];
    const fin = (b0 >> 7) & 1, opcode = b0 & 0xf;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (this.buf.length < 4) return null; len = this.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (this.buf.length < 10) return null; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
    if (this.buf.length < off + len) return null;
    const payload = this.buf.slice(off, off + len);
    this.buf = this.buf.slice(off + len);
    return { fin, opcode, payload };
  }
  _sendRaw(opcode, payload) {
    const mask = crypto.randomBytes(4);
    const len = payload.length;
    const header = Buffer.from([(0x80 | opcode), 0x80 | len]);
    const masked = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  send(str) { this._sendRaw(0x1, Buffer.from(str, 'utf8')); }
  onMessage(fn) { this.msgHandlers.push(fn); }
  close() { try { this.socket.destroy(); } catch {} }
}

const httpJSON = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: Number(process.env.DBGP || 9223), path }, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

(async () => {
  const dbgp = String(process.env.DBGP || 9223);
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + dbgp, '--user-data-dir=/tmp/openos-e2e-profile-' + dbgp,
    '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const targets = await httpJSON('/json/list');
  const page = targets.find((t) => t.type === 'page');
  const ws = new WS();
  await ws.connect(page.webSocketDebuggerUrl);
  let msgId = 0;
  const pending = new Map();
  ws.onMessage((raw) => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/?nosock' });
  await new Promise((r) => setTimeout(r, 4000));
  const r1 = await send('Runtime.evaluate', { expression: `document.getElementById('boot') ? ('boot-present: ' + document.getElementById('boot').innerHTML.length + ' progress:' + document.getElementById('boot-progress').style.width) : 'boot-gone'`, returnByValue: true });
  console.log('probe1:', JSON.stringify(r1.result));
  const r2 = await send('Runtime.evaluate', { expression: `window.openos.open('notes'); 'clicked'`, returnByValue: true, awaitPromise: true });
  console.log('probe2:', JSON.stringify(r2.result));
  await new Promise((r) => setTimeout(r, 1500));
  const r3 = await send('Runtime.evaluate', { expression: `document.querySelectorAll('.window').length`, returnByValue: true });
  console.log('probe3 windows:', JSON.stringify(r3.result));
  ws.close();
  chrome.kill('SIGKILL');
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
