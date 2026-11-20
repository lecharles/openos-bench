'use strict';
/* OpenOS E2E smoke + probe harness. Run: node tests/smoke.cjs [port] */
const puppeteer = require('/usr/lib/node_modules/puppeteer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = process.argv[2] || '4599';
const URL = `http://localhost:${PORT}`;
const SHOTS = '/tmp/openos-shots';
fs.mkdirSync(SHOTS, { recursive: true });

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'openos-data-'));
const srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT, OPENOS_DATA_DIR: DATA_DIR }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(d));
srv.stderr.on('data', (d) => process.stdout.write('[srv] ' + d));
const waitServer = () => new Promise((res, rej) => {
  const t0 = Date.now();
  const tick = () => http.get(URL + '/health', (r) => { r.resume(); res(); }).on('error', () => (Date.now() - t0 > 8000 ? rej(new Error('server up timeout')) : setTimeout(tick, 200)));
  tick();
});

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rclick(page, sel, button = 'left', tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const h = await page.$(sel);
      if (!h) { await sleep(250); continue; }
      const box = await h.boundingBox();
      if (!box || box.width < 2 || box.height < 2) { await sleep(250); continue; }
      await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20), { button });
      return true;
    } catch (e) { await sleep(250); }
  }
  throw new Error('rclick failed: ' + sel);
}

(async () => {
  await waitServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', async (d) => { await d.accept(); });

  console.log('\n== boot ==');
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#desktop-root.on', { timeout: 15000 });
  await page.waitForSelector('.window[data-app="finder"]', { timeout: 10000 });
  ok('desktop booted', true);
  ok('menubar rendered', await page.$('#mb-left .mb-item.logo') !== null);
  ok('menubar clock ticking', /AM|PM/.test(await page.$eval('#mb-clock', (n) => n.textContent)));
  ok('dock rendered', (await page.$$('#dock .dock-item')).length >= 12);
  ok('desktop icons rendered', (await page.$$('#desktop-icons .desk-icon')).length >= 2);
  ok('wallpaper applied', await page.$eval('#wallpaper', (n) => !!n.dataset.wp));

  console.log('\n== apps render (15) ==');
  const APP_IDS = ['finder', 'notes', 'calendar', 'weather', 'calculator', 'preview', 'trash', 'settings', 'clock', 'contacts', 'music', 'mail', 'terminal', 'photos', 'textedit'];
  for (const id of APP_IDS) {
    await page.evaluate((id) => window.OpenOS.launch(id, { forceNew: true }), id);
    try {
      await page.waitForSelector(`.window[data-app="${id}"]`, { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 350));
      const info = await page.$eval(`.window[data-app="${id}"] .win-content`, (n) => ({
        kids: n.querySelectorAll('*').length,
        text: (n.textContent || '').trim().length,
      }));
      ok(`app renders: ${id}`, info.kids > 6 && info.text > 0, JSON.stringify(info));
    } catch (e) {
      ok(`app renders: ${id}`, false, 'timeout');
    }
  }
  await page.screenshot({ path: `${SHOTS}/01-all-apps.png` });

  // close all but one finder
  await page.evaluate(() => {
    const ws = window.OpenOS.wm.allWindows();
    const keep = ws.find((w) => w.appId === 'finder');
    for (const w of ws) if (w !== keep) window.OpenOS.wm.closeWindow(w, true);
    window.OpenOS.wm.focusWindow(keep);
  });

  console.log('\n== window manager probes ==');
  const box1 = await page.$eval('.window[data-app="finder"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  // drag
  await page.mouse.move(box1.x + 200, box1.y + 16);
  await page.mouse.down();
  await page.mouse.move(box1.x + 320, box1.y + 130, { steps: 12 });
  await page.mouse.up();
  const box2 = await page.$eval('.window[data-app="finder"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  ok('drag moves window', Math.abs(box2.x - box1.x - 120) < 6 && Math.abs(box2.y - box1.y - 114) < 6, JSON.stringify([box1, box2]));
  // resize SE
  await page.mouse.move(box2.x + box2.w - 2, box2.y + box2.h - 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.w + 140, box2.y + box2.h + 90, { steps: 10 });
  await page.mouse.up();
  const box3 = await page.$eval('.window[data-app="finder"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  ok('resize SE corner', Math.abs(box3.w - box2.w - 140) < 8 && Math.abs(box3.h - box2.h - 90) < 8, JSON.stringify([box2, box3]));
  // resize N
  await page.mouse.move(box3.x + box3.w / 2, box3.y + 2);
  await page.mouse.down();
  await page.mouse.move(box3.x + box3.w / 2, box3.y - 60, { steps: 8 });
  await page.mouse.up();
  const box4 = await page.$eval('.window[data-app="finder"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  ok('resize N edge', Math.abs(box4.h - box3.h - 60) < 8 && Math.abs(box4.y - box3.y + 60) < 8, JSON.stringify([box3, box4]));
  // traffic lights: minimize
  await page.click('.window[data-app="finder"] .tl.min');
  await new Promise((r) => setTimeout(r, 600));
  ok('minimize hides window', await page.$eval('.window[data-app="finder"]', (n) => n.style.visibility === 'hidden'));
  // restore via dock
  await page.click('[data-testid="dock-finder"]');
  await new Promise((r) => setTimeout(r, 500));
  ok('dock restores minimized', await page.$eval('.window[data-app="finder"]', (n) => n.style.visibility !== 'hidden'));
  // maximize
  await page.click('.window[data-app="finder"] .tl.max');
  await new Promise((r) => setTimeout(r, 400));
  const maxed = await page.$eval('.window[data-app="finder"]', (n) => { const r = n.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  ok('zoom maximizes', maxed.w > 1400, JSON.stringify(maxed));
  await page.click('.window[data-app="finder"] .tl.max');
  await new Promise((r) => setTimeout(r, 400));
  // z-order
  await page.evaluate(() => window.OpenOS.launch('notes'));
  await new Promise((r) => setTimeout(r, 300));
  await page.mouse.click(box4.x + box4.w - 30, box4.y + box4.h - 30);
  await new Promise((r) => setTimeout(r, 200));
  const zok = await page.evaluate(() => {
    const ws = window.OpenOS.wm.allWindows();
    const f = ws.find((w) => w.appId === 'finder'), n = ws.find((w) => w.appId === 'notes');
    return f.z > n.z && document.querySelector('.window[data-app="finder"]').classList.contains('focused');
  });
  ok('focus z-ordering', zok);
  // close
  await page.click('.window[data-app="notes"] .tl.close');
  await new Promise((r) => setTimeout(r, 350));
  ok('close removes window', await page.$('.window[data-app="notes"]') === null);

  console.log('\n== spotlight ==');
  await page.keyboard.down('Control');
  await page.keyboard.press('Space');
  await page.keyboard.up('Control');
  await page.waitForSelector('#spotlight[data-open="true"]', { timeout: 3000 });
  ok('⌘/ctrl-space opens spotlight', true);
  await page.type('#spotlight-input', 'wethr'); // fuzzy!
  await new Promise((r) => setTimeout(r, 250));
  const first = await page.$eval('#spotlight-results .sp-row', (n) => n.dataset.app).catch(() => null);
  ok('fuzzy match "wethr" → weather', first === 'weather', String(first));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.window[data-app="weather"]', { timeout: 4000 });
  ok('enter launches app', true);
  await page.keyboard.down('Control'); await page.keyboard.press('Space'); await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.press('Escape');
  ok('escape closes spotlight', await page.$eval('#spotlight', (n) => n.dataset.open === 'false'));

  console.log('\n== finder: rename / trash / restore ==');
  await page.evaluate(() => {
    const w = window.OpenOS.wm.allWindows().find((x) => x.appId === 'finder');
    window.OpenOS.wm.focusWindow(w);
    w.api._finder.navigate('Desktop');
  });
  await page.waitForSelector('.window[data-app="finder"] .f-item', { timeout: 5000 });
  const firstName = await page.$eval('.window[data-app="finder"] .f-item', (n) => n.dataset.name);
  await rclick(page, '.window[data-app="finder"] .f-item', 'right');
  await page.waitForSelector('#context-menu[data-open="true"] .mi', { timeout: 3000 });
  const menuHas = await page.$$eval('#context-menu .mi', (ns) => ns.map((n) => n.textContent));
  ok('finder context menu', menuHas.some((t) => t.includes('Rename')) && menuHas.some((t) => t.includes('Move to Trash')), JSON.stringify(menuHas));
  await page.evaluate(() => { [...document.querySelectorAll('#context-menu .mi')].find((n) => n.textContent.includes('Rename')).dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await page.waitForSelector('.rename-input', { timeout: 3000 });
  await page.click('.rename-input');
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.type('.rename-input', 'Renamed-Probe.txt');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 700));
  const renamed = await page.evaluate(async (oldName) => {
    const l = await (await fetch('/api/fs/list?path=Desktop')).json();
    return { has: l.entries.some((e) => e.name === 'Renamed-Probe.txt'), old: l.entries.some((e) => e.name === oldName) };
  }, firstName);
  ok('rename persists on server', renamed.has && !renamed.old, JSON.stringify(renamed));

  // trash it
  await rclick(page, '.window[data-app="finder"] .f-item[data-name="Renamed-Probe.txt"]', 'right');
  await page.waitForSelector('#context-menu[data-open="true"]', { timeout: 3000 });
  await page.evaluate(() => { [...document.querySelectorAll('#context-menu .mi')].find((n) => n.textContent.includes('Move to Trash')).dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 800));
  const inTrash = await page.evaluate(async () => {
    const t = await (await fetch('/api/fs/list?path=.Trash')).json();
    const d = await (await fetch('/api/fs/list?path=Desktop')).json();
    return { t: t.entries.some((e) => e.name === 'Renamed-Probe.txt'), d: d.entries.some((e) => e.name === 'Renamed-Probe.txt') };
  });
  ok('move to trash works', inTrash.t && !inTrash.d, JSON.stringify(inTrash));
  // restore from Trash app
  await page.evaluate(() => window.OpenOS.launch('trash'));
  await page.waitForSelector('.tr-row', { timeout: 4000 });
  await rclick(page, '.tr-row', 'right');
  await page.waitForSelector('#context-menu[data-open="true"]', { timeout: 3000 });
  await page.evaluate(() => { [...document.querySelectorAll('#context-menu .mi')].find((n) => n.textContent.includes('Put Back')).dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 800));
  const restored = await page.evaluate(async () => {
    const d = await (await fetch('/api/fs/list?path=Desktop')).json();
    return d.entries.some((e) => e.name === 'Renamed-Probe.txt');
  });
  ok('trash restore puts back', restored);
  // rename back for tidiness
  await page.evaluate(async (nm) => { await fetch('/api/fs/rename', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: 'Desktop/Renamed-Probe.txt', name: nm }) }); }, firstName);

  console.log('\n== list view + breadcrumbs ==');
  await page.evaluate(() => { const w = window.OpenOS.wm.allWindows().find((x) => x.appId === 'finder'); window.OpenOS.wm.focusWindow(w); w.api._finder.setView('list'); });
  await new Promise((r) => setTimeout(r, 300));
  ok('list view rows', (await page.$$('.f-list-row')).length >= 2);
  ok('breadcrumbs present', (await page.$$('.f-crumb .cr')).length >= 2);
  await page.evaluate(() => { const w = window.OpenOS.wm.allWindows().find((x) => x.appId === 'finder'); w.api._finder.navigate('Documents'); });
  await new Promise((r) => setTimeout(r, 400));
  ok('breadcrumb depth', await page.$eval('.f-crumb', (n) => n.textContent.includes('OpenOS') && n.textContent.includes('Documents')));

  console.log('\n== theme + persistence across reload ==');
  await page.evaluate(() => window.OpenOS.launch('settings'));
  await page.waitForSelector('.set-body .os-seg button', { timeout: 4000 });
  const beforeTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.evaluate(() => { [...document.querySelectorAll('.set-body .os-seg button')].find((b) => b.textContent === (document.documentElement.dataset.theme === 'dark' ? 'Light' : 'Dark')).click(); });
  await new Promise((r) => setTimeout(r, 400));
  const afterTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  ok('theme toggles', beforeTheme !== afterTheme, `${beforeTheme}→${afterTheme}`);
  // wallpaper change persists too
  await page.evaluate(() => { const t = document.querySelector('.wp-thumb[data-wp="ocean"]'); if (t) t.click(); });
  await new Promise((r) => setTimeout(r, 500));
  const wpSet = await page.$eval('#wallpaper', (n) => n.dataset.wp);
  ok('wallpaper switches', wpSet === 'ocean', wpSet);
  await page.screenshot({ path: `${SHOTS}/02-themed.png` });

  const winsBefore = await page.evaluate(() => window.OpenOS.wm.serializeLayout().map((w) => w.appId).sort());
  await new Promise((r) => setTimeout(r, 900)); // allow state flush
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('#desktop-root.on', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1400));
  const after = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    wp: document.getElementById('wallpaper').dataset.wp,
    wins: window.OpenOS.wm.serializeLayout().map((w) => w.appId).sort(),
  }));
  ok('theme persists after reload', after.theme === afterTheme, `${after.theme}`);
  ok('wallpaper persists after reload', after.wp === 'ocean', after.wp);
  ok('window layout persists after reload', JSON.stringify(after.wins) === JSON.stringify(winsBefore), `${winsBefore} vs ${after.wins}`);

  console.log('\n== dock ==');
  const dockBox = await page.$eval('[data-testid="dock-notes"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 10 }; });
  await page.mouse.move(dockBox.x, dockBox.y);
  await new Promise((r) => setTimeout(r, 250));
  const scale = await page.$eval('[data-testid="dock-notes"]', (n) => parseFloat(getComputedStyle(n).getPropertyValue('--scale') || n.style.getPropertyValue('--scale')));
  ok('dock magnification', scale > 1.05, String(scale));
  await page.mouse.move(10, 10);
  const runningDots = await page.$$eval('.dock-item.running', (n) => n.length);
  ok('running indicators', runningDots >= 1, String(runningDots));

  console.log('\n== terminal sandbox ==');
  await page.evaluate(() => window.OpenOS.launch('terminal', { forceNew: true }));
  await page.waitForSelector('.term input', { timeout: 4000 });
  await page.click('.term input');
  await page.type('.term input', 'cat /etc/passwd');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 500));
  const termOut = await page.$eval('.term-out', (n) => n.textContent);
  ok('terminal blocks host paths', !termOut.includes('root:'), termOut.slice(-80));
  await page.type('.term input', 'ls Pictures');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));
  ok('terminal lists vfs', (await page.$eval('.term-out', (n) => n.textContent)).includes('Aurora-Borealis.png'));

  console.log('\n== security probe ==');
  const codes = await page.evaluate(async () => {
    const r = {};
    for (const p of ['/api/fs/list?path=/etc/shadow', '/api/fs/read?path=/etc/shadow', '/api/fs/raw?path=/etc/shadow', '/api/fs/list?path=..%2F..%2Fetc']) {
      r[p] = (await fetch(p)).status;
    }
    return r;
  });
  ok('all /etc/shadow probes 403', Object.values(codes).every((c) => c === 403), JSON.stringify(codes));

  console.log('\n== final screenshots ==');
  await page.evaluate(() => {
    for (const w of window.OpenOS.wm.allWindows()) window.OpenOS.wm.closeWindow(w, true);
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    window.OpenOS.launch('finder', { params: { path: 'Pictures' } });
    window.OpenOS.launch('music');
    window.OpenOS.launch('calendar');
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${SHOTS}/03-desktop-dark.png` });
  console.log('screenshots →', SHOTS);

  console.log(`\n== console errors: ${errors.length} ==`);
  for (const e of errors.slice(0, 25)) console.log('  !', e);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await browser.close();
  srv.kill();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); srv.kill(); process.exit(2); });
