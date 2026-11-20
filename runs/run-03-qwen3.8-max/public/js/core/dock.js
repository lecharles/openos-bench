import { el } from './util.js';
import { appIconSVG } from './icons.js';
import { APPS, DOCK_APPS } from '../apps/registry.js';
import { launch } from './launch.js';
import * as WM from './wm.js';
import { showContextMenu } from './contextmenu.js';
import { trashCount, emptyTrash } from './fileops.js';
import { bus } from './bus.js';

let dockEl = null;
const items = new Map();

export function buildDock() {
  dockEl = document.getElementById('dock');
  dockEl.innerHTML = '';
  for (const id of [...DOCK_APPS, '|', 'trash']) {
    if (id === '|') { dockEl.append(el('div', { class: 'dock-sep' })); continue; }
    const app = APPS[id];
    const item = el('div', { class: 'dock-item', dataset: { app: id }, 'data-testid': 'dock-' + id, role: 'button', 'aria-label': app.name },
      el('div', { class: 'dock-icon', html: id === 'trash' ? appIconSVG('trash', {}) : appIconSVG(id) }),
      el('div', { class: 'dock-tip', text: app.name }));
    item.addEventListener('click', () => dockClick(id));
    item.addEventListener('contextmenu', (e) => { e.preventDefault(); dockMenu(e, id); });
    dockEl.append(item);
    items.set(id, item);
  }
  dockEl.addEventListener('mousemove', magnify);
  dockEl.addEventListener('mouseleave', () => { for (const it of items.values()) { it.style.setProperty('--scale', 1); it.style.setProperty('--lift', '0px'); } });
  WM.onWM(() => updateRunning());
  bus.on('fschange', refreshTrashIcon);
  updateRunning();
  refreshTrashIcon();
  WM.setDockIconProvider((appId) => {
    const it = items.get(appId);
    if (!it) return null;
    const r = it.getBoundingClientRect();
    const l = document.getElementById('windows-layer').getBoundingClientRect();
    return { x: r.left + r.width / 2 - l.left, y: r.top - l.top };
  });
}

function magnify(e) {
  if (!document.getElementById('dock')) return;
  const RANGE = 130, MAX = 0.55;
  for (const [id, it] of items) {
    const r = it.getBoundingClientRect();
    const c = r.left + r.width / 2;
    const d = Math.abs(e.clientX - c);
    const t = Math.max(0, 1 - d / RANGE);
    const s = 1 + MAX * t * t * (3 - 2 * t);
    it.style.setProperty('--scale', s.toFixed(3));
    it.style.setProperty('--lift', `${((s - 1) * 26).toFixed(1)}px`);
  }
}

export function updateRunning() {
  for (const [id, it] of items) {
    it.classList.toggle('running', WM.windowsForApp(id).length > 0);
  }
}

export async function refreshTrashIcon() {
  const it = items.get('trash');
  if (!it) return;
  const n = await trashCount();
  it.querySelector('.dock-icon').innerHTML = appIconSVG('trash', { full: n > 0 });
}

export function bounce(appId) {
  const it = items.get(appId);
  if (!it) return Promise.resolve();
  return new Promise((resolve) => {
    it.classList.remove('bouncing');
    void it.offsetWidth;
    it.classList.add('bouncing');
    const done = () => { it.classList.remove('bouncing'); resolve(); };
    it.querySelector('.dock-icon').addEventListener('animationend', done, { once: true });
    setTimeout(done, 1100);
  });
}

export async function dockClick(id) {
  const running = WM.windowsForApp(id);
  if (running.length) {
    const w = running.sort((a, b) => b.z - a.z)[0];
    if (w.minimized) WM.restoreWindow(w);
    else if (WM.focusedWindow() === w && running.length === 1) WM.minimizeWindow(w);
    else WM.focusWindow(w);
    return;
  }
  await bounce(id);
  launch(id);
}

function dockMenu(e, id) {
  const running = WM.windowsForApp(id);
  const menuItems = [];
  if (id === 'trash') {
    menuItems.push(
      { label: 'Open Trash', action: () => launch('trash') },
      { label: 'Empty Trash…', action: async () => { if (confirm('Permanently delete all items in the Trash?')) await emptyTrash(); } });
  } else {
    menuItems.push(
      { label: running.length ? 'Show' : 'Open', action: () => dockClick(id) },
      APPS[id].singleton === false ? { label: 'New Window', shortcut: '⌘N', action: () => launch(id, { forceNew: true }) } : null);
  }
  menuItems.push({ separator: true },
    { label: 'Show in Finder', action: () => launch('finder', { params: { path: '' } }) },
    { separator: true },
    { label: running.length ? 'Quit (close windows)' : 'Options', disabled: !running.length, action: () => running.forEach((w) => WM.closeWindow(w)) });
  showContextMenu(e.clientX, e.clientY - 8, menuItems.filter(Boolean));
}
