/* Spotlight: ⌘Space / Ctrl+Space overlay with fuzzy search over
 * apps, system commands, and real files from the Home index. */
import { icon, iconForEntry } from './icons.js';
import { APPS } from './registry.js';
import { wm } from './wm.js';
import { api } from './api.js';
import { settings } from './state.js';
import { bus } from './bus.js';
import { escapeHTML } from './toast.js';
import { openFile } from './open.js';

const overlay = () => document.getElementById('spotlight');
const inputEl = () => document.getElementById('spotlight-input');
const resultsEl = () => document.getElementById('spotlight-results');

let open = false;
let results = [];
let selected = 0;
let fileIndex = [];
let indexTime = 0;

export function initSpotlight() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  });
  overlay().addEventListener('mousedown', (e) => { if (e.target === overlay()) close(); });
  inputEl().addEventListener('input', () => search());
  inputEl().addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); runSelected(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
}

export function toggle() { open ? close() : show(); }

export function show() {
  open = true;
  overlay().hidden = false;
  inputEl().value = '';
  results = [];
  selected = 0;
  renderResults();
  buildIndex();
  inputEl().focus();
}
export function close() {
  open = false;
  overlay().hidden = true;
}

async function buildIndex() {
  if (fileIndex.length && Date.now() - indexTime < 45000) return;
  indexTime = Date.now();
  try {
    const out = [];
    const walk = async (dir, depth) => {
      if (depth > 3 || out.length > 500) return;
      const r = await api.fs.list(dir);
      for (const e of r.entries) {
        if (e.name.startsWith('.')) continue;
        out.push({ name: e.name, path: dir === '~' ? `~/${e.name}` : `${dir}/${e.name}`, kind: e.isDir ? 'folder' : e.kind });
        if (e.isDir) await walk(`${dir === '~' ? '~' : dir}/${e.name}`, depth + 1);
      }
    };
    await walk('~', 0);
    fileIndex = out;
    if (open && inputEl().value) search();
  } catch (e) { console.error(e); }
}

/* fuzzy subsequence match with scoring; returns score or -1 */
function fuzzy(q, text) {
  q = q.toLowerCase(); text = text.toLowerCase();
  let ti = 0, score = 0, streak = 0;
  for (const ch of q) {
    const idx = text.indexOf(ch, ti);
    if (idx === -1) return -1;
    streak = idx === ti ? streak + 1 : 1;
    score += 6 + streak * 4 + (idx === 0 ? 8 : 0) + (/[\s\-._/.]/.test(text[idx - 1] || '') ? 5 : 0);
    ti = idx + 1;
  }
  score -= text.length * 0.12;
  return score;
}

const COMMANDS = [
  { name: 'Toggle Dark Mode', sub: 'Command', icon: 'moon', run: () => settings.set({ theme: settings.effectiveTheme() === 'dark' ? 'light' : 'dark' }) },
  { name: 'Sleep', sub: 'Command', icon: 'moon', run: () => bus.emit('os:sleep') },
  { name: 'Empty Trash', sub: 'Command', icon: 'trashS', run: () => bus.emit('trash:empty') },
  { name: 'Open Trash', sub: 'Command', icon: 'trashS', run: () => wm.open('trash') },
  { name: 'About This Computer', sub: 'Command', icon: 'infoS', run: () => wm.open('about') },
  { name: 'New Note', sub: 'Command', icon: 'notes', run: () => wm.open('notes', { payload: { newNote: true } }) },
  { name: 'System Settings', sub: 'Command', icon: 'settings', run: () => wm.open('settings') },
];

function search() {
  const q = inputEl().value.trim();
  selected = 0;
  if (!q) { results = []; renderResults(); return; }
  const cands = [];
  for (const [id, def] of Object.entries(APPS)) {
    if (def.hidden) continue;
    const s = fuzzy(q, def.name);
    if (s >= 0) cands.push({ type: 'Applications', score: s + 30, icon: def.icon || id, title: def.name, sub: 'Application', run: () => wm.open(id) });
  }
  for (const c of COMMANDS) {
    const s = fuzzy(q, c.name);
    if (s >= 0) cands.push({ type: 'Commands', score: s + 20, icon: c.icon, title: c.name, sub: 'Command', run: c.run });
  }
  for (const f of fileIndex) {
    const s = fuzzy(q, f.name);
    if (s >= 0) cands.push({ type: 'Documents', score: s, icon: iconForEntry(f), title: f.name, sub: f.path, run: () => openFile(f.path, f.kind) });
  }
  cands.sort((a, b) => b.score - a.score);
  results = cands.slice(0, 20);
  renderResults();
}

function renderResults() {
  const host = resultsEl();
  if (!results.length) {
    host.innerHTML = inputEl().value.trim() ? `<div class="spot-empty">No Results</div>` : defaultHint();
    return;
  }
  let html = '';
  let lastType = null;
  results.forEach((r, i) => {
    if (r.type !== lastType) { html += `<div class="spot-cat">${r.type}</div>`; lastType = r.type; }
    html += `
      <div class="spot-item ${i === selected ? 'selected' : ''}" data-idx="${i}" role="option" aria-selected="${i === selected}">
        <div class="si-icon">${icon(r.icon, 26)}</div>
        <div>
          <div class="si-title">${escapeHTML(r.title)}</div>
          <div class="si-sub">${escapeHTML(r.sub || '')}</div>
        </div>
      </div>`;
  });
  host.innerHTML = html;
  for (const el of host.querySelectorAll('.spot-item')) {
    el.addEventListener('mousedown', (e) => { e.preventDefault(); selected = Number(el.dataset.idx); runSelected(); });
    el.addEventListener('mousemove', () => { if (selected !== Number(el.dataset.idx)) { selected = Number(el.dataset.idx); syncSelected(); } });
  }
}

function defaultHint() {
  const apps = Object.values(APPS).filter((a) => a.inDock).slice(0, 8);
  return `<div class="spot-cat">Suggestions</div>` + apps.map((a) => `
    <div class="spot-item" data-app="${a.id}">
      <div class="si-icon">${icon(a.icon || a.id, 26)}</div>
      <div><div class="si-title">${escapeHTML(a.name)}</div><div class="si-sub">Application</div></div>
    </div>`).join('');
}

function syncSelected() {
  for (const el of resultsEl().querySelectorAll('.spot-item')) {
    const idx = Number(el.dataset.idx);
    const isSel = idx === selected && results.length;
    el.classList.toggle('selected', isSel);
    if (isSel) el.scrollIntoView({ block: 'nearest' });
  }
}

function move(dir) {
  if (!results.length) return;
  selected = (selected + dir + results.length) % results.length;
  syncSelected();
  const el = resultsEl().querySelector('.spot-item.selected');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function runSelected() {
  const r = results[selected];
  if (!r) {
    const el = resultsEl().querySelector('.spot-item[data-app]');
    if (el) { close(); wm.open(el.dataset.app); }
    return;
  }
  close();
  r.run();
}
