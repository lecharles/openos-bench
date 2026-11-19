/* Window manager — drag, 8-way resize, traffic lights, focus z-order,
 * open/close/minimize animations, layout persistence. */
import { getApp, hooks } from './registry.js';
import { layout } from './state.js';
import { bus } from './bus.js';

const MENUBAR_H = 28;
let zCounter = 100;
let idCounter = 0;
const wins = []; // open window records

export const wm = {
  windows: wins,
  focused: null,

  bounds() {
    const dockH = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-size')) || 52) + 34;
    return { top: MENUBAR_H, bottom: window.innerHeight - dockH, left: 0, right: window.innerWidth };
  },

  open(appId, opts = {}) {
    const def = getApp(appId);
    if (!def) { console.error('unknown app', appId); return null; }
    if (def.singleton) {
      const existing = wins.filter((w) => w.appId === appId);
      if (existing.length) {
        const win = existing[existing.length - 1];
        if (win.minimized) this.restore(win, true);
        this.focus(win);
        if (def.reopen && opts.payload) def.reopen(win, opts.payload);
        return win;
      }
    }
    const win = createWindow(appId, def, opts);
    wins.push(win);
    this.focus(win);
    if (!opts.noAnim) animateOpen(win);
    persist();
    bus.emit('wm:windows-changed', { count: wins.length });
    dockBounce(appId);
    return win;
  },

  focus(win) {
    if (!win || this.focused === win) { if (win) bringToFront(win); return; }
    if (win.minimized) return;
    for (const w of wins) w.el.classList.remove('active');
    win.el.classList.add('active');
    bringToFront(win);
    this.focused = win;
    bus.emit('wm:focus', win);
  },

  focusDesktop() {
    for (const w of wins) w.el.classList.remove('active');
    this.focused = null;
    bus.emit('wm:focus', null);
  },

  close(win) {
    const i = wins.indexOf(win);
    if (i === -1) return;
    if (win.onclose) { try { win.onclose(); } catch (e) { console.error(e); } }
    wins.splice(i, 1);
    if (this.focused === win) {
      this.focused = null;
      const next = wins.filter((w) => !w.minimized).sort((a, b) => a.el.style.zIndex - b.el.style.zIndex).pop();
      if (next) this.focus(next); else this.focusDesktop();
    }
    win.el.classList.add('closing');
    const anim = win.el.animate(
      [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }],
      { duration: 160, easing: 'cubic-bezier(.4,0,1,1)' }
    );
    anim.onfinish = () => { win.el.remove(); anim.cancel(); };
    persist();
    bus.emit('wm:windows-changed', { count: wins.length });
  },

  minimize(win) {
    if (win.minimized) return;
    win.minimized = true;
    const rect = win.el.getBoundingClientRect();
    const target = hooks.dockIconRect ? hooks.dockIconRect(win.appId) : null;
    const tx = target ? target.x + target.w / 2 - (rect.left + rect.width / 2) : 0;
    const ty = target ? target.y + target.h / 2 - (rect.top + rect.height / 2) : window.innerHeight - rect.top;
    const anim = win.el.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(.06)`, opacity: .22 }],
      { duration: 380, easing: 'cubic-bezier(.5,0,1,1)' }
    );
    anim.onfinish = () => {
      anim.cancel();
      win.el.classList.add('minimized');
      persist();
      bus.emit('wm:windows-changed', { count: wins.length });
    };
  },

  restore(win, animate = true) {
    if (!win.minimized) return;
    win.minimized = false;
    win.el.classList.remove('minimized');
    this.focus(win);
    if (animate) animateOpen(win);
    persist();
    bus.emit('wm:windows-changed', { count: wins.length });
  },

  zoom(win) {
    const b = this.bounds();
    if (win.maximized) {
      const g = win.restoreGeom || { x: 80, y: 80, w: win.def.w, h: win.def.h };
      win.maximized = false;
      win.el.classList.remove('maximized');
      setGeom(win, g);
    } else {
      win.restoreGeom = { x: win.x, y: win.y, w: win.w, h: win.h };
      win.maximized = true;
      win.el.classList.add('maximized');
      setGeom(win, { x: 0, y: b.top, w: window.innerWidth, h: b.bottom - b.top });
    }
    persist();
  },

  byApp(appId) { return wins.filter((w) => w.appId === appId); },
  runningApps() { return [...new Set(wins.map((w) => w.appId))]; },

  serializeAll() {
    return wins.map((w) => ({
      id: w.id, app: w.appId, x: w.x, y: w.y, w: w.w, h: w.h,
      minimized: w.minimized, maximized: w.maximized,
      payload: w.def.serialize ? safe(() => w.def.serialize(w)) || w.payload : w.payload,
    }));
  },
};

function safe(fn) { try { return fn(); } catch (e) { console.error(e); return null; } }
function bringToFront(win) { win.el.style.zIndex = ++zCounter; }
function dockBounce(appId) { bus.emit('dock:bounce', appId); }
function persist() { layout.windows = wm.serializeAll(); layout.save(); }

function clampGeom(g) {
  const b = wm.bounds();
  g.w = Math.max(160, Math.round(g.w));
  g.h = Math.max(120, Math.round(g.h));
  g.x = Math.max(-g.w + 90, Math.min(g.x, window.innerWidth - 90));
  g.y = Math.max(b.top, Math.min(g.y, window.innerHeight - 30));
  return g;
}

function setGeom(win, g) {
  const gm = clampGeom(g);
  win.x = gm.x; win.y = gm.y; win.w = gm.w; win.h = gm.h;
  win.el.style.left = win.x + 'px';
  win.el.style.top = win.y + 'px';
  win.el.style.width = win.w + 'px';
  win.el.style.height = win.h + 'px';
}

function animateOpen(win) {
  const anim = win.el.animate(
    [{ transform: 'scale(.92) translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 230, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
  );
  win.el.classList.add('opening');
  anim.onfinish = () => { anim.cancel(); win.el.classList.remove('opening'); };
}

const TL_SVGS = {
  close: '<svg viewBox="0 0 12 12"><path d="M3 3 L9 9 M9 3 L3 9" stroke-width="1.6"/></svg>',
  min: '<svg viewBox="0 0 12 12"><path d="M2.5 6 h7" stroke-width="1.8"/></svg>',
  zoom: '<svg viewBox="0 0 12 12"><path d="M3 6 h6 M6 3 v6" stroke-width="1.8"/></svg>',
};

function createWindow(appId, def, opts) {
  const id = 'w' + (++idCounter);
  const el = document.createElement('div');
  el.className = 'window';
  el.dataset.windowId = id;
  el.dataset.app = appId;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', def.name);

  const b = wm.bounds();
  const baseW = Math.min(opts.w || def.w || 720, b.right - 40);
  const baseH = Math.min(opts.h || def.h || 480, window.innerHeight - 140);
  const cascade = wins.length % 7;
  const geom = clampGeom({
    x: opts.x ?? Math.max(10, (window.innerWidth - baseW) / 2 + cascade * 26 - 60),
    y: opts.y ?? Math.max(b.top + 10, 60 + cascade * 24),
    w: baseW, h: baseH,
  });

  el.innerHTML = `
    <div class="titlebar" aria-label="Title bar">
      <div class="traffic">
        <button class="tl tl-close" aria-label="Close window">${TL_SVGS.close}</button>
        <button class="tl tl-min" aria-label="Minimize window">${TL_SVGS.min}</button>
        <button class="tl tl-zoom" aria-label="Zoom window">${TL_SVGS.zoom}</button>
      </div>
      <div class="win-title">${def.name}</div>
    </div>
    <div class="window-body"></div>
    ${['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => `<div class="rz rz-${d}" data-dir="${d}" aria-hidden="true"></div>`).join('')}
  `;
  document.body.appendChild(el);

  const win = {
    id, appId, def, el,
    body: el.querySelector('.window-body'),
    titleEl: el.querySelector('.win-title'),
    x: geom.x, y: geom.y, w: geom.w, h: geom.h,
    minimized: false, maximized: false,
    payload: opts.payload || {},
    onclose: null,
    setTitle(t) { this.titleEl.textContent = t; el.setAttribute('aria-label', t); },
    setModified(m) { el.querySelector('.tl-close').classList.toggle('modified', !!m); },
    save() { persist(); },
    close: () => wm.close(win),
  };
  setGeom(win, geom);

  // traffic lights
  el.querySelector('.tl-close').addEventListener('click', (e) => { e.stopPropagation(); wm.close(win); });
  el.querySelector('.tl-min').addEventListener('click', (e) => { e.stopPropagation(); wm.minimize(win); });
  el.querySelector('.tl-zoom').addEventListener('click', (e) => { e.stopPropagation(); wm.zoom(win); });

  // focus on any mousedown
  el.addEventListener('mousedown', () => wm.focus(win), true);

  // drag
  const titlebar = el.querySelector('.titlebar');
  titlebar.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('.traffic') || e.target.closest('input, button')) return;
    startDrag(win, e);
  });
  titlebar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.traffic')) return;
    wm.zoom(win);
  });

  // resize
  for (const handle of el.querySelectorAll('.rz')) {
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      startResize(win, handle.dataset.dir, e);
    });
  }

  // mount app content
  safe(() => def.mount(win, win.payload));
  return win;
}

function startDrag(win, e) {
  e.preventDefault();
  wm.focus(win);
  const startX = e.clientX, startY = e.clientY;
  const origX = win.x, origY = win.y;
  const b = wm.bounds();
  const onMove = (ev) => {
    const nx = origX + ev.clientX - startX;
    const ny = origY + ev.clientY - startY;
    win.x = nx;
    win.y = Math.max(b.top, Math.min(ny, window.innerHeight - 30));
    win.el.style.left = win.x + 'px';
    win.el.style.top = win.y + 'px';
    if (win.maximized) { win.maximized = false; win.el.classList.remove('maximized'); }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    win.x = Math.max(-win.w + 90, Math.min(win.x, window.innerWidth - 90));
    win.el.style.left = win.x + 'px';
    persist();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResize(win, dir, e) {
  e.preventDefault();
  e.stopPropagation();
  wm.focus(win);
  const startX = e.clientX, startY = e.clientY;
  const o = { x: win.x, y: win.y, w: win.w, h: win.h };
  const minW = win.def.minW || 280;
  const minH = win.def.minH || 200;
  const b = wm.bounds();
  const onMove = (ev) => {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    let { x, y, w, h } = o;
    if (dir.includes('e')) w = o.w + dx;
    if (dir.includes('s')) h = o.h + dy;
    if (dir.includes('w')) { w = o.w - dx; x = o.x + dx; }
    if (dir.includes('n')) { h = o.h - dy; y = o.y + dy; }
    if (w < minW) { if (dir.includes('w')) x = o.x + (o.w - minW); w = minW; }
    if (h < minH) { if (dir.includes('n')) y = o.y + (o.h - minH); h = minH; }
    y = Math.max(b.top, y);
    win.x = x; win.y = y; win.w = w; win.h = h;
    setGeom(win, { x, y, w, h });
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    persist();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/* Restore layout from persisted records */
export function restoreWindows(records) {
  const restored = [];
  for (const rec of records || []) {
    if (!rec || !getApp(rec.app)) continue;
    const win = wm.open(rec.app, {
      noAnim: true,
      payload: rec.payload || {},
      x: rec.x, y: rec.y, w: rec.w, h: rec.h,
    });
    if (!win) continue;
    if (rec.maximized && !win.maximized) wm.zoom(win);
    if (rec.minimized) {
      win.minimized = true;
      win.el.classList.add('minimized');
    }
    restored.push(win);
  }
  layout.windows = wm.serializeAll();
  const visible = wins.filter((w) => !w.minimized);
  if (visible.length) wm.focus(visible[visible.length - 1]);
  return restored;
}
