const assert = require('node:assert/strict');
const fs = require('node:fs');
const WebSocket = require('ws');
const base = process.env.OPENOS_URL || 'http://127.0.0.1:3000';
const devtools = process.env.CHROME_DEVTOOLS || 'http://127.0.0.1:9223';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = []; }
  async open() { await new Promise((resolve, reject) => { this.ws.once('open', resolve); this.ws.once('error', reject); }); this.ws.on('message', raw => { const msg = JSON.parse(raw); if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); } if (msg.method === 'Runtime.exceptionThrown') this.errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); }); }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
  close() { this.ws.close(); }
}
(async () => {
  const target = await fetch(`${devtools}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const cdp = new CDP(target.webSocketDebuggerUrl); await cdp.open();
  const waitFor = async (expression, timeout = 10000) => { const start = Date.now(); while (Date.now() - start < timeout) { if (await cdp.eval(`!!(${expression})`)) return; await delay(100); } console.error('CDP errors:', cdp.errors); console.error('Page state:', await cdp.eval(`({ready:document.readyState, os:typeof OS, osReady:window.OS?.ready, scripts:[...document.scripts].map(s=>s.src), windows:document.querySelector('#windows')?.innerHTML.slice(0,500), body:document.body.innerText.slice(0,500)})`)); throw new Error(`Timed out: ${expression}`); };
  const navigate = async () => { await cdp.send('Page.navigate', { url: base }); await waitFor('window.OS && OS.ready'); await delay(900); };
  const mouse = async (type, x, y, extra = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra });
  try {
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate();
    assert.equal(await cdp.eval('OS.apps.size'), 15);
    assert.equal(await cdp.eval('document.querySelectorAll(".dock-item[data-app]").length'), 14);
    const initialShot = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/opencode/openos-kimi-desktop.png', Buffer.from(initialShot.data, 'base64'));

    const apps = ['finder','notes','calendar','weather','calculator','preview','trash','settings','clock','contacts','music','mail','photos','terminal','textedit'];
    for (const id of apps) {
      await cdp.eval(`OS.openApp(${JSON.stringify(id)})`); await delay(280);
      assert.ok(await cdp.eval(`document.querySelector('.window[data-app="${id}"] .window-body')?.children.length > 0`), `${id} did not render`);
      assert.equal(await cdp.eval(`document.querySelector('.window[data-app="${id}"] .window-body > .empty-state h3')?.textContent || ''`), '', `${id} rendered error state`);
      if (process.env.CAPTURE_APPS) { const shot = await cdp.send('Page.captureScreenshot', {format:'png'}); fs.writeFileSync(`/tmp/opencode/openos-kimi-app-${id}.png`, Buffer.from(shot.data, 'base64')); }
      if (id !== 'finder') { await cdp.eval(`OS.closeApp(${JSON.stringify(id)})`); await delay(230); }
    }
    console.log('PASS browser-smoke: all 15 app windows render');

    await cdp.eval(`document.querySelector('#spotlight-button').click()`);
    await cdp.eval(`(() => { const i = document.querySelector('#spotlight-input'); i.value = 'calc'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`); await delay(250);
    assert.ok(await cdp.eval(`document.querySelector('.spotlight-result.selected')?.textContent.includes('Calculator')`));
    await cdp.eval(`document.querySelector('#spotlight-input').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}))`); await delay(350);
    assert.ok(await cdp.eval(`OS.instances.has('calculator') && !OS.instances.get('calculator').el.hidden`));
    console.log('PASS browser-smoke: Spotlight fuzzy search and Enter launch');
    await cdp.eval(`(() => { const w=OS.instances.get('calculator').el; for (const key of ['7','+','8','=']) w.querySelector('[data-key="'+key+'"]').click(); })()`);
    assert.equal(await cdp.eval(`document.querySelector('.calculator-display').textContent`), '15');
    await cdp.eval(`OS.instances.get('calculator').el.querySelector('[data-key="AC"]').click()`);
    console.log('PASS browser-smoke: Calculator arithmetic and keyboard-ready controls');

    const before = await cdp.eval(`(() => { const e = OS.instances.get('calculator').el; Object.assign(e.style, {left:'400px',top:'100px'}); const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
    await mouse('mouseMoved', before.x + 150, before.y + 18); await mouse('mousePressed', before.x + 150, before.y + 18); await mouse('mouseMoved', before.x + 250, before.y + 78, { buttons: 1 }); await mouse('mouseReleased', before.x + 250, before.y + 78); await delay(450);
    const dragged = await cdp.eval(`(() => { const r = OS.instances.get('calculator').el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
    assert.ok(Math.abs(dragged.x - before.x - 100) < 3 && Math.abs(dragged.y - before.y - 60) < 3, `drag mismatch ${JSON.stringify({before,dragged})}`);
    await mouse('mouseMoved', dragged.x + dragged.w - 6, dragged.y + dragged.h - 6); await mouse('mousePressed', dragged.x + dragged.w - 6, dragged.y + dragged.h - 6); await mouse('mouseMoved', dragged.x + dragged.w + 70, dragged.y + dragged.h + 45, { buttons: 1 }); await mouse('mouseReleased', dragged.x + dragged.w + 70, dragged.y + dragged.h + 45); await delay(450);
    const resized = await cdp.eval(`(() => { const r = OS.instances.get('calculator').el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
    assert.ok(resized.w > dragged.w + 50 && resized.h > dragged.h + 30, `resize mismatch ${JSON.stringify({dragged,resized})}`);
    for (const dir of ['n','s','e','w','ne','nw','se','sw']) {
      const start = await cdp.eval(`(() => { const e=OS.instances.get('calculator').el; Object.assign(e.style,{left:'400px',top:'100px',width:'430px',height:'430px'}); const r=e.getBoundingClientRect(); const h=e.querySelector('[data-dir="${dir}"]').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,hx:h.x+h.width/2,hy:h.y+h.height/2}; })()`);
      let {hx,hy} = start;
      if (dir.length === 2) { hx = start.x + (dir.includes('w') ? 6 : start.w - 6); hy = start.y + (dir.includes('n') ? 6 : start.h - 6); }
      else { hx = dir === 'e' ? start.x + start.w - 4 : dir === 'w' ? start.x + 4 : start.x + start.w / 2; hy = dir === 's' ? start.y + start.h - 4 : dir === 'n' ? start.y + 4 : start.y + start.h / 2; }
      const dx = dir.includes('w') ? -22 : dir.includes('e') ? 22 : 0, dy = dir.includes('n') ? -22 : dir.includes('s') ? 22 : 0;
      await mouse('mouseMoved',hx,hy); await mouse('mousePressed',hx,hy); await mouse('mouseMoved',hx+dx,hy+dy,{buttons:1}); await mouse('mouseReleased',hx+dx,hy+dy); await delay(80);
      const end = await cdp.eval(`(() => { const r=OS.instances.get('calculator').el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
      if (dir.includes('e')) assert.ok(end.w > start.w + 15, `${dir} east resize`);
      if (dir.includes('w')) assert.ok(end.w > start.w + 15 && end.x < start.x, `${dir} west resize`);
      if (dir.includes('s')) assert.ok(end.h > start.h + 15, `${dir} south resize ${JSON.stringify({start,end})}`);
      if (dir.includes('n')) assert.ok(end.h > start.h + 15 && end.y < start.y, `${dir} north resize`);
    }
    console.log('PASS browser-smoke: all eight resize directions');
    await cdp.eval(`OS.instances.get('calculator').el.querySelector('.traffic-light.minimize').click()`); await delay(420);
    assert.equal(await cdp.eval(`OS.instances.get('calculator').el.hidden`), true);
    await cdp.eval(`document.querySelector('.dock-item[data-app="calculator"]').click()`); await delay(350);
    assert.equal(await cdp.eval(`OS.instances.get('calculator').el.hidden`), false);
    await cdp.eval(`OS.instances.get('calculator').el.querySelector('.traffic-light.maximize').click()`); await delay(150);
    assert.equal(await cdp.eval(`OS.instances.get('calculator').el.classList.contains('maximized')`), true);
    await cdp.eval(`OS.instances.get('calculator').el.querySelector('.traffic-light.maximize').click()`);
    console.log('PASS browser-smoke: pointer drag, southeast resize, minimize/restore, maximize/zoom');

    await cdp.eval(`OS.openApp('notes')`); await delay(250);
    await cdp.eval(`(() => { const e = document.querySelector('.window[data-app="notes"] .note-editor'); e.value = 'OpenOS browser persistence probe\\nThis note should survive reload.'; e.dispatchEvent(new Event('input', {bubbles:true})); })()`); await delay(1100);
    await cdp.eval(`OS.openApp('settings')`); await delay(250); await cdp.eval(`document.querySelector('.window[data-app="settings"] [data-theme="dark"]').click()`); await delay(800);
    assert.equal(await cdp.eval(`document.body.classList.contains('theme-dark')`), true);
    await cdp.eval(`document.querySelector('.window[data-app="settings"] [data-section="wallpaper"]').click()`); await delay(100);
    await cdp.eval(`document.querySelector('.window[data-app="settings"] [data-wallpaper="dusk"]').click()`); await delay(500);
    assert.equal(await cdp.eval(`document.body.classList.contains('wallpaper-dusk')`), true);
    await navigate();
    assert.equal(await cdp.eval(`document.body.classList.contains('theme-dark')`), true);
    assert.equal(await cdp.eval(`document.body.classList.contains('wallpaper-dusk')`), true);
    assert.ok(await cdp.eval(`OS.state.notes.some(n => n.body.includes('OpenOS browser persistence probe'))`));
    assert.ok(await cdp.eval(`OS.instances.has('calculator') && OS.instances.has('notes') && OS.instances.has('settings')`));
    assert.equal(await cdp.eval(`OS.instances.get('calculator').el.hidden`), false);
    console.log('PASS browser-smoke: theme, notes, open windows, and layout survive full reload');

    await cdp.eval(`(async () => { OS.state.settings.theme = 'light'; OS.state.settings.wallpaper = 'aurora'; OS.applySettings(); OS.state.notes = OS.state.notes.filter(n => !n.body.includes('OpenOS browser persistence probe')); if (!OS.state.notes.length) OS.state.notes.push({id:'welcome',title:'Welcome to Notes',body:'A quiet place for your thoughts.\\n\\nYour notes are saved automatically on the server.',updatedAt:new Date().toISOString()}); delete OS.state.preferences.apiProbe; for (const id of [...OS.instances.keys()]) if (id !== 'finder') OS.closeApp(id); await OS.save(true); })()`); await delay(500);
    await navigate(); await cdp.eval(`OS.focusApp('finder')`); await delay(900);
    const finalShot = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/opencode/openos-kimi-final.png', Buffer.from(finalShot.data, 'base64'));
    const meaningfulErrors = cdp.errors.filter(e => !e.includes('favicon'));
    assert.deepEqual(meaningfulErrors, [], `Browser exceptions: ${meaningfulErrors.join('\n')}`);
    console.log('PASS browser-smoke: no uncaught browser exceptions; screenshots saved in /tmp/opencode');
  } finally { cdp.close(); await fetch(`${devtools}/json/close/${target.id}`); }
})().catch(error => { console.error(error); process.exitCode = 1; });
