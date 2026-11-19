'use strict';
/* Capture page screenshots via CDP (works around snap chromium's --screenshot). */
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const net = require('net');
const fs = require('fs');

const CHROME = '/usr/bin/chromium-browser';
const OUT = process.argv[2] || '/tmp/openos-shot.png';
const PAGE_URL = process.argv[3] || 'http://localhost:3000/?nosock';
const WAIT = Number(process.argv[4] || 3500);
const EVAL_BEFORE = process.argv[5] || '';

class WS {
  constructor() { this.socket = null; this.buf = Buffer.alloc(0); this.msgHandlers = []; this.open = false; }
  connect(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const key = crypto.randomBytes(16).toString('base64');
      const sock = net.connect(Number(u.port), u.hostname, () => {
        sock.write(
          `GET ${u.pathname}${u.search} HTTP/1.1\r\n` +
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
      const frame = this._readFrame();
      if (!frame) break;
      if (frame.opcode === 0x1 || frame.opcode === 0x0) {
        this.fragments = (this.fragments || '') + frame.payload.toString('utf8');
        if (frame.fin) { const msg = this.fragments; this.fragments = ''; for (const h of this.msgHandlers) h(msg); }
      } else if (frame.opcode === 0x8) { this.open = false; this.socket.destroy(); }
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
    let header;
    if (len < 126) header = Buffer.from([(0x80 | opcode), 0x80 | len]);
    else { header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
    const masked = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  send(str) { this._sendRaw(0x1, Buffer.from(str, 'utf8')); }
  onMessage(fn) { this.msgHandlers.push(fn); }
  close() { try { this.socket.destroy(); } catch {} }
}

const httpJSON = (method, path) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: Number(process.env.DBGP || 9223), path, method }, (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); } });
  });
  req.on('error', reject);
  req.end();
});

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + (process.env.DBGP || 9223), '--user-data-dir=/tmp/openos-e2e-profile-' + (process.env.DBGP || 9223) + '',
    '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const targets = await httpJSON('GET', '/json/list').catch(() => null);
    let wsUrl;
    const list = targets || await httpJSON('PUT', '/json/new?about:blank');
    const page = (targets || []).find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');
    wsUrl = page.webSocketDebuggerUrl;
    const ws = new WS();
    await ws.connect(wsUrl);
    let msgId = 0;
    const pending = new Map();
    ws.onMessage((raw) => {
      const m = JSON.parse(raw);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, (m) => (m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: PAGE_URL });
    await new Promise((r) => setTimeout(r, WAIT));
    if (EVAL_BEFORE) {
      const ev = await send('Runtime.evaluate', { expression: EVAL_BEFORE, returnByValue: true, awaitPromise: true });
      console.log('eval result:', JSON.stringify(ev.result && ev.result.value));
      await new Promise((r) => setTimeout(r, 1200));
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUT, Buffer.from(data, 'base64'));
    console.log('wrote', OUT, Buffer.from(data, 'base64').length, 'bytes');
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
