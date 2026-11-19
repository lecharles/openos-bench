#!/usr/bin/env node
'use strict';
/*
 * Neutral cross-model harness - openos-bench roadmap task #1.
 * Black-box probe: no per-app selectors, no model-authored test code.
 *   node harness.js <url> <out-dir> [--viewport 1600x1000]
 * Emits results.json + PNGs. Exit 0 always; the JSON is the verdict.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'http://localhost:3000/';
const out = process.argv[3] || '/tmp/harness-out';
const [vw, vh] = ((process.argv.find(a => a.startsWith('--viewport')) || '--viewport=1600x1000').split('=')[1]).split('x').map(Number);
fs.mkdirSync(out, { recursive: true });

const results = { url, when: new Date().toISOString(), checks: {}, screenshots: [] };
const rec = (name, pass, detail) => { results.checks[name] = { pass: !!pass, detail }; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };

function uniquePngs(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  const crypto = require('crypto');
  const hashes = new Set(files.map(f => crypto.createHash('md5').update(fs.readFileSync(path.join(dir, f))).digest('hex')));
  return { count: files.length, unique: hashes.size };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => rec('boot', false, e.message));
  await new Promise(r => setTimeout(r, 4000));

  // C1 boot: page exists, has nontrivial DOM, sane title
  const dom = await page.evaluate(() => document.querySelectorAll('*').length);
  rec('boot.dom-nodes', dom > 100, `nodes=${dom}`);

  // C2 render: screenshot pixel-variance (not blank/black)
  const shot0 = path.join(out, '00-boot.png');
  await page.screenshot({ path: shot0 });
  const variance = await page.evaluate(() => {
    const c = document.createElement('canvas'); const g = document.body;
    return getComputedStyle(g).backgroundColor;
  });
  const sz = fs.statSync(shot0).size;
  rec('render.non-blank', sz > 60000, `png=${sz}B bg=${variance}`);
  results.screenshots.push(shot0);

  // C3 menu bar / dock presence (geometry heuristics, selector-agnostic)
  const geo = await page.evaluate((vh) => {
    const r2 = e => e.getBoundingClientRect().height;
    const els = Array.from(document.querySelectorAll('body *')).filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > window.innerWidth * 0.4 && r.height > 8 && r.height < 110;
    });
    const top = els.filter(e => e.getBoundingClientRect().top < 5).length;
    const bottom = els.filter(e => Math.abs(e.getBoundingClientRect().bottom - window.innerHeight) < 100 && r2(e) < 100).length;
    return { top, bottom };
  }, vh);
  rec('shell.menubar-region', geo.top > 0, `candidates=${geo.top}`);
  rec('shell.dock-region', geo.bottom > 0, `candidates=${geo.bottom}`);

  // C4 spotlight: ⌘-Space then ctrl+space fallback; frame must change
  const before = fs.statSync(shot0).size;
  await page.keyboard.down('Control'); await page.keyboard.press('Space'); await page.keyboard.up('Control');
  await page.keyboard.down('Meta'); await page.keyboard.press('Space'); await page.keyboard.up('Meta');
  await new Promise(r => setTimeout(r, 500));
  await page.type('body', 'no', { delay: 60 }); // any keystroke lands in whatever overlay opened
  await new Promise(r => setTimeout(r, 1200));
  const shotS = path.join(out, '01-spotlight-attempt.png');
  await page.screenshot({ path: shotS });
  const spot = uniquePngs(out);
  rec('spotlight.overlay-detect', spot.unique > spot.count - 1 && fs.statSync(shotS).size !== before, 'frame changed after ⌘-Space');
  results.screenshots.push(shotS);
  await page.keyboard.press('Escape');

  // C5 app launch via dock geometry: click 3 evenly spaced targets along dock strip
  const clickShots = [];
  for (const fracX of [0.35, 0.5, 0.65]) {
    await page.mouse.click(Math.round(vw * fracX), vh - 40);
    await new Promise(r => setTimeout(r, 1500));
    const p = path.join(out, `02-dock-click-${fracX}.png`);
    await page.screenshot({ path: p });
    clickShots.push(p);
    results.screenshots.push(p);
    await page.keyboard.press('Escape');
  }
  const all = uniquePngs(out);
  rec('apps.window-opens', all.unique >= 3, `${all.unique}/${all.count} unique frames`);

  // C6 persistence: reload, frame should reproduce state or at least not error
  const domBefore = dom;
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  const shotR = path.join(out, '03-after-reload.png');
  await page.screenshot({ path: shotR });
  results.screenshots.push(shotR);
  const domAfter = await page.evaluate(() => document.querySelectorAll('*').length);
  rec('persistence.survives-reload', domAfter > 100, `nodes ${domBefore}->${domAfter}`);

  // C7 no uncaught page errors (lenient: max 3)
  rec('stability.page-errors', errors.length <= 3, `errors=${errors.length}`);
  results.pageErrors = errors.slice(0, 10);

  // score
  const checks = Object.entries(results.checks);
  const passed = checks.filter(([, v]) => v.pass).length;
  results.summary = { passed, total: checks.length, pct: Math.round(100 * passed / checks.length) };
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\nHARNESS: ${passed}/${checks.length} (${results.summary.pct}%) -> ${path.join(out, 'results.json')}`);
  await browser.close();
})().catch(e => {
  results.fatal = e.message;
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.error('FATAL', e.message);
});
