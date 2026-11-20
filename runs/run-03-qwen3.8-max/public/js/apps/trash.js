import { el, fmtBytes, fmtStamp } from '../core/util.js';
import { FS } from '../core/fsapi.js';
import { folderSVG, fileSVG, appIconSVG } from '../core/icons.js';
import { get } from '../core/state.js';
import { restoreFromTrash, deleteForever, emptyTrash } from '../core/fileops.js';
import { showContextMenu } from '../core/contextmenu.js';
import { bus } from '../core/bus.js';

export default {
  id: 'trash',
  name: 'Trash',
  size: { w: 700, h: 440 },
  minW: 460, minH: 300,
  keywords: 'bin deleted restore',
  onclose(api) { api._off && api._off(); },

  mount(root, api) {
    let entries = [];
    let sel = null;
    root.classList.add('app');
    const main = el('div', { class: 'app-main' });
    root.append(main);

    const toolbar = el('div', { class: 'app-toolbar' });
    const btnBack = el('button', { class: 'os-btn', text: 'Put Back', disabled: true });
    const btnDel = el('button', { class: 'os-btn danger', text: 'Delete Immediately', disabled: true });
    const btnEmpty = el('button', { class: 'os-btn', text: 'Empty Trash' });
    toolbar.append(btnBack, btnDel, el('div', { class: 'spacer' }), el('span', { style: { fontSize: '12px', color: 'var(--fg-dim)' }, text: 'Items in Trash' }), btnEmpty);
    const list = el('div', { class: 'tr-list' });
    main.append(toolbar, list);

    async function refresh() {
      try { entries = (await FS.list('.Trash')).entries; } catch { entries = []; }
      sel = null;
      render();
    }
    function meta(name) { return (get('trash', {}))[name] || {}; }

    function render() {
      list.innerHTML = '';
      btnBack.disabled = btnDel.disabled = !sel;
      if (!entries.length) {
        list.append(el('div', { class: 'tr-empty', html: appIconSVG('trash', {}), }, el('b', { text: 'Trash is empty' }), el('span', { style: { fontSize: '12px' }, text: 'Items you move to the Trash appear here.' })));
        return;
      }
      for (const e of entries) {
        const m = meta(e.name);
        const row = el('div', { class: 'tr-row', dataset: { name: e.name }, 'data-testid': 'trash-item' },
          e.image ? el('img', { src: FS.rawUrl(e.path) }) : el('span', { html: e.kind === 'dir' ? folderSVG(36) : fileSVG(e) }),
          el('div', {}, el('div', { style: { fontWeight: '600' }, text: e.name }), el('div', { class: 'dim', text: e.kind === 'dir' ? 'Folder' : fmtBytes(e.size || 0) })),
          el('div', { class: 'dim', text: m.from ? `from /${m.from.split('/').slice(0, -1).join('/') || 'OpenOS'}` : 'unknown origin' }),
          el('div', { class: 'dim', text: m.at ? fmtStamp(m.at).split(' at ')[0] : '' }),
          el('div', { style: { display: 'flex', gap: '6px' } },
            el('button', { class: 'os-btn', text: 'Put Back', onclick: async (ev) => { ev.stopPropagation(); await restoreFromTrash(e.name); refresh(); } })));
        row.addEventListener('mousedown', () => {
          sel = e.name;
          list.querySelectorAll('.tr-row').forEach((r) => r.classList.toggle('sel', r === row));
          btnBack.disabled = btnDel.disabled = false;
        });
        row.addEventListener('contextmenu', (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          sel = e.name; render(); row.classList.add('sel'); btnBack.disabled = btnDel.disabled = false;
          showContextMenu(ev.clientX, ev.clientY, [
            { label: 'Put Back', 'data-testid': 'trash-restore', action: async () => { await restoreFromTrash(e.name); refresh(); } },
            { separator: true },
            { label: 'Delete Immediately…', action: async () => { if (confirm(`Permanently delete “${e.name}”?`)) { await deleteForever(e.name); refresh(); } } },
          ]);
        });
        list.append(row);
      }
    }

    btnBack.addEventListener('click', async () => { if (sel) { await restoreFromTrash(sel); refresh(); } });
    btnDel.addEventListener('click', async () => { if (sel && confirm(`Permanently delete “${sel}”?`)) { await deleteForever(sel); refresh(); } });
    btnEmpty.addEventListener('click', async () => { if (entries.length && confirm('Permanently delete all items in the Trash?')) { await emptyTrash(); refresh(); } });

    const off = bus.on('fschange', () => refresh());
    api._off = off;
    api._trash = { empty: () => btnEmpty.click(), refresh };
    refresh();
  },

  menus(win) {
    return [
      { title: 'File', items: [
        { label: 'Empty Trash…', action: () => win.api._trash && win.api._trash.empty() },
      ] },
    ];
  },
};
