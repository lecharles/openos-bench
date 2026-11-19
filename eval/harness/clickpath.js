#!/usr/bin/env node
'use strict';
/*
 * OpenOS Bench evaluator agent - click path (puppeteer, structural tier).
 * Implements docs/EVALUATOR.md: walks docs/DEMO.md steps generically against
 * ANY run's URL, no per-app selectors, and grades the 100-pt rubric axes
 * deterministically from observable signals. Vision tier is separate.
 *   node clickpath.js <url> <out-dir> [--viewport 1600x1000]
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const url = process.argv[2] || 'http://localhost:3000/';
const out = process.argv[3] || '/tmp/clickpath';
const [vw, vh] = ((process.argv.find(a => a.startsWith('--viewport')) || '--viewport=1600x1000').split('=')[1]).split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const report = { url, when: new Date().toISOString(), steps: {}, axes: {}, screenshots: [] };
const shot = async (page, name) => { const p = path.join(out, name); await page.screenshot({ path: p }); report.screenshots.push(name); return p; };
const diff = (a, b) => md5(a) !== md5(b);
const w = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh });
  const t0 = Date.now();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await w(4000);
  const bootMs = Date.now() - t0;
  const s1 = await shot(page, 'step01-boot.png');
  const dom = await page.evaluate(() => document.querySelectorAll('body *').length);
  const geo = await page.evaluate(() => {
    const r = e => e.getBoundingClientRect();
    const all = Array.from(document.querySelectorAll('body *'));
    const top = all.filter(e => r(e).top < 5 && r(e).width > innerWidth * 0.4).length;
    const bot = all.filter(e => Math.abs(r(e).bottom - innerHeight) < 100 && r(e).width > innerWidth * 0.25 && r(e).height < 110).length;
    const icons = all.filter(e => r(e).width < 96 && r(e).width > 24 && r(e).height < 96 && r(e).height > 24).length;
    return { top, bot, icons };
  });
  report.steps['1-first-sight'] = { dom, bootMs, shellTop: geo.top > 0, shellBottom: geo.bot > 0, iconCount: geo.icons };

  // 2: open an app from dock geometry
  await page.mouse.click(Math.round(vw * 0.5), vh - 40); await w(1800);
  const s2 = await shot(page, 'step02-app-open.png');
  report.steps['2-app-open'] = { frameChanged: diff(s1, s2) };

  // 3: drag (assume window centered after open)
  const before = await page.evaluate(() => { const w = document.querySelector('[style*="left"], [class*=window]'); return w ? w.getBoundingClientRect().left : null; });
  await page.mouse.move(vw / 2, vh / 2 - 160); await page.mouse.down(); await page.mouse.move(vw / 2 + 180, vh / 2 - 80, { steps: 12 }); await page.mouse.up();
  await w(900);
  const after = await page.evaluate(() => { const w = document.querySelector('[style*="left"], [class*=window]'); return w ? w.getBoundingClientRect().left : null; });
  const s3 = await shot(page, 'step03-after-drag.png');
  report.steps['3-drag'] = { measurable: before !== null, moved: before !== null ? Math.abs((after || before) - before) > 20 : report.steps['2-app-open'].frameChanged };

  // 4: spotlight attempt (both chords) + type + screenshot
  await page.keyboard.down('Control'); await page.keyboard.press('Space'); await page.keyboard.up('Control');
  await page.keyboard.down('Meta'); await page.keyboard.press('Space'); await page.keyboard.up('Meta');
  await w(700);
  await page.keyboard.type('not', { delay: 70 });
  const s4 = await shot(page, 'step04-spotlight.png');
  report.steps['5-spotlight'] = { frameChanged: diff(s3, s4) };

  // 5: launch via Enter
  await page.keyboard.press('Enter'); await w(1500);
  const s5 = await shot(page, 'step05-launched.png');
  report.steps['6-spotlight-launch'] = { frameChanged: diff(s4, s5) };
  await page.keyboard.press('Escape');

  // 6: launchpad via F4
  await page.keyboard.press('F4'); await w(1200);
  const s6 = await shot(page, 'step06-launchpad.png');
  report.steps['4-launchpad'] = { frameChanged: diff(s5, s6) };
  await page.keyboard.press('Escape');

  // 7: context menu on desktop
  await page.mouse.click(Math.round(vw * 0.25), Math.round(vh * 0.3), { button: 'right' }); await w(800);
  const s7 = await shot(page, 'step07-context-menu.png');
  report.steps['7-context-menu'] = { frameChanged: diff(s6, s7) };
  await page.keyboard.press('Escape');

  // 8: persistence - type into first textarea anywhere, reload, check survives
  const typed = await page.evaluate(() => {
    const t = document.querySelector('textarea, [contenteditable="true"], input[type=text]');
    if (!t) return false;
    t.focus(); t.value = 'BENCH-PERSIST-7x9k'; t.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  await w(1200);
  await page.reload({ waitUntil: 'networkidle2' }); await w(3500);
  const survived = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('textarea, input, [class*=note], [id*=note]')).map(e => (e.value || '') + ' ' + (e.textContent || ''));
    return all.some(v => v.includes('BENCH-PERSIST-7x9k'));
  });
  const s8 = await shot(page, 'step08-after-reload.png');
  report.steps['8-persistence'] = { typed, survived };

  // 9: reload timing + error count
  report.steps['9-performance'] = { bootMs, pageErrors: errors.length, sampleShotBytes: fs.statSync(s1).size };

  // ---- rubric axes (deterministic, structural tier) ----
  const st = report.steps;
  const shellOK = st['1-first-sight'].shellTop && st['1-first-sight'].shellBottom;
  const visual = (shellOK ? 3 : 1) + (st['7-context-menu'].frameChanged ? 1 : 0) + (st['4-launchpad'].frameChanged ? 1 : 0);
  const apps = (st['2-app-open'].frameChanged ? 3 : 1) + (st['3-drag'].moved ? 1 : 0) + (st['6-spotlight-launch'].frameChanged ? 1 : 0);
  const perf = 3 + (st['9-performance'].pageErrors === 0 ? 1 : 0) + (st['8-persistence'].survived ? 1 : 0);
  const scale = v => Math.min(5, Math.max(1, v));
  report.axes = {
    'visual-fidelity-30': { score5: scale(visual), note: 'shell regions + overlay/menu/launchpad response frames; texture/blur/animation feel requires vision tier' },
    'app-functionality-30': { score5: scale(apps), note: 'app-open, drag response, spotlight launch' },
    'agent-vps-apps-25': { score5: 0, note: 'not measurable structurally - vision tier / operator' },
    'performance-persistence-15': { score5: scale(perf), note: `boot ${bootMs}ms, errors ${errors.length}, typed-text survives reload: ${st['8-persistence'].survived}` },
  };
  // provisional /100: weighted over the three measurable axes, scaled 5->full
  const meas = [['visual-fidelity-30', 30], ['app-functionality-30', 30], ['performance-persistence-15', 15]];
  let got = 0, poss = 0;
  for (const [k, weight] of meas) { got += report.axes[k].score5 / 5 * weight; poss += weight; }
  report.provisionalScore100 = { value: Math.round(100 * got / poss), basis: '75pt measurable axes x20/15 structural signal', excludes: 'agent/VPS apps 25 + full visual 15/30 - vision tier pending' };
  fs.writeFileSync(path.join(out, 'evaluator.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.axes, null, 1));
  console.log('PROVISIONAL /100:', report.provisionalScore100.value, '->', path.join(out, 'evaluator.json'));
  await browser.close();
})().catch(e => { report.fatal = e.message; fs.writeFileSync(path.join(out, 'evaluator.json'), JSON.stringify(report, null, 2)); console.error('FATAL', e.message); });
