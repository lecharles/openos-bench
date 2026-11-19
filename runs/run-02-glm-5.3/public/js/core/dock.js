/* Dock: magnification on hover, running indicators, launch bounce,
 * trash with badge, right-click menus, genie-minimize target rects. */
import { icon } from './icons.js';
import { settings } from './state.js';
import { wm } from './wm.js';
import { APPS, hooks } from './registry.js';
import { bus } from './bus.js';
import { openMenu, contextMenu } from './menu.js';
import { api } from './api.js';

const DOCK_ORDER = ['finder', 'launchpad', 'notes', 'calendar', 'mail', 'weather', 'music', 'photos', 'contacts', 'calculator', 'preview', 'textedit', 'terminal', 'clock', 'settings', 'sep', 'trash'];

const items = new Map(); // appId -> {el, baseSize}
let dockEl;

export function initDock() {
  dockEl = document.getElementById('dock');
  hooks.dockIconRect = getIconRect;
  bus.on('dock:bounce', (appId) => bounce(appId));
  bus.on('trash:changed', (info) => updateTrashBadge());
  settings.apply();
  rebuild();
  updateTrashBadge();
  bus.on('wm:windows-changed', updateRunning);
  updateRunning({ count: wm.windows.length });
}

export function rebuild() {
  if (!dockEl) return;
  dockEl.innerHTML = '';
  items.clear();
  for (const id of DOCK_ORDER) {
    if (id === 'sep') {
      const s = document.createElement('div');
      s.className = 'dock-sep';
      dockEl.appendChild(s);
      continue;
    }
    if (id === 'launchpad') {
      const el = document.createElement('div');
      el.className = 'dock-item';
      el.dataset.app = 'launchpad';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Launchpad');
      el.innerHTML = `
        <div class="dock-label">Launchpad</div>
        <div class="dock-img">${icon('launchpad', 0)}</div>
        <div class="dot"></div>`;
      dockEl.appendChild(el);
      items.set('launchpad', { el, baseSize: 52 });
      el.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); bus.emit('launchpad:toggle'); } });
      continue;
    }
    const def = APPS[id];
    if (!def) continue;
    const el = document.createElement('div');
    el.className = 'dock-item';
    el.dataset.app = id;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', def.name);
    el.innerHTML = `
      <div class="dock-label">${def.name}</div>
      <div class="dock-img">${icon(id === 'trash' ? 'trash' : def.icon || id, 0)}</div>
      <div class="dot"></div>
      <div class="dock-badge" hidden>0</div>`;
    dockEl.appendChild(el);
    items.set(id, { el, baseSize: 52 });

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      activate(id);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      dockContextMenu(e.clientX, e.clientY, id);
    });
  }
  applySize();
  magnify();
}

function applySize() {
  const s = settings.data.dockSize || 52;
  dockEl.style.setProperty('--dock-size', s + 'px');
  dockEl.style.setProperty('--dock-h', s + 22 + 'px');
  for (const { el } of items.values()) {
    el.style.width = s + 'px';
    el.style.height = s + 'px';
  }
}

function activate(appId) {
  const def = APPS[appId];
  if (!def) return;
  const running = wm.byApp(appId);
  if (!running.length) { wm.open(appId); return; }
  const minimized = running.filter((w) => w.minimized);
  if (minimized.length) { wm.restore(minimized[minimized.length - 1]); return; }
  const top = running.sort((a, b) => a.el.style.zIndex - b.el.style.zIndex).pop();
  if (top && wm.focused === top) {
    const other = running.find((w) => w !== top);
    if (other) wm.focus(other); else wm.minimize(top);
  } else if (top) wm.focus(top);
}

function dockContextMenu(x, y, appId) {
  const def = APPS[appId];
  const running = wm.byApp(appId);
  const menuItems = [
    ...(def && !def.singleton ? [{ label: 'New Window', action: () => wm.open(appId) }] : []),
    ...(running.length ? [{ label: 'Show All Windows', disabled: true }] : []),
    { separator: true },
    { label: 'Options', disabled: true },
    { label: 'Keep in Dock', checked: true, action: () => {} },
    { label: 'Open at Login', action: () => {} },
    { separator: true },
  ];
  if (appId === 'trash') {
    menuItems.push(
      { label: 'Open Trash', action: () => wm.open('trash') },
      { label: 'Empty Trash', action: () => bus.emit('trash:empty') }
    );
  } else {
    menuItems.push({ label: running.length ? `Quit ${def.name}` : `Open ${def.name}`, action: () => (running.length ? running.forEach((w) => wm.close(w)) : wm.open(appId)) });
  }
  contextMenu(x, y, menuItems);
}

/* ---------------- magnification ---------------- */
function magnify() {
  const wrap = document.getElementById('dock-wrap');
  wrap.addEventListener('mousemove', (e) => {
    if (!(settings.data.dockMagnify > 0)) return;
    dockEl.classList.remove('anim');
    const mag = settings.data.dockMagnify * 0.9;
    for (const { el } of items.values()) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const d = Math.abs(e.clientX - cx);
      const base = settings.data.dockSize || 52;
      const t = Math.max(0, 1 - d / (base * 2.6));
      const size = base * (1 + mag * t * t);
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.transform = `translateY(${-(size - base) * 0.42}px)`;
    }
  });
  wrap.addEventListener('mouseleave', () => {
    dockEl.classList.add('anim');
    applySize();
    setTimeout(() => dockEl.classList.remove('anim'), 260);
  });
  bus.on('settings:applied', () => applySize());
}

function updateRunning() {
  const running = new Set(wm.windows.map((w) => w.appId));
  for (const [id, { el }] of items) {
    el.classList.toggle('running', running.has(id));
  }
}

function bounce(appId) {
  const it = items.get(appId);
  if (!it) return;
  it.el.classList.add('bouncing');
  setTimeout(() => it.el.classList.remove('bouncing'), 2000);
}

function getIconRect(appId) {
  const it = items.get(appId) || items.get('finder');
  if (!it) return null;
  const r = it.el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

async function updateTrashBadge() {
  const el = dockEl?.querySelector('.dock-item[data-app="trash"] .dock-badge');
  if (!el) return;
  try {
    const t = await api.fs.listTrash();
    const n = (t.items || []).length;
    el.hidden = n === 0;
    el.textContent = n;
    const img = dockEl.querySelector('.dock-item[data-app="trash"] .dock-img');
    if (img) img.innerHTML = icon(n > 0 ? 'trashFull' : 'trash', 0);
  } catch { /* ignore */ }
}
