import { el, esc, fmtBytes, fmtRel, clamp } from '../core/util.js';
import { FS } from '../core/fsapi.js';
import { folderSVG, fileSVG } from '../core/icons.js';
import { showContextMenu } from '../core/contextmenu.js';
import { moveToTrash, renameEntry, newFolderIn, restoreFromTrash, deleteForever, emptyTrash } from '../core/fileops.js';
import { openEntry, kindLabel } from '../core/openwith.js';
import { showGetInfo } from '../core/getinfo.js';
import { bus } from '../core/bus.js';
import { launch } from '../core/launch.js';

const FAVS = [
  { label: 'Desktop', path: 'Desktop' },
  { label: 'Documents', path: 'Documents' },
  { label: 'Downloads', path: 'Downloads' },
  { label: 'Pictures', path: 'Pictures' },
  { label: 'Music', path: 'Music' },
];

const favIcon = (path) => ({
  Desktop: '<svg viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="9" rx="1.5" fill="#64b5ff"/><rect x="5.5" y="12.5" width="5" height="1.6" rx=".8" fill="#64b5ff"/></svg>',
  Documents: '<svg viewBox="0 0 16 16"><path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h5L13 4.5v9A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5z" fill="#64b5ff"/><path d="M9.5 1 13 4.5H9.5z" fill="#a8d4ff"/></svg>',
  Downloads: '<svg viewBox="0 0 16 16"><path d="M8 2v7M5 6.5 8 9.5l3-3" stroke="#64b5ff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 11v2A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5v-2" stroke="#64b5ff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  Pictures: '<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="#64b5ff"/><circle cx="5.5" cy="6" r="1.4" fill="#fff"/><path d="M2.5 12 6.5 8l3 3 2-2 2 2v1a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12z" fill="#fff"/></svg>',
  Music: '<svg viewBox="0 0 16 16"><path d="M6 12.5V4l7-1.6v8.6" stroke="#ff6482" stroke-width="1.7" fill="none" stroke-linejoin="round"/><circle cx="4.4" cy="12.6" r="2" fill="#ff6482"/><circle cx="11.4" cy="11" r="2" fill="#ff6482"/></svg>',
  home: '<svg viewBox="0 0 16 16"><path d="M2.5 7.5 8 2.5l5.5 5v6A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5z" fill="#9aa0aa"/></svg>',
  trash: '<svg viewBox="0 0 16 16"><path d="M3.5 4.5h9l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.8A1.5 1.5 0 0 1 4.3 13.5z" fill="#9aa0aa"/><rect x="2.5" y="3" width="11" height="1.6" rx=".8" fill="#9aa0aa"/><rect x="6" y="1.4" width="4" height="1.4" rx=".7" fill="#9aa0aa"/></svg>',
})[path] || '';

export default {
  id: 'finder',
  name: 'Finder',
  size: { w: 880, h: 560 },
  minW: 540, minH: 320,
  singleton: false,
  keywords: 'files browse folder directory',
  onclose(api) { api._off && api._off(); },

  mount(root, api) {
    let cwd = typeof api.params.path === 'string' ? api.params.path : 'Desktop';
    let entries = [];
    let view = api.params.view || 'icons';
    let sortKey = 'name', sortAsc = true;
    let selection = null;
    let history = [cwd], hIdx = 0;
    let showHidden = false;
    let search = '';

    root.classList.add('app', 'finder');

    const sidebar = el('aside', { class: 'app-sidebar' });
    const main = el('div', { class: 'app-main' });
    const toolbar = el('div', { class: 'app-toolbar' });
    const crumbs = el('div', { class: 'f-crumb', 'data-testid': 'finder-breadcrumbs' });
    const content = el('div', { class: 'f-content', 'data-testid': 'finder-content' });
    const status = el('div', { class: 'app-statusbar' });
    main.append(toolbar, crumbs, content, status);
    root.append(sidebar, main);

    const btnBack = el('button', { class: 'os-btn icon-only', 'aria-label': 'Back', html: '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    const btnFwd = el('button', { class: 'os-btn icon-only', 'aria-label': 'Forward', html: '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    const title = el('div', { class: 'f-toolbar-title' });
    const btnEmpty = el('button', { class: 'os-btn', text: 'Empty', hidden: true });
    const searchIn = el('input', { class: 'os-input', type: 'search', placeholder: 'Search', style: { width: '130px' } });
    const btnIcons = el('button', { class: 'os-btn icon-only', title: 'Icon view', html: '<svg width="14" height="14" viewBox="0 0 16 16"><g fill="currentColor"><rect x="1.5" y="1.5" width="5.4" height="5.4" rx="1.2"/><rect x="9.1" y="1.5" width="5.4" height="5.4" rx="1.2"/><rect x="1.5" y="9.1" width="5.4" height="5.4" rx="1.2"/><rect x="9.1" y="9.1" width="5.4" height="5.4" rx="1.2"/></g></svg>' });
    const btnList = el('button', { class: 'os-btn icon-only', title: 'List view', html: '<svg width="14" height="14" viewBox="0 0 16 16"><g fill="currentColor"><rect x="1.5" y="2.4" width="13" height="2" rx="1"/><rect x="1.5" y="7" width="13" height="2" rx="1"/><rect x="1.5" y="11.6" width="13" height="2" rx="1"/></g></svg>' });
    toolbar.append(btnBack, btnFwd, title, el('div', { class: 'spacer' }), btnEmpty, searchIn, btnIcons, btnList);

    // ---------- sidebar ----------
    let trashRow;
    function buildSidebar() {
      sidebar.innerHTML = '';
      sidebar.append(el('div', { class: 'side-h', text: 'Favorites' }));
      for (const f of FAVS) {
        const row = el('div', { class: 'side-row', dataset: { path: f.path } },
          el('span', { class: 'fav-dot', html: favIcon(f.path) }), el('span', { text: f.label }));
        row.addEventListener('click', () => navigate(f.path));
        sidebar.append(row);
      }
      sidebar.append(el('div', { class: 'side-h', text: 'Locations' }));
      const home = el('div', { class: 'side-row', dataset: { path: '' } },
        el('span', { class: 'fav-dot', html: favIcon('home') }), el('span', { text: 'OpenOS' }));
      home.addEventListener('click', () => navigate(''));
      trashRow = el('div', { class: 'side-row', dataset: { path: '.Trash' } },
        el('span', { class: 'fav-dot', html: favIcon('trash') }), el('span', { text: 'Trash' }), el('span', { class: 'cnt' }));
      trashRow.addEventListener('click', () => navigate('.Trash'));
      sidebar.append(home, trashRow);
      markSidebar();
      updateTrashCount();
    }
    function markSidebar() {
      sidebar.querySelectorAll('.side-row').forEach((r) => {
        const p = r.dataset.path;
        r.classList.toggle('on', p === cwd || (p && cwd.startsWith(p + '/')));
      });
    }
    async function updateTrashCount() {
      try {
        const n = (await FS.list('.Trash')).entries.length;
        if (trashRow) trashRow.querySelector('.cnt').textContent = n ? String(n) : '';
      } catch {}
    }

    // ---------- navigation ----------
    async function navigate(path, push = true) {
      cwd = path || '';
      if (push) { history = history.slice(0, hIdx + 1); history.push(cwd); hIdx = history.length - 1; }
      selection = null; search = ''; searchIn.value = '';
      api.params.path = cwd;
      try {
        const res = await FS.list(cwd);
        entries = res.entries;
      } catch (e) {
        entries = [];
        content.innerHTML = `<div class="empty-hint"><b>Folder not found</b><span>${esc(String(e.message))}</span></div>`;
        return;
      }
      const base = cwd ? cwd.split('/').pop() : 'OpenOS';
      api.setTitle(base);
      title.textContent = base;
      btnEmpty.hidden = cwd !== '.Trash';
      renderCrumbs();
      render();
      markSidebar();
      updateTrashCount();
      import('../core/wm.js').then((WM) => WM.saveLayout());
    }

    function renderCrumbs() {
      crumbs.innerHTML = '';
      const parts = cwd ? cwd.split('/') : [];
      const mk = (label, path, on) => {
        const c = el('span', { class: 'cr' + (on ? ' on' : ''), text: label });
        c.addEventListener('click', () => navigate(path));
        return c;
      };
      crumbs.append(mk('OpenOS', '', parts.length === 0));
      let acc = '';
      parts.forEach((p, i) => {
        acc = acc ? acc + '/' + p : p;
        crumbs.append(el('span', { class: 'csep', text: '›' }));
        crumbs.append(mk(p, acc, i === parts.length - 1));
      });
    }

    function sorted() {
      let list = entries.filter((e) => (showHidden || !e.name.startsWith('.')));
      if (search) list = list.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
      const dirOf = (e) => (e.kind === 'dir' ? 0 : 1);
      const val = (e) => {
        switch (sortKey) {
          case 'mtime': return e.mtime || 0;
          case 'size': return e.kind === 'dir' ? -1 : (e.size || 0);
          case 'kind': return kindLabel(e);
          default: return e.name.toLowerCase();
        }
      };
      return list.sort((a, b) => {
        if (dirOf(a) !== dirOf(b)) return dirOf(a) - dirOf(b);
        const va = val(a), vb = val(b);
        const c = va < vb ? -1 : va > vb ? 1 : 0;
        return sortAsc ? c : -c;
      });
    }

    // ---------- render ----------
    function render() {
      const list = sorted();
      content.innerHTML = '';
      if (view === 'icons') {
        const grid = el('div', { class: 'f-grid' });
        for (const e of list) grid.append(iconItem(e));
        if (!list.length) grid.append(el('div', { class: 'empty-hint', style: { gridColumn: '1/-1' } }, el('b', { text: 'Folder is empty' })));
        content.append(grid);
      } else {
        const head = el('div', { class: 'f-list-head' });
        for (const [key, label] of [['name', 'Name'], ['mtime', 'Date Modified'], ['size', 'Size'], ['kind', 'Kind']]) {
          const col = el('div', { class: 'col' }, label, sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '');
          col.addEventListener('click', () => { if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = true; } render(); });
          head.append(col);
        }
        content.append(head);
        for (const e of list) content.append(listRow(e));
        if (!list.length) content.append(el('div', { class: 'empty-hint' }, el('b', { text: 'Folder is empty' })));
      }
      btnIcons.classList.toggle('toggled', view === 'icons');
      btnList.classList.toggle('toggled', view === 'list');
      status.textContent = `${list.length} item${list.length === 1 ? '' : 's'}` + (selection ? `, “${selection}” selected` : '') + '   ·   248.62 GB available';
    }

    function visual(e) {
      if (e.kind === 'dir') return el('div', { class: 'fi-visual', html: folderSVG(56) });
      if (e.image) {
        const img = el('img', { src: FS.rawUrl(e.path), loading: 'lazy', alt: e.name });
        return el('div', { class: 'fi-visual' }, img);
      }
      return el('div', { class: 'fi-visual', html: fileSVG(e) });
    }

    function iconItem(e) {
      const node = el('div', { class: 'f-item', dataset: { name: e.name, kind: e.kind }, 'data-testid': 'finder-item' },
        visual(e), el('div', { class: 'fi-name', text: e.name }));
      wire(node, e);
      return node;
    }
    function listRow(e) {
      const row = el('div', { class: 'f-list-row', dataset: { name: e.name, kind: e.kind }, 'data-testid': 'finder-item' },
        el('div', { class: 'fn' }, e.kind === 'dir' ? el('span', { html: folderSVG(18) }) : e.image ? el('img', { src: FS.rawUrl(e.path), loading: 'lazy' }) : el('span', { html: fileSVG(e) }), el('span', { text: e.name })),
        el('div', { class: 'dim', text: e.mtime ? fmtRel(e.mtime) : '' }),
        el('div', { class: 'dim', text: e.kind === 'dir' ? '--' : fmtBytes(e.size || 0) }),
        el('div', { class: 'dim', text: kindLabel(e) }));
      wire(row, e);
      return row;
    }

    function wire(node, e) {
      node.addEventListener('mousedown', (ev) => {
        if (ev.button !== 0) return;
        select(e.name);
      });
      node.addEventListener('dblclick', () => {
        if (cwd === '.Trash') showGetInfo(e);
        else openEntry(e);
      });
      node.addEventListener('contextmenu', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        select(e.name);
        itemMenu(ev, e);
      });
    }
    function select(name) {
      selection = name;
      content.querySelectorAll('.f-item,.f-list-row').forEach((n) => n.classList.toggle('sel', n.dataset.name === name));
      status.textContent = `${sorted().length} items` + (selection ? `, “${selection}” selected` : '');
    }

    // ---------- context menus ----------
    function selectedEntry() { return entries.find((e) => e.name === selection) || null; }

    function itemMenu(ev, e) {
      const inTrash = cwd === '.Trash';
      const items = inTrash ? [
        { label: 'Put Back', action: async () => { await restoreFromTrash(e.name); navigate('.Trash', false); } },
        { separator: true },
        { label: 'Delete Immediately…', action: async () => { if (confirmDelete(e.name)) { await deleteForever(e.name); navigate('.Trash', false); } } },
      ] : [
        { label: e.kind === 'dir' ? 'Open' : 'Open', action: () => openEntry(e) },
        e.kind === 'dir' ? { label: 'Open in New Window', action: () => launch('finder', { params: { path: e.path }, forceNew: true }) } : null,
        { separator: true },
        { label: 'Get Info', shortcut: '⌘I', action: () => showGetInfo(e) },
        { label: 'Rename…', action: () => startRename(e) },
        { separator: true },
        { label: 'Move to Trash', shortcut: '⌘⌫', action: async () => { await moveToTrash(e); navigate(cwd, false); } },
      ];
      showContextMenu(ev.clientX, ev.clientY, items);
    }

    content.addEventListener('contextmenu', (ev) => {
      if (ev.target.closest('.f-item,.f-list-row')) return;
      ev.preventDefault();
      selection = null;
      content.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
      showContextMenu(ev.clientX, ev.clientY, [
        inTrashNow() ? { label: 'Empty Trash…', action: async () => { if (confirmDelete('everything in the Trash')) { await emptyTrash(); navigate('.Trash', false); } } } : { label: 'New Folder', action: async () => { const name = await newFolderIn(cwd); navigate(cwd, false); setTimeout(() => startRename({ name, path: (cwd ? cwd + '/' : '') + name, kind: 'dir' }), 60); } },
        { separator: true },
        { label: view === 'icons' ? 'View as List' : 'View as Icons', shortcut: view === 'icons' ? '⌘2' : '⌘1', action: () => { view = view === 'icons' ? 'list' : 'icons'; api.params.view = view; render(); } },
        { label: showHidden ? 'Hide Hidden Files' : 'Show Hidden Files', shortcut: '⇧⌘.', action: () => { showHidden = !showHidden; render(); } },
        { separator: true },
        { label: 'Sort by Name', action: () => { sortKey = 'name'; sortAsc = true; render(); } },
        { label: 'Sort by Date Modified', action: () => { sortKey = 'mtime'; sortAsc = false; render(); } },
        { label: 'Sort by Size', action: () => { sortKey = 'size'; sortAsc = false; render(); } },
      ]);
    });
    const inTrashNow = () => cwd === '.Trash';

    function confirmDelete(what) {
      return window.confirm(`Are you sure you want to permanently delete ${what}?`);
    }

    // ---------- rename ----------
    function startRename(e) {
      const node = content.querySelector(`[data-name="${CSS.escape(e.name)}"]`);
      if (!node) return;
      const label = node.querySelector('.fi-name') || node.querySelector('.fn span:last-child');
      if (!label || label.classList.contains('renaming')) return;
      label.classList.add('renaming');
      const input = el('input', { class: 'rename-input', value: e.name });
      label.replaceWith(input);
      input.focus();
      const dot = e.name.lastIndexOf('.');
      input.setSelectionRange(0, dot > 0 ? dot : e.name.length);
      let done = false;
      const commit = async () => {
        if (done) return; done = true;
        const nv = input.value.trim();
        input.remove();
        if (nv && nv !== e.name) {
          try { await renameEntry(e, nv); } catch (err) { alert(`Can’t rename: ${err.message}`); }
        }
        navigate(cwd, false);
      };
      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') commit();
        if (ev.key === 'Escape') { done = true; input.remove(); navigate(cwd, false); }
      });
      input.addEventListener('blur', commit);
    }

    // ---------- toolbar wiring ----------
    btnBack.addEventListener('click', () => { if (hIdx > 0) { hIdx--; navigate(history[hIdx], false); syncNav(); } });
    btnFwd.addEventListener('click', () => { if (hIdx < history.length - 1) { hIdx++; navigate(history[hIdx], false); syncNav(); } });
    function syncNav() { btnBack.disabled = hIdx <= 0; btnFwd.disabled = hIdx >= history.length - 1; }
    btnIcons.addEventListener('click', () => { view = 'icons'; api.params.view = view; render(); });
    btnList.addEventListener('click', () => { view = 'list'; api.params.view = view; render(); });
    searchIn.addEventListener('input', () => { search = searchIn.value; render(); });
    searchIn.addEventListener('keydown', (e) => e.stopPropagation());
    btnEmpty.addEventListener('click', async () => { if (confirmDelete('everything in the Trash')) { await emptyTrash(); navigate('.Trash', false); } });

    // keyboard
    root.addEventListener('keydown', (ev) => {
      if (ev.target.matches('input,textarea')) return;
      const e = selectedEntry();
      if (ev.key === 'Enter' && e) openEntry(e);
      if ((ev.key === 'Backspace' && (ev.metaKey || ev.ctrlKey)) || ev.key === 'Delete') {
        if (e && !inTrashNow()) { moveToTrash(e).then(() => navigate(cwd, false)); }
      }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const list = sorted();
        if (!list.length) return;
        let i = list.findIndex((x) => x.name === selection);
        i = clamp(i + (ev.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1);
        if (i === -1) i = 0;
        select(list[i].name);
        content.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
      }
    });

    api._off = bus.on('fschange', () => { navigate(cwd, false); });

    // exposed controller for app menus
    api._finder = {
      selected: selectedEntry,
      newFolder: async () => { const name = await newFolderIn(cwd); navigate(cwd, false); setTimeout(() => startRename({ name, path: (cwd ? cwd + '/' : '') + name, kind: 'dir' }), 60); },
      startRename: () => { const e = selectedEntry(); if (e) startRename(e); },
      getInfo: () => { const e = selectedEntry(); if (e) showGetInfo(e); },
      trashSelected: async () => { const e = selectedEntry(); if (e) { await moveToTrash(e); navigate(cwd, false); } },
      navigate,
      setView: (v) => { view = v; api.params.view = v; render(); },
      getView: () => view,
      toggleHidden: () => { showHidden = !showHidden; render(); },
      isHidden: () => showHidden,
      back: () => btnBack.click(), fwd: () => btnFwd.click(),
    };

    buildSidebar();
    syncNav();
    navigate(cwd, true);
  },

  menus(win) {
    const f = win.api._finder;
    if (!f) return [];
    const sel = f.selected();
    return [
      { title: 'File', items: [
        { label: 'New Finder Window', shortcut: '⌘N', action: () => launch('finder', { forceNew: true }) },
        { label: 'New Folder', shortcut: '⇧⌘N', action: () => f.newFolder() },
        { separator: true },
        { label: 'Get Info', shortcut: '⌘I', disabled: !sel, action: () => f.getInfo() },
        { separator: true },
        { label: 'Move to Trash', shortcut: '⌘⌫', disabled: !sel, action: () => f.trashSelected() },
      ] },
      { title: 'Edit', items: [
        { label: 'Rename…', disabled: !sel, action: () => f.startRename() },
      ] },
      { title: 'View', items: [
        { label: 'as Icons', shortcut: '⌘1', checked: f.getView() === 'icons', action: () => f.setView('icons') },
        { label: 'as List', shortcut: '⌘2', checked: f.getView() === 'list', action: () => f.setView('list') },
        { separator: true },
        { label: 'Show Hidden Files', shortcut: '⇧⌘.', checked: f.isHidden(), action: () => f.toggleHidden() },
      ] },
      { title: 'Go', items: [
        { label: 'Back', shortcut: '⌘[', action: () => f.back() },
        { label: 'Forward', shortcut: '⌘]', action: () => f.fwd() },
        { separator: true },
        { label: 'Desktop', action: () => f.navigate('Desktop') },
        { label: 'Documents', action: () => f.navigate('Documents') },
        { label: 'Downloads', action: () => f.navigate('Downloads') },
        { label: 'Pictures', action: () => f.navigate('Pictures') },
        { label: 'OpenOS Home', action: () => f.navigate('') },
      ] },
    ];
  },
};
