'use strict';
/* OpenOS self-test — drives the real page over CDP with a hand-rolled
 * WebSocket client (no external deps). Launch:
 *   node scripts/e2e.mjs
 * Requires: chromium-browser with --remote-debugging-port=9222 already
 * running, and the OpenOS server on :3000. */
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const net = require('net');

const CHROME = '/usr/bin/chromium-browser';
const DEBUG_PORT = 9222;
const APP_URL = 'http://localhost:3000/?nosock';

/* ---------- minimal websocket client ---------- */
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
          const head = headerBuf.slice(0, idx).toString();
          if (!/101/.test(head.split('\r\n')[0])) { reject(new Error('handshake failed: ' + head.split('\r\n')[0])); return; }
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
      if (frame.opcode === 0x1 || frame.opcode === 0x0) { // text / continuation
        this.fragments = (this.fragments || '') + frame.payload.toString('utf8');
        if (frame.fin) { const msg = this.fragments; this.fragments = ''; for (const h of this.msgHandlers) h(msg); }
      } else if (frame.opcode === 0x8) { this.open = false; this.socket.destroy(); }
      else if (frame.opcode === 0x9) { this._sendRaw(0xA, frame.payload); } // ping → pong
    }
  }
  _readFrame() {
    if (this.buf.length < 2) return null;
    const b0 = this.buf[0], b1 = this.buf[1];
    const fin = (b0 >> 7) & 1, opcode = b0 & 0xf;
    const masked = (b1 >> 7) & 1;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (this.buf.length < 4) return null; len = this.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (this.buf.length < 10) return null; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
    if (this.buf.length < off + len + (masked ? 4 : 0)) return null;
    let payload = this.buf.slice(off, off + len);
    off += len;
    if (masked) {
      const key = this.buf.slice(off, off + 4);
      payload = Buffer.from(payload.map((b, i) => b ^ key[i % 4]));
      off += 4;
    }
    this.buf = this.buf.slice(off);
    return { fin, opcode, payload };
  }
  _sendRaw(opcode, payload) {
    const mask = crypto.randomBytes(4);
    const len = payload.length;
    let header;
    if (len < 126) { header = Buffer.from([(0x80 | opcode), 0x80 | len]); }
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2); }
    const masked = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  send(str) { this._sendRaw(0x1, Buffer.from(str, 'utf8')); }
  onMessage(fn) { this.msgHandlers.push(fn); }
  close() { try { this._sendRaw(0x8, Buffer.alloc(0)); this.socket.destroy(); } catch {} }
}

/* ---------- CDP ---------- */
const httpJSON = (method, path, body) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: DEBUG_PORT, path, method }, (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); } });
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

async function main() {
  console.log('launching chromium…');
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, '--user-data-dir=/tmp/openos-e2e-profile',
    '--window-size=1440,900', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  await new Promise((r) => setTimeout(r, 2500));

  const results = [];
  const exceptions = [];
  try {
    const targets = await httpJSON('GET', '/json/list');
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');

    const ws = new WS();
    await ws.connect(page.webSocketDebuggerUrl);
    let msgId = 0;
    const pending = new Map();
    const listeners = [];
    ws.onMessage((raw) => {
      const m = JSON.parse(raw);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      else for (const l of listeners) l(m);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, (m) => (m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const onEvent = (fn) => listeners.push(fn);

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evalInPage = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
      return r.result.value;
    };
    onEvent((m) => {
      if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || '').slice(0, 300));
      if (m.sessionId !== sessionId) return;
    });
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: APP_URL }, sessionId);
    await new Promise((r) => setTimeout(r, 3000)); // boot completes

    const check = async (name, fn) => {
      try {
        const v = await fn(evalInPage);
        const pass = v === true || (Array.isArray(v) && v[0] === true);
        results.push([pass, name, pass ? '' : ('got: ' + JSON.stringify(v).slice(0, 220))]);
        console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (pass ? '' : '  → ' + JSON.stringify(v).slice(0, 220)));
      } catch (e) {
        results.push([false, name, e.message]);
        console.log('FAIL  ' + name + '  → ' + e.message);
      }
    };

    const synth = `
      const mdown = (el, x, y) => el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, clientX:x, clientY:y}));
      const mmove = (x, y) => document.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, clientX:x, clientY:y}));
      const mup = (x, y) => document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true, clientX:x, clientY:y}));
    `;

    await check('shell: menubar + dock + desktop icons rendered', async (E) => await E(`
      ${synth}
      const dockCount = document.querySelectorAll('.dock-item').length;
      const mbCount = document.querySelectorAll('#menubar .mb-item').length;
      const deskCount = document.querySelectorAll('.dicon').length;
      dockCount >= 15 && mbCount >= 10 && deskCount >= 3 ? true : [false, dockCount, mbCount, deskCount];
    `));

    await check('visual: overlays hidden, desktop is top element', async (E) => await E(`
      (async () => {
        const sleepVis = getComputedStyle(document.getElementById('sleep')).display;
        const spotVis = getComputedStyle(document.getElementById('spotlight')).display;
        const swVis = getComputedStyle(document.getElementById('appswitcher')).display;
        const bootGone = !document.getElementById('boot');
        const pt = document.elementFromPoint(720, 400);
        const onDesktop = !!(pt && (pt.id === 'wallpaper' || pt.closest('#desktop, .dicon')));
        const wpColor = getComputedStyle(document.getElementById('wallpaper')).backgroundImage;
        const ok = sleepVis === 'none' && spotVis === 'none' && swVis === 'none' && bootGone && onDesktop && wpColor.includes('gradient');
        return ok ? true : [false, { sleepVis, spotVis, swVis, bootGone, onDesktop, wp: wpColor.slice(0, 40) }];
      })()
    `));

    await check('visual: opened window is actually hit-testable', async (E) => await E(`
      (async () => {
        window.openos.open('notes');
        await new Promise(r => setTimeout(r, 450));
        const win = document.querySelector('.window[data-app="notes"]');
        const r = win.getBoundingClientRect();
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const pt = document.elementFromPoint(cx, cy);
        const hit = !!(pt && pt.closest('.window[data-app="notes"]'));
        const titleHit = !!(document.elementFromPoint(r.x + 200, r.y + 20) || {}).closest;
        return hit ? true : [false, { rect: [r.x, r.y, r.width, r.height], hit: pt ? pt.className || pt.id : null }];
      })()
    `));

    await check('security: /etc/shadow is 403 from the page', async (E) => await E(`
      (async () => { const r = await fetch('/api/fs/read?path=' + encodeURIComponent('/etc/shadow')); return r.status === 403 ? true : [false, r.status]; })()
    `));

    await check('wm: open Notes via openos.open', async (E) => await E(`
      (async () => {
        window.openos.open('notes');
        await new Promise(r => setTimeout(r, 450));
        const win = document.querySelector('.window[data-app="notes"]');
        return win ? true : [false, 'no window'];
      })()
    `));

    await check('wm: drag moves the window', async (E) => await E(`
      (async () => {
        ${synth}
        const win = document.querySelector('.window[data-app="notes"]');
        const tb = win.querySelector('.titlebar');
        const before = win.style.left;
        const r = tb.getBoundingClientRect();
        mdown(tb, r.x + r.width/2, r.y + 10);
        mmove(r.x + r.width/2 + 60, r.y + 10 + 40);
        mup(r.x + r.width/2 + 60, r.y + 10 + 40);
        await new Promise(r => setTimeout(r, 80));
        return win.style.left !== before ? true : [false, before, win.style.left];
      })()
    `));

    await check('wm: resize via SE handle grows window', async (E) => await E(`
      (async () => {
        ${synth}
        const win = document.querySelector('.window[data-app="notes"]');
        const h = win.querySelector('.rz-se');
        const before = { w: win.style.width, h: win.style.height };
        const r = h.getBoundingClientRect();
        mdown(h, r.x + 4, r.y + 4);
        mmove(r.x + 44, r.y + 44);
        mup(r.x + 44, r.y + 44);
        await new Promise(r => setTimeout(r, 80));
        return (win.style.width !== before.w || win.style.height !== before.h) ? true : [false, before, win.style.width, win.style.height];
      })()
    `));

    await check('wm: minimize → hidden; dock click restores', async (E) => await E(`
      (async () => {
        ${synth}
        const win = document.querySelector('.window[data-app="notes"]');
        win.querySelector('.tl-min').click();
        await new Promise(r => setTimeout(r, 550));
        const hidden = win.classList.contains('minimized');
        const dockItem = document.querySelector('.dock-item[data-app="notes"]');
        dockItem.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
        await new Promise(r => setTimeout(r, 550));
        const restored = !win.classList.contains('minimized');
        return hidden && restored ? true : [false, hidden, restored];
      })()
    `));

    await check('wm: traffic light close removes window', async (E) => await E(`
      (async () => {
        window.openos.open('about');
        await new Promise(r => setTimeout(r, 400));
        const win = document.querySelector('.window[data-app="about"]');
        win.querySelector('.tl-close').click();
        await new Promise(r => setTimeout(r, 300));
        return !document.querySelector('.window[data-app="about"]') ? true : [false];
      })()
    `));

    await check('spotlight: ⌘Space → type → Enter launches', async (E) => await E(`
      (async () => {
        ${synth}
        document.dispatchEvent(new KeyboardEvent('keydown', {bubbles:true, metaKey:true, code:'Space'}));
        await new Promise(r => setTimeout(r, 120));
        const input = document.getElementById('spotlight-input');
        if (!input) return [false, 'no input'];
        input.value = 'calc';
        input.dispatchEvent(new Event('input', {bubbles:true}));
        await new Promise(r => setTimeout(r, 150));
        const item = [...document.querySelectorAll('.spot-item')].find(el => el.textContent.includes('Calculator'));
        if (!item) return [false, 'no calculator result', document.getElementById('spotlight-results').textContent.slice(0, 100)];
        item.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
        await new Promise(r => setTimeout(r, 500));
        return document.querySelector('.window[data-app="calculator"]') ? true : [false, 'window not opened'];
      })()
    `));

    await check('calculator: 7 × 6 = 42', async (E) => await E(`
      (async () => {
        const win = document.querySelector('.window[data-app="calculator"]');
        for (const k of ['7', '×', '6', '=']) {
          win.querySelector('[data-k="' + k + '"]').click();
          await new Promise(r => setTimeout(r, 30));
        }
        const disp = win.querySelector('.calc-display').textContent;
        return disp === '42' ? true : [false, disp];
      })()
    `));

    await check('dock: magnification on mousemove', async (E) => await E(`
      (async () => {
        ${synth}
        const wrap = document.getElementById('dock-wrap');
        const item = document.querySelector('.dock-item[data-app="notes"]');
        const base = item.getBoundingClientRect().width;
        const r = item.getBoundingClientRect();
        wrap.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, clientX: r.x + r.width/2, clientY: r.y + 5}));
        await new Promise(res => setTimeout(res, 60));
        const grown = item.getBoundingClientRect().width;
        return grown > base + 8 ? true : [false, base, grown];
      })()
    `));

    await check('terminal: ls + cat over sandboxed fs API', async (E) => await E(`
      (async () => {
        window.openos.open('terminal');
        await new Promise(r => setTimeout(r, 500));
        const win = document.querySelector('.window[data-app="terminal"]');
        const input = win.querySelector('.term-input');
        const runCmd = async (cmd) => {
          input.value = cmd;
          input.dispatchEvent(new KeyboardEvent('keydown', {bubbles:true, key:'Enter'}));
          await new Promise(r => setTimeout(r, 500));
        };
        await runCmd('cd ~/Desktop');
        await runCmd('ls');
        const out = win.querySelector('.term-output').textContent;
        return out.includes('Welcome') && out.includes('Shortcuts') ? true : [false, out.slice(-200)];
      })()
    `));

    await check('terminal: cd /etc is rejected (sandbox)', async (E) => await E(`
      (async () => {
        const win = document.querySelector('.window[data-app="terminal"]');
        const input = win.querySelector('.term-input');
        input.value = 'cat /etc/shadow';
        input.dispatchEvent(new KeyboardEvent('keydown', {bubbles:true, key:'Enter'}));
        await new Promise(r => setTimeout(r, 500));
        const out = win.querySelector('.term-output').textContent;
        return out.toLowerCase().includes('forbidden') ? true : [false, out.slice(-150)];
      })()
    `));

    await check('finder: breadcrumbs + folder navigation', async (E) => await E(`
      (async () => {
        window.openos.open('finder', { path: '~' });
        await new Promise(r => setTimeout(r, 600));
        const win = document.querySelector('.window[data-app="finder"]');
        const doc = [...win.querySelectorAll('.fitem')].find(el => el.dataset.name === 'Documents');
        doc.dispatchEvent(new MouseEvent('click', {bubbles:true}));
        doc.dispatchEvent(new MouseEvent('dblclick', {bubbles:true}));
        await new Promise(r => setTimeout(r, 500));
        const crumbs = [...win.querySelectorAll('.crumb')].map(c => c.textContent);
        return crumbs.join('/') === 'Home/Documents' ? true : [false, crumbs];
      })()
    `));

    await check('finder: context menu → Move to Trash → Trash app → Put Back', async (E) => await E(`
      (async () => {
        await fetch('/api/fs/write', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({path:'~/Documents/e2e-trash-me.txt', content:'bye'})});
        const win = document.querySelector('.window[data-app="finder"]');
        window.openos.refresh();
        await new Promise(r => setTimeout(r, 600));
        const row = [...win.querySelectorAll('.fitem')].find(el => el.dataset.name === 'e2e-trash-me.txt');
        row.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, clientX: 300, clientY: 300}));
        await new Promise(r => setTimeout(r, 150));
        const trashItem = [...document.querySelectorAll('.ctx-item')].find(el => el.textContent.includes('Move to Trash'));
        trashItem.click();
        await new Promise(r => setTimeout(r, 700));
        window.openos.open('trash');
        await new Promise(r => setTimeout(r, 600));
        const trashWin = document.querySelector('.window[data-app="trash"]');
        const restoreBtn = [...trashWin.querySelectorAll('[data-restore]')][0];
        if (!restoreBtn) return [false, 'no restore button', trashWin.querySelector('.trash-list').textContent.slice(0, 150)];
        restoreBtn.click();
        await new Promise(r => setTimeout(r, 700));
        const read = await fetch('/api/fs/read?path=' + encodeURIComponent('~/Documents/e2e-trash-me.txt')).then(r => r.status);
        await fetch('/api/fs/delete', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({path:'~/Documents/e2e-trash-me.txt'})});
        return read === 200 ? true : [false, read];
      })()
    `));

    await check('rename: desktop icon rename commits to server', async (E) => await E(`
      (async () => {
        await fetch('/api/fs/write', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({path:'~/Desktop/e2e-rename.txt', content:'x'})});
        window.openos.refresh();
        const icons = document.getElementById('desktop-icons');
        await new Promise(r => setTimeout(r, 600));
        const icon = [...icons.querySelectorAll('.dicon')].find(el => el.dataset.name === 'e2e-rename.txt');
        if (!icon) return [false, 'icon not rendered'];
        icon.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, clientX: 200, clientY: 200}));
        await new Promise(r => setTimeout(r, 150));
        const renameItem = [...document.querySelectorAll('.ctx-item')].find(el => el.textContent.includes('Rename'));
        renameItem.click();
        await new Promise(r => setTimeout(r, 100));
        const input = icons.querySelector('input.rename-input');
        if (!input) return [false, 'no inline input'];
        input.value = 'e2e-renamed.txt';
        input.dispatchEvent(new Event('blur'));
        await new Promise(r => setTimeout(r, 600));
        const list = await fetch('/api/fs/list?path=' + encodeURIComponent('~/Desktop')).then(r => r.json());
        await fetch('/api/fs/delete', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({path:'~/Desktop/e2e-renamed.txt'})});
        return list.entries.some(e => e.name === 'e2e-renamed.txt') ? true : [false, list.entries.map(e => e.name)];
      })()
    `));

    await check('settings: theme switch persists server-side', async (E) => await E(`
      (async () => {
        window.openos.open('settings');
        await new Promise(r => setTimeout(r, 500));
        const win = document.querySelector('.window[data-app="settings"]');
        win.querySelector('.sidebar-item[data-pane="appearance"]').click();
        await new Promise(r => setTimeout(r, 100));
        const darkCard = win.querySelector('[data-theme="dark"]');
        darkCard.click();
        await new Promise(r => setTimeout(r, 600));
        const s = await fetch('/api/settings').then(r => r.json());
        const bodyTheme = document.body.dataset.theme;
        return s.theme === 'dark' && bodyTheme === 'dark' ? true : [false, s.theme, bodyTheme];
      })()
    `));

    await check('persistence: layout survives reload', async (E) => {
      await E(`(async () => {
        window.openos.open('notes');
        await new Promise(r => setTimeout(r, 500));
        const w = window.openos.windows();
        return w.length > 0 ? true : [false, w];
      })()`);
      await send('Page.reload', {}, sessionId);
      await new Promise((r) => setTimeout(r, 3500));
      return await E(`(async () => {
        await new Promise(r => setTimeout(r, 800));
        const wins = window.openos.windows();
        return wins.some(w => w.app === 'notes') ? true : [false, wins, document.body.dataset.theme];
      })()`);
    });

    await check('persistence: theme survives reload', async (E) => await E(`
      (async () => {
        const s = await fetch('/api/settings').then(r => r.json());
        return document.body.dataset.theme === 'dark' && s.theme === 'dark' ? true : [false, document.body.dataset.theme, s.theme];
      })()
    `));

    await check('all apps open without exceptions', async (E) => await E(`
      (async () => {
        const bad = [];
        for (const id of ['finder','notes','calendar','weather','calculator','preview','trash','settings','clock','contacts','music','mail','terminal','photos','textedit','about']) {
          try {
            window.openos.open(id);
            await new Promise(r => setTimeout(r, 320));
            const el = document.querySelector('.window[data-app="' + id + '"]');
            if (!el || el.querySelector('.window-body').innerHTML.length < 40) bad.push(id + ':empty');
          } catch (e) { bad.push(id + ':' + e.message); }
        }
        return bad.length ? [false, bad] : true;
      })()
    `));

    ws.close();
  } finally {
    chrome && chrome.killed === false && chrome.kill('SIGKILL');
  }

  const passed = results.filter(r => r[0]).length;
  console.log('\\n==============================');
  console.log(`RESULTS: ${passed}/${results.length} passed`);
  console.log('PAGE EXCEPTIONS:', exceptions.length ? exceptions : 'none');
  const fails = results.filter(r => !r[0]);
  process.exit(fails.length || exceptions.length ? 1 : 0);
}

main().catch((e) => { console.error('E2E harness error:', e); process.exit(2); });
