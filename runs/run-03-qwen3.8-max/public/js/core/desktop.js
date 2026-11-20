import { el, clamp } from './util.js';
import { FS } from './fsapi.js';
import { folderSVG, fileSVG } from './icons.js';
import { showContextMenu } from './contextmenu.js';
import { openEntry, kindLabel } from './openwith.js';
import { moveToTrash, renameEntry, newFolderIn } from './fileops.js';
import { showGetInfo } from './getinfo.js';
import { launch } from './launch.js';
import { get, set } from './state.js';
import { bus } from './bus.js';
import { setActiveApp } from './menubar.js';

let entries = [];
let selected = null;
const layer = () => document.getElementById('desktop-icons');

export async function buildDesktop() {
  bus.on('fschange', () => refresh());
  layer().addEventListener('mousedown', (e) => {
    if (e.target === layer()) { selected = null; markSel(); setActiveApp('finder'); }
  });
  layer().addEventListener('contextmenu', (e) => {
    if (e.target !== layer()) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: async () => { await newFolderIn('Desktop'); } },
      { separator: true },
      { label: 'Sort By Name', action: async () => { positionsClear(); } },
      { label: 'Clean Up Icons', action: () => positionsClear() },
      { separator: true },
      { label: 'Change Wallpaper…', action: () => launch('settings') },
      { label: 'Get Info', disabled: true },
    ]);
  });
  await refresh();
}

function positionsClear() { set('desktop.positions', {}, true); refresh(); }

export async function refresh() {
  try { entries = (await FS.list('Desktop')).entries.filter((e) => !e.name.startsWith('.')); } catch { entries = []; }
  render();
}

function render() {
  const L = layer();
  L.innerHTML = '';
  const pos = get('desktop.positions', {});
  const sorted = [...entries].sort((a, b) => (a.kind === 'dir' ? -1 : 1) - (b.kind === 'dir' ? -1 : 1) || a.name.localeCompare(b.name));
  const rowsPerCol = Math.max(1, Math.floor((innerHeight - 60) / 96));
  sorted.forEach((e, i) => {
    const p = pos[e.name];
    const x = p ? p.x : innerWidth - 110 - Math.floor(i / rowsPerCol) * 100;
    const y = p ? p.y : 16 + (i % rowsPerCol) * 96;
    const node = el('div', { class: 'desk-icon', dataset: { name: e.name }, style: { left: x + 'px', top: y + 'px' }, 'data-testid': 'desktop-icon' },
      el('div', { class: 'di-visual', html: e.kind === 'dir' ? folderSVG(58) : e.image ? `<img src="${FS.rawUrl(e.path)}" alt="">` : fileSVG(e) }),
      el('div', { class: 'di-label', text: e.name }));
    wire(node, e);
    L.append(node);
  });
  markSel();
}

function markSel() {
  layer().querySelectorAll('.desk-icon').forEach((n) => n.classList.toggle('sel', n.dataset.name === selected));
}

function wire(node, e) {
  node.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    selected = e.name; markSel();
    startIconDrag(ev, node, e);
  });
  node.addEventListener('dblclick', () => openEntry(e));
  node.addEventListener('contextmenu', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    selected = e.name; markSel();
    showContextMenu(ev.clientX, ev.clientY, [
      { label: 'Open', action: () => openEntry(e) },
      { separator: true },
      { label: 'Get Info', action: () => showGetInfo(e) },
      { label: 'Rename…', action: () => startRename(node, e) },
      { separator: true },
      { label: 'Move to Trash', action: async () => { await moveToTrash(e); } },
      { separator: true },
      { label: kindLabel(e), disabled: true },
    ]);
  });
}

function startIconDrag(ev, node, e) {
  const sx = ev.clientX, sy = ev.clientY;
  const ox = node.offsetLeft, oy = node.offsetTop;
  let moved = false;
  const onMove = (ev2) => {
    const dx = ev2.clientX - sx, dy = ev2.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    node.classList.add('dragging');
    const nx = clamp(ox + dx, 0, innerWidth - 96);
    const ny = clamp(oy + dy, 0, innerHeight - 110);
    node.style.left = nx + 'px';
    node.style.top = ny + 'px';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    node.classList.remove('dragging');
    if (moved) {
      const pos = get('desktop.positions', {});
      pos[e.name] = { x: node.offsetLeft, y: node.offsetTop };
      set('desktop.positions', pos);
    }
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startRename(node, e) {
  const label = node.querySelector('.di-label');
  const input = el('input', { class: 'rename-input', value: e.name });
  label.replaceWith(input);
  input.focus();
  const dot = e.name.lastIndexOf('.');
  input.setSelectionRange(0, dot > 0 ? dot : e.name.length);
  const commit = async () => {
    if (node._renaming) return; node._renaming = true;
    const nv = input.value.trim();
    if (nv && nv !== e.name) {
      try { await renameEntry(e, nv); } catch (err) { alert(`Can’t rename: ${err.message}`); }
    }
    refresh();
  };
  input.addEventListener('keydown', (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Enter') commit();
    if (ev.key === 'Escape') { node._renaming = true; input.remove(); refresh(); }
  });
  input.addEventListener('blur', commit);
}
