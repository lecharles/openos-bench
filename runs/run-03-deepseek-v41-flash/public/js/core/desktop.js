/* Desktop: wallpaper surface, desktop icons (real ~/Desktop contents),
 * drag positioning, inline rename, context menus. */
import { api } from './api.js';
import { icon, iconForEntry } from './icons.js';
import { layout } from './state.js';
import { bus } from './bus.js';
import { contextMenu } from './menu.js';
import { openFile } from './open.js';
import { toast } from './toast.js';
import { settings } from './state.js';

const DESKTOP = '~/Desktop';
let entries = [];     // current listing
const iconsEl = () => document.getElementById('desktop-icons');
let selectedName = null;
let renamingName = null;

export async function initDesktop() {
  const desk = document.getElementById('desktop');
  desk.addEventListener('mousedown', (e) => {
    if (e.target === desk || e.target === iconsEl()) {
      selectedName = null;
      for (const el of iconsEl().querySelectorAll('.dicon')) el.classList.remove('selected');
      // focus desktop → Finder
      import('./wm.js').then(({ wm }) => wm.focusDesktop());
    }
  });
  desk.addEventListener('contextmenu', (e) => {
    if (!(e.target === desk || e.target === iconsEl())) return;
    e.preventDefault();
    desktopContextMenu(e.clientX, e.clientY);
  });
  bus.on('fs:changed', () => refresh());
  await refresh();
}

export async function refresh() {
  try {
    const r = await api.fs.list(DESKTOP);
    entries = r.entries;
  } catch (e) { entries = []; console.error(e); }
  render();
}

function desktopContextMenu(x, y) {
  contextMenu(x, y, [
    { label: 'New Folder', action: () => newFolder() },
    { label: 'Get Info', action: () => import('./wm.js').then(({ wm }) => wm.open('about')) },
    { separator: true },
    { label: 'Sort Icons', action: () => sortIcons() },
    { label: 'Clean Up', action: () => sortIcons() },
    { separator: true },
    { label: 'Change Wallpaper…', action: () => import('./wm.js').then(({ wm }) => wm.open('settings', { payload: { pane: 'wallpaper' } })) },
    { label: 'Show Desktop Settings…', action: () => import('./wm.js').then(({ wm }) => wm.open('settings')) },
  ]);
}

async function newFolder() {
  let name = 'untitled folder';
  let i = 2;
  const names = new Set(entries.map((e) => e.name));
  while (names.has(name)) name = `untitled folder ${i++}`;
  try {
    await api.fs.mkdir(`${DESKTOP}/${name}`);
    selectedName = name;
    await refresh();
    startRename(name);
  } catch (e) { toast({ title: 'Cannot create folder', body: e.message, app: 'finder' }); }
}

async function sortIcons() {
  layout.desktopIcons = {};
  await refresh();
  layout.save();
}

function cellFor(i) {
  const top = 16;
  const gapX = 100, gapY = 100;
  const perCol = Math.max(3, Math.floor((window.innerHeight - 90) / gapY));
  const col = Math.floor(i / perCol);
  const row = i % perCol;
  const x = window.innerWidth - 96 - col * gapX;
  return { x: Math.max(10, x), y: top + row * gapY };
}

function render() {
  const host = iconsEl();
  host.innerHTML = '';
  const sorted = [...entries].sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
  sorted.forEach((e, i) => {
    const saved = layout.desktopIcons[e.name];
    const pos = saved || cellFor(i);
    const el = document.createElement('div');
    el.className = 'dicon' + (e.name === selectedName ? ' selected' : '');
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.dataset.name = e.name;
    el.setAttribute('role', 'listitem');
    el.innerHTML = `<div class="dicon-img">${icon(iconForEntry(e))}</div><div class="dicon-label">${escape(e.name)}</div>`;
    host.appendChild(el);

    el.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      selectedName = e.name;
      for (const o of host.querySelectorAll('.dicon')) o.classList.toggle('selected', o === el);
      startIconDrag(el, e, ev);
    });
    el.addEventListener('dblclick', () => {
      openFile(`${DESKTOP}/${e.name}`, e.isDir ? 'folder' : e.kind);
    });
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      iconContextMenu(ev.clientX, ev.clientY, e);
    });
    if (renamingName === e.name) { renamingName = null; startRename(e.name); }
  });
}

function iconContextMenu(x, y, entry) {
  contextMenu(x, y, [
    { label: 'Open', action: () => openFile(`${DESKTOP}/${entry.name}`, entry.isDir ? 'folder' : entry.kind) },
    { label: 'Rename', action: () => startRename(entry.name) },
    { separator: true },
    { label: 'Move to Trash', action: () => trashEntry(entry) },
  ]);
}

async function trashEntry(entry) {
  try {
    await api.fs.trash(`${DESKTOP}/${entry.name}`);
    toast({ title: 'Moved to Trash', body: entry.name, app: 'trash' });
    bus.emit('fs:changed');
    bus.emit('trash:changed');
  } catch (e) { toast({ title: 'Cannot trash', body: e.message, app: 'trash' }); }
}

function startIconDrag(el, entry, ev) {
  const startX = ev.clientX, startY = ev.clientY;
  const origX = parseInt(el.style.left, 10), origY = parseInt(el.style.top, 10);
  let moved = false;
  const onMove = (e) => {
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) {
      moved = true;
      el.classList.add('dragging');
      el.style.left = origX + e.clientX - startX + 'px';
      el.style.top = origY + e.clientY - startY + 'px';
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    el.classList.remove('dragging');
    if (moved) {
      const x = Math.max(0, parseInt(el.style.left, 10));
      const y = Math.max(0, parseInt(el.style.top, 10));
      layout.desktopIcons[entry.name] = { x, y };
      layout.save();
    }
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

export function startRename(name) {
  const el = iconsEl().querySelector(`.dicon[data-name="${CSS.escape(name)}"]`);
  if (!el) return;
  const label = el.querySelector('.dicon-label');
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = name;
  input.setAttribute('aria-label', 'Rename');
  label.replaceWith(input);
  renamingName = name;
  input.focus();
  input.select();
  const commit = async () => {
    const newName = input.value.trim();
    renamingName = null;
    if (!newName || newName === name) { refresh(); return; }
    try {
      await api.fs.rename(`${DESKTOP}/${name}`, `${DESKTOP}/${newName}`);
      if (layout.desktopIcons[name]) {
        layout.desktopIcons[newName] = layout.desktopIcons[name];
        delete layout.desktopIcons[name];
        layout.save();
      }
      selectedName = newName;
    } catch (e) { toast({ title: 'Rename failed', body: e.message, app: 'finder' }); }
    refresh();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); renamingName = null; refresh(); }
    e.stopPropagation();
  });
  input.addEventListener('blur', commit);
  input.addEventListener('mousedown', (e) => e.stopPropagation());
}

function escape(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
