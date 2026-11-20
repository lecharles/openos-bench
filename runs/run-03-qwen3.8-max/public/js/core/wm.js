import { el, clamp } from './util.js';
import { State, set as setState } from './state.js';

const layer = () => document.getElementById('windows-layer');
const dockWrap = () => document.getElementById('dock-wrap');

const windows = new Map();
let widSeq = 1;
let zTop = 100;
let focusedWin = null;
let dockIconProvider = () => null;

export function setDockIconProvider(fn) { dockIconProvider = fn; }
export function allWindows() { return Array.from(windows.values()); }
export function windowsForApp(appId) { return allWindows().filter((w) => w.appId === appId); }
export function focusedWindow() { return focusedWin; }
export function getWindow(id) { return windows.get(id); }

const listeners = new Set();
export function onWM(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(type, win) { for (const fn of listeners) { try { fn(type, win); } catch (e) { console.warn(e); } } }

export function workArea() {
  const l = layer().getBoundingClientRect();
  const d = dockWrap().getBoundingClientRect();
  return { w: l.width, h: l.height - (d.height + 6), left: 0, top: 0, layerTop: l.top };
}

const GLYPH_CLOSE = '<svg viewBox="0 0 12 12"><path d="M3.4 3.4l5.2 5.2M8.6 3.4l-5.2 5.2"/></svg>';
const GLYPH_MIN = '<svg viewBox="0 0 12 12"><path d="M2.6 6h6.8"/></svg>';
const GLYPH_MAX = '<svg viewBox="0 0 12 12"><path d="M3 6.2V3h3.2M9 5.8V9H5.8"/></svg>';

/**
 * createWindow(appDef, opts) → win
 * opts: {x,y,w,h, params, title, minimized, maximized, noAnim, z}
 */
export function createWindow(appDef, opts = {}) {
  const wa = workArea();
  const def = appDef.size || {};
  const w = Math.min(opts.w || def.w || 780, wa.w - 24);
  const h = Math.min(opts.h || def.h || 520, wa.h - 24);
  const cascade = (widSeq % 8) * 26;
  const win = {
    id: widSeq++,
    appId: appDef.id,
    app: appDef,
    params: opts.params || {},
    x: opts.x !== undefined ? opts.x : clamp((wa.w - w) / 2 + cascade - 60, 8, Math.max(8, wa.w - w - 8)),
    y: opts.y !== undefined ? opts.y : clamp((wa.h - h) / 2.4 + cascade - 40, 4, Math.max(4, wa.h - h - 4)),
    w, h,
    z: opts.z || ++zTop,
    minimized: false,
    maximized: false,
    title: opts.title || appDef.name,
    closing: false,
  };

  const node = el('section', {
    class: 'window' + (opts.noAnim ? '' : ' opening'),
    dataset: { app: appDef.id, wid: String(win.id) },
    role: 'dialog', 'aria-label': win.title,
  });
  node.style.cssText = `left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;z-index:${win.z}`;

  const titlebar = el('header', { class: 'titlebar', 'data-testid': 'titlebar' },
    el('div', { class: 'traffic-lights' },
      el('button', { class: 'tl close', 'data-testid': 'tl-close', 'aria-label': 'Close', html: GLYPH_CLOSE }),
      el('button', { class: 'tl min', 'data-testid': 'tl-min', 'aria-label': 'Minimize', html: GLYPH_MIN }),
      el('button', { class: 'tl max', 'data-testid': 'tl-max', 'aria-label': 'Zoom', html: GLYPH_MAX })),
    el('h1', { class: 'win-title', text: win.title }));
  const content = el('main', { class: 'win-content', 'data-testid': 'win-content' });
  node.append(titlebar, content);
  for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
    node.append(el('div', { class: 'rz ' + dir, dataset: { dir }, 'data-testid': 'rz-' + dir }));
  }
  layer().append(node);
  win.el = node;
  win.contentEl = content;
  win.titleEl = titlebar.querySelector('.win-title');

  // ---- API handed to apps ----
  win.api = {
    id: win.id, app: appDef, params: win.params, el: node, contentEl: content,
    get title() { return win.title; },
    setTitle: (t) => { win.title = t; win.titleEl.textContent = t; node.setAttribute('aria-label', t); saveLayout(); },
    close: () => closeWindow(win),
    focus: () => focusWindow(win),
    minimize: () => minimizeWindow(win),
    toggleMax: () => toggleMax(win),
    setSize: (ww, hh) => { win.w = ww; win.h = hh; node.style.width = ww + 'px'; node.style.height = hh + 'px'; saveLayout(); },
  };

  // ---- interactions ----
  titlebar.addEventListener('mousedown', (e) => startDrag(e, win));
  titlebar.addEventListener('dblclick', (e) => { if (!e.target.closest('.tl')) toggleMax(win); });
  titlebar.querySelector('.tl.close').addEventListener('click', () => closeWindow(win));
  titlebar.querySelector('.tl.min').addEventListener('click', () => minimizeWindow(win));
  titlebar.querySelector('.tl.max').addEventListener('click', () => toggleMax(win));
  node.querySelectorAll('.rz').forEach((rz) => rz.addEventListener('mousedown', (e) => startResize(e, win, rz.dataset.dir)));
  node.addEventListener('mousedown', () => { if (focusedWin !== win) focusWindow(win); }, true);

  windows.set(win.id, win);

  // mount app UI
  try {
    appDef.mount(content, win.api);
  } catch (err) {
    console.error('app mount failed', appDef.id, err);
    content.innerHTML = `<div class="empty-hint"><b>${appDef.name} failed to start</b><span>${String(err && err.message || err)}</span></div>`;
  }

  if (opts.maximized) toggleMax(win, true);
  if (opts.minimized) { minimizeWindow(win, true); } else focusWindow(win);
  if (opts.noAnim) node.classList.remove('opening');
  emit('open', win);
  saveLayout();
  return win;
}

export function focusWindow(win) {
  if (!win || win.closing) return;
  if (win.minimized) restoreWindow(win);
  if (focusedWin && focusedWin !== win) focusedWin.el.classList.remove('focused');
  focusedWin = win;
  win.z = ++zTop;
  win.el.style.zIndex = win.z;
  win.el.classList.add('focused');
  setState('layout.focusedApp', win.appId);
  emit('focus', win);
}

export function closeWindow(win, silent = false) {
  if (win.closing) return;
  win.closing = true;
  try { win.app.onclose && win.app.onclose(win.api); } catch (e) { console.warn(e); }
  if (win._synth) { try { win._synth.stop(); } catch {} }
  windows.delete(win.id);
  if (focusedWin === win) {
    focusedWin = null;
    const rest = allWindows().filter((x) => !x.minimized).sort((a, b) => a.z - b.z).pop();
    if (rest) focusWindow(rest); else emit('focus', null);
  }
  if (silent) { win.el.remove(); }
  else {
    win.el.classList.add('closing');
    setTimeout(() => win.el.remove(), 190);
  }
  emit('close', win);
  saveLayout();
}

export function minimizeWindow(win, instant = false) {
  if (win.minimized) return;
  win.minimized = true;
  const dock = dockIconProvider(win.appId);
  const lr = layer().getBoundingClientRect();
  const wr = win.el.getBoundingClientRect();
  let tx, ty;
  if (dock) { tx = dock.x - (wr.left + wr.width / 2); ty = dock.y - (wr.bottom); }
  else { tx = lr.width / 2 - (wr.left + wr.width / 2); ty = lr.height - wr.bottom; }
  const keyframes = [
    { transform: 'none', opacity: 1, filter: 'none' },
    { transform: `translate(${tx * 0.55}px, ${ty * 0.6}px) scale(.55,.5) skewX(-4deg)`, opacity: 0.75, offset: 0.55 },
    { transform: `translate(${tx}px, ${ty}px) scale(.06,.03)`, opacity: 0 },
  ];
  if (instant) {
    win.el.style.visibility = 'hidden';
    win._genie = null;
  } else {
    const anim = win.el.animate(keyframes, { duration: 430, easing: 'cubic-bezier(.5,.06,.6,.98)', fill: 'forwards' });
    win._genie = anim;
    anim.onfinish = () => { win.el.style.visibility = 'hidden'; };
  }
  if (focusedWin === win) {
    focusedWin = null;
    const rest = allWindows().filter((x) => !x.minimized && x !== win).sort((a, b) => a.z - b.z).pop();
    if (rest) focusWindow(rest); else emit('focus', null);
  }
  win.el.classList.remove('focused');
  emit('minimize', win);
  saveLayout();
}

export function restoreWindow(win) {
  if (!win.minimized) return;
  win.minimized = false;
  win.el.style.visibility = 'visible';
  if (win._genie) {
    win._genie.cancel(); win._genie = null;
  } else {
    const anim = win.el.animate([
      { transform: 'scale(.1,.06)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1.1)' });
    void anim;
  }
  focusWindow(win);
  emit('restore', win);
  saveLayout();
}

export function toggleMax(win, instant = false) {
  const wa = workArea();
  if (!win.maximized) {
    win._preMax = { x: win.x, y: win.y, w: win.w, h: win.h };
    win.maximized = true;
    setRect(win, 0, 0, wa.w, wa.h, !instant);
  } else {
    win.maximized = false;
    const p = win._preMax || { x: 60, y: 40, w: 760, h: 500 };
    setRect(win, p.x, p.y, p.w, p.h, !instant);
  }
  saveLayout();
}

function setRect(win, x, y, w, h, animate) {
  win.x = x; win.y = y; win.w = w; win.h = h;
  const s = win.el.style;
  if (animate) {
    win.el.classList.add('anim-rect');
    requestAnimationFrame(() => { s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px'; });
    setTimeout(() => win.el.classList.remove('anim-rect'), 250);
  } else {
    s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px';
  }
}

// ---------------- drag ----------------
function startDrag(e, win) {
  if (e.button !== 0 || e.target.closest('.tl')) return;
  e.preventDefault();
  focusWindow(win);
  const wa = workArea();
  const startX = e.clientX, startY = e.clientY;
  const ox = win.x, oy = win.y;
  let unmaxed = false;
  const onMove = (ev) => {
    if (!unmaxed && win.maximized) {
      unmaxed = true;
      win.maximized = false;
      const p = win._preMax || { w: 760, h: 500 };
      const frac = clamp((startX - ox) / win.w, 0, 1);
      win.w = Math.min(p.w, wa.w - 24); win.h = p.h;
      win.x = ev.clientX - win.w * frac; win.y = ev.clientY - 19;
      setRect(win, win.x, win.y, win.w, win.h, false);
    }
    let nx = ox + (ev.clientX - startX);
    let ny = oy + (ev.clientY - startY);
    if (unmaxed) { nx = ev.clientX - win.w * clamp((startX - ox) / (win._preMax?.w || win.w), 0, 1); ny = ev.clientY - 19; }
    nx = clamp(nx, 120 - win.w, wa.w - 120);
    ny = clamp(ny, 0, wa.h - 38);
    win.x = nx; win.y = ny;
    win.el.style.left = nx + 'px';
    win.el.style.top = ny + 'px';
    updateSnapPreview(ev, win, wa);
  };
  const onUp = (ev) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    const snap = currentSnap(ev, win, wa);
    hideSnapPreview();
    if (snap) applySnap(win, snap, wa);
    saveLayout();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.body.style.cursor = 'grabbing';
}

function currentSnap(ev, win, wa) {
  if (ev.clientY <= wa.layerTop + 2) return 'max';
  if (ev.clientX <= 2) return 'left';
  if (ev.clientX >= innerWidth - 3) return 'right';
  return null;
}
function updateSnapPreview(ev, win, wa) {
  const pv = document.getElementById('snap-preview');
  const snap = currentSnap(ev, win, wa);
  if (!snap) { pv.classList.remove('on'); return; }
  pv.classList.add('on');
  const l = layer().getBoundingClientRect();
  if (snap === 'max') pv.style.cssText += `;left:6px;top:6px;width:${wa.w - 12}px;height:${wa.h - 6}px`;
  else if (snap === 'left') pv.style.cssText += `;left:6px;top:6px;width:${wa.w / 2 - 10}px;height:${wa.h - 12}px`;
  else pv.style.cssText += `;left:${wa.w / 2 + 4}px;top:6px;width:${wa.w / 2 - 10}px;height:${wa.h - 12}px`;
  void l;
}
function hideSnapPreview() { document.getElementById('snap-preview').classList.remove('on'); }
function applySnap(win, snap, wa) {
  if (snap === 'max') { if (!win.maximized) toggleMax(win); return; }
  if (win.maximized) toggleMax(win);
  const half = Math.floor(wa.w / 2);
  if (snap === 'left') setRect(win, 0, 0, half - 4, wa.h, true);
  else setRect(win, half + 4, 0, half - 4, wa.h, true);
}

// ---------------- resize ----------------
function startResize(e, win, dir) {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  focusWindow(win);
  if (win.maximized) toggleMax(win);
  const minW = win.app.minW || 340, minH = win.app.minH || 220;
  const sx = e.clientX, sy = e.clientY;
  const o = { x: win.x, y: win.y, w: win.w, h: win.h };
  const onMove = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    let { x, y, w, h } = o;
    if (dir.includes('e')) w = o.w + dx;
    if (dir.includes('s')) h = o.h + dy;
    if (dir.includes('w')) { w = o.w - dx; x = o.x + dx; }
    if (dir.includes('n')) { h = o.h - dy; y = o.y + dy; }
    if (w < minW) { if (dir.includes('w')) x -= (minW - w); w = minW; }
    if (h < minH) { if (dir.includes('n')) y -= (minH - h); h = minH; }
    y = Math.max(0, y);
    win.x = x; win.y = y; win.w = w; win.h = h;
    const s = win.el.style;
    s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveLayout();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ---------------- layout persistence ----------------
export function serializeLayout() {
  return allWindows()
    .filter((w) => !w.closing)
    .sort((a, b) => a.z - b.z)
    .map((w) => ({ appId: w.appId, x: Math.round(w.x), y: Math.round(w.y), w: Math.round(w.w), h: Math.round(w.h), z: w.z, minimized: w.minimized, maximized: w.maximized, params: w.params || {}, title: w.title }));
}
export function saveLayout(now = false) {
  setState('layout.windows', serializeLayout(), now);
}

export function restoreLayout(launchFn) {
  const saved = (State.data.layout && State.data.layout.windows) || [];
  const sorted = [...saved].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const s of sorted) {
    try {
      launchFn(s.appId, { params: s.params, x: s.x, y: s.y, w: s.w, h: s.h, z: s.z, minimized: s.minimized, maximized: s.maximized, noAnim: true, restore: true });
    } catch (e) { console.warn('restore failed for', s.appId, e); }
  }
}
