/* Finder — browse the real filesystem via the backend API. */
import { api } from './core/api.js';
import { icon, iconForEntry } from './core/icons.js';
import { bus } from './core/bus.js';
import { contextMenu } from './core/menu.js';
import { openFile } from './core/open.js';
import { toast } from './core/toast.js';
import { APPS } from './core/registry.js';
import { wm } from './core/wm.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let LOCATIONS = []; // [{id,path,name,icon}] from health endpoint

export async function loadLocations() {
  try {
    const h = await api.health();
    LOCATIONS = h.locations || [];
  } catch { LOCATIONS = []; }
}

function crumbsFor(path) {
  for (const l of LOCATIONS) {
    if (path === l.path) return [{ name: l.name || l.id, path: l.path }];
    if (path.startsWith(l.path + '/')) {
      const parts = path.slice(l.path.length + 1).split('/');
      const out = [{ name: l.name || l.id, path: l.path }];
      let acc = l.path;
      for (const p of parts) {
        acc += '/' + p;
        out.push({ name: p, path: acc });
      }
      return out;
    }
  }
  if (path === '~') return [{ name: 'Home', path: '~' }];
  if (path.startsWith('~/')) {
    const parts = path.slice(2).split('/');
    const out = [{ name: 'Home', path: '~' }];
    let acc = '~';
    for (const p of parts) {
      acc += '/' + p;
      out.push({ name: p, path: acc });
    }
    return out;
  }
  const parts = path.split('/').filter(Boolean);
  const out = [];
  let acc = '';
  for (const p of parts) { acc += '/' + p; out.push({ name: p, path: acc }); }
  return out;
}

export function mountFinder(win, payload) {
  const state = {
    cwd: payload.path || '~',
    history: [],
    future: [],
    view: payload.view || 'icons',
    selected: null,
    entries: [],
  };
  win.__finderState = state;

  win.body.innerHTML = `
    <div class="finder-root">
      <div class="sidebar finder-sidebar" role="navigation" aria-label="Finder sidebar"></div>
      <div class="finder-main">
        <div class="finder-toolbar" role="toolbar" aria-label="Finder toolbar">
          <button class="ftb-btn" id="${win.id}-back" aria-label="Back">${icon('chevronL', 15)}</button>
          <button class="ftb-btn" id="${win.id}-fwd" aria-label="Forward">${icon('chevronR', 15)}</button>
          <div class="finder-crumbs" id="${win.id}-crumbs" aria-label="Path"></div>
          <div class="view-toggle">
            <button id="${win.id}-vicons" class="on" aria-label="Icon view">${icon('grid', 14)}</button>
            <button id="${win.id}-vlist" aria-label="List view">${icon('list', 14)}</button>
          </div>
          <button class="ftb-btn" id="${win.id}-newf" aria-label="New Folder">${icon('docNew', 15)}</button>
        </div>
        <div class="finder-content" id="${win.id}-content" tabindex="0"></div>
        <div class="finder-statusbar" id="${win.id}-status"></div>
      </div>
    </div>`;

  const $ = (sel) => win.body.querySelector(sel);
  const content = $(`#${win.id}-content`);

  renderSidebar();

  $(`#${win.id}-back`).addEventListener('click', () => {
    if (state.history.length) {
      state.future.push(state.cwd);
      navigate(state.history.pop(), { push: false });
    }
  });
  $(`#${win.id}-fwd`).addEventListener('click', () => {
    if (state.future.length) {
      state.history.push(state.cwd);
      navigate(state.future.pop(), { push: false });
    }
  });
  $(`#${win.id}-vicons`).addEventListener('click', () => setView('icons'));
  $(`#${win.id}-vlist`).addEventListener('click', () => setView('list'));
  $(`#${win.id}-newf`).addEventListener('click', () => newFolder());

  content.addEventListener('contextmenu', (e) => {
    if (e.target.closest('[data-name]')) return;
    e.preventDefault();
    contentContextMenu(e.clientX, e.clientY);
  });
  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.selected) { e.preventDefault(); startRename(state.selected); }
  });

  const offView = bus.on('finder:view', (v) => { if (wm.focused === win) setView(v); });
  const offNew = bus.on('finder:newfolder', () => { if (wm.focused === win) newFolder(); });
  const offFs = bus.on('fs:changed', () => load(true));
  win.onclose = () => { offView(); offNew(); offFs(); };

  function setView(v) {
    state.view = v;
    $(`#${win.id}-vicons`).classList.toggle('on', v === 'icons');
    $(`#${win.id}-vlist`).classList.toggle('on', v === 'list');
    render();
    win.save();
  }

  function navigate(path, { push = true } = {}) {
    if (path !== state.cwd && push) {
      state.history.push(state.cwd);
      state.future.length = 0;
    }
    state.cwd = path;
    state.selected = null;
    load();
    win.save();
  }
  win.navigate = (path) => navigate(path);

  async function load() {
    try {
      if (state.cwd === '@apps') {
        state.entries = Object.values(APPS).filter((a) => !a.hidden).map((a) => ({
          name: a.name, appId: a.id, kind: 'app', isDir: false, size: 0, mtime: Date.now(),
        }));
      } else {
        const r = await api.fs.list(state.cwd);
        state.entries = r.entries;
      }
    } catch (e) {
      state.entries = [];
      toast({ title: 'Cannot open folder', body: e.message, app: 'finder' });
    }
    render();
  }

  function renderSidebar() {
    const sb = $('.finder-sidebar');
    const favs = [
      { name: 'Home', icon: 'homeS', path: '~' },
      { name: 'Desktop', icon: 'displayS', path: '~/Desktop' },
      { name: 'Documents', icon: 'docS', path: '~/Documents' },
      { name: 'Downloads', icon: 'arrowD', path: '~/Downloads' },
      { name: 'Pictures', icon: 'imageS', path: '~/Pictures' },
      { name: 'Applications', icon: 'grid', path: '@apps' },
    ];
    sb.innerHTML = `
      <div class="sidebar-group">
        <div class="sidebar-heading">Favorites</div>
        ${favs.map((f) => `<div class="sidebar-item" data-path="${esc(f.path)}">${icon(f.icon, 15)}<span>${f.name}</span></div>`).join('')}
      </div>
      <div class="sidebar-group">
        <div class="sidebar-heading">Locations</div>
        ${LOCATIONS.filter((l) => l.id !== 'home').map((l) => `<div class="sidebar-item" data-path="${esc(l.path)}">${icon(l.icon || 'homeS', 15)}<span>${esc(l.name || l.id)}</span></div>`).join('')}
        <div class="sidebar-item" data-app="trash">${icon('trashS', 15)}<span>Trash</span></div>
      </div>`;
    for (const it of sb.querySelectorAll('.sidebar-item')) {
      it.addEventListener('click', () => {
        if (it.dataset.app === 'trash') { wm.open('trash'); return; }
        navigate(it.dataset.path);
      });
    }
    syncSidebar();
  }

  function syncSidebar() {
    for (const it of $('.finder-sidebar').querySelectorAll('.sidebar-item')) {
      it.classList.toggle('selected', it.dataset.path === state.cwd);
    }
  }

  function render() {
    renderCrumbs();
    syncSidebar();
    if (!state.entries.length) {
      content.className = 'finder-content';
      content.innerHTML = `<div class="empty-state" style="height:100%">This folder is empty</div>`;
      $(`#${win.id}-status`).textContent = '0 items';
      return;
    }
    $(`#${win.id}-status`).textContent = `${state.entries.length} item${state.entries.length === 1 ? '' : 's'}`;
    if (state.view === 'icons') renderIcons(); else renderList();
  }

  function renderCrumbs() {
    const crumbs = crumbsFor(state.cwd === '@apps' ? '' : state.cwd);
    const el = $(`#${win.id}-crumbs`);
    el.innerHTML = crumbs.length ? crumbs.map((c, i) =>
      `${i ? `<span class="crumb-sep">${icon('chevronR', 10)}</span>` : ''}
       <button class="crumb ${i === crumbs.length - 1 ? 'cur' : ''}" data-path="${esc(c.path)}">${esc(c.name)}</button>`
    ).join('') : `<button class="crumb cur">Applications</button>`;
    for (const b of el.querySelectorAll('.crumb')) {
      b.addEventListener('click', () => navigate(b.dataset.path));
    }
    win.setTitle(crumbs.length ? crumbs[crumbs.length - 1].name + ' — Finder' : 'Applications');
  }

  function entryPath(e) { return state.cwd === '~' ? `~/${e.name}` : `${state.cwd}/${e.name}`; }

  function renderIcons() {
    content.className = 'finder-content icon-view';
    content.innerHTML = state.entries.map((e) => `
      <div class="fitem ${state.selected === e.name ? 'selected' : ''}" data-name="${esc(e.name)}" role="button" tabindex="0" aria-label="${esc(e.name)}">
        <div class="fi-img">${icon(e.kind === 'app' ? (APPS[e.appId]?.icon || e.appId) : iconForEntry(e))}</div>
        <div class="fi-name">${esc(e.name)}</div>
      </div>`).join('');
    wireEntries();
  }

  function renderList() {
    content.className = 'finder-content list-view';
    content.innerHTML = `
      <div class="fl-header"><div>Name</div><div>Date Modified</div><div>Size</div><div>Kind</div></div>
      <div class="fl-body">${state.entries.map((e) => `
        <div class="frow ${state.selected === e.name ? 'selected' : ''}" data-name="${esc(e.name)}" role="button" tabindex="0" aria-label="${esc(e.name)}">
          <div class="fr-name">${icon(e.kind === 'app' ? (APPS[e.appId]?.icon || e.appId) : iconForEntry(e), 17)}<span>${esc(e.name)}</span></div>
          <div class="fr-sub">${e.mtime ? new Date(e.mtime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
          <div class="fr-sub">${e.isDir ? '—' : fmtSize(e.size)}</div>
          <div class="fr-sub">${kindLabel(e)}</div>
        </div>`).join('')}
      </div>`;
    wireEntries();
  }

  function wireEntries() {
    for (const el of content.querySelectorAll('[data-name]')) {
      el.addEventListener('click', () => {
        state.selected = el.dataset.name;
        for (const o of content.querySelectorAll('[data-name]')) o.classList.toggle('selected', o === el);
      });
      el.addEventListener('dblclick', () => openEntry(el.dataset.name));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        state.selected = el.dataset.name;
        for (const o of content.querySelectorAll('[data-name]')) o.classList.toggle('selected', o === el);
        entryContextMenu(e.clientX, e.clientY, el.dataset.name);
      });
    }
  }

  function openEntry(name) {
    const e = state.entries.find((x) => x.name === name);
    if (!e) return;
    if (e.kind === 'app') { wm.open(e.appId); return; }
    openFile(entryPath(e), e.isDir ? 'folder' : e.kind);
  }

  function entryContextMenu(x, y, name) {
    const e = state.entries.find((x) => x.name === name);
    if (!e) return;
    const items = [{ label: 'Open', action: () => openEntry(name) }];
    if (e.kind !== 'app') {
      items.push({ label: 'Rename', shortcut: '↩', action: () => startRename(name) });
      items.push({ separator: true });
      items.push({ label: 'Move to Trash', action: () => trashEntry(e) });
      items.push({ separator: true });
      items.push({ label: 'Get Info', action: () => toast({ title: e.name, body: `${kindLabel(e)} — ${e.isDir ? 'folder' : fmtSize(e.size)}`, app: 'finder' }) });
    }
    contextMenu(x, y, items);
  }

  function contentContextMenu(x, y) {
    contextMenu(x, y, [
      { label: 'New Folder', shortcut: '⇧⌘N', action: () => newFolder() },
      { separator: true },
      { label: 'as Icons', shortcut: '⌘1', checked: state.view === 'icons', action: () => setView('icons') },
      { label: 'as List', shortcut: '⌘2', checked: state.view === 'list', action: () => setView('list') },
    ]);
  }

  async function trashEntry(e) {
    try {
      await api.fs.trash(entryPath(e));
      toast({ title: 'Moved to Trash', body: e.name, app: 'trash' });
      bus.emit('fs:changed');
      bus.emit('trash:changed');
    } catch (err) { toast({ title: 'Cannot trash', body: err.message, app: 'trash' }); }
  }

  async function newFolder() {
    let name = 'untitled folder';
    let i = 2;
    const names = new Set(state.entries.map((e) => e.name));
    while (names.has(name)) name = `untitled folder ${i++}`;
    try {
      await api.fs.mkdir(`${state.cwd}/${name}`);
      state.selected = name;
      await load();
      startRename(name);
    } catch (e) { toast({ title: 'Cannot create folder', body: e.message, app: 'finder' }); }
  }

  function startRename(name) {
    const el = content.querySelector(`[data-name="${CSS.escape(name)}"]`);
    if (!el) return;
    const nameEl = el.querySelector('.fi-name, .fr-name span');
    if (!nameEl) return;
    const input = document.createElement('input');
    input.className = 'rename-input';
    input.value = name;
    input.setAttribute('aria-label', 'Rename');
    nameEl.replaceWith(input);
    input.focus(); input.select();
    const commit = async () => {
      const newName = input.value.trim();
      if (!newName || newName === name) { render(); return; }
      try {
        await api.fs.rename(`${state.cwd}/${name}`, `${state.cwd}/${newName}`);
        state.selected = newName;
        bus.emit('fs:changed');
      } catch (e) { toast({ title: 'Rename failed', body: e.message, app: 'finder' }); render(); }
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); render(); }
    });
    input.addEventListener('blur', commit);
  }

  load();
}

function fmtSize(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / 104857.6) / 10} MB`;
}
function kindLabel(e) {
  if (e.isDir) return 'Folder';
  if (e.kind === 'app') return 'Application';
  if (e.kind === 'image') return 'Image';
  if (e.kind === 'text') return 'Plain Text';
  return 'Document';
}
