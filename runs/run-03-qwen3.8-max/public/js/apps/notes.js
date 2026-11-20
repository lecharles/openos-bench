import { el, uid, fmtRel, debounce, esc } from '../core/util.js';
import { get, set } from '../core/state.js';
import { showContextMenu } from '../core/contextmenu.js';

function seed() {
  const now = Date.now();
  return [
    { id: uid(), title: 'Welcome to OpenOS', pinned: true, updated: now, body: 'This is Notes — everything you type is saved to the server instantly.\n\nTry:\n• Create a note with the + button (or ⌘N)\n• Pin notes you care about\n• Right-click a note for more actions\n• Reload the page — your notes survive\n\nNotes lives in the same persisted state as your windows, theme and wallpaper.' },
    { id: uid(), title: 'Groceries', pinned: false, updated: now - 3600e3, body: 'Oat milk\nSourdough loaf\nAvocados (the ripe ones this time)\nEspresso beans — dark roast\nBasil, lots of it\nParmesan' },
    { id: uid(), title: 'OpenOS launch ideas', pinned: false, updated: now - 26 * 3600e3, body: 'Ship checklist\n\n1. Record a 60-second demo clip (dock magnification + genie minimize)\n2. Post to the bench channel with the STATUS.md summary\n3. Collect probe scores, triage the misses\n4. v1.1: Mission Control, Spaces, snap layouts' },
  ];
}

export default {
  id: 'notes',
  name: 'Notes',
  size: { w: 760, h: 520 },
  minW: 480, minH: 320,
  keywords: 'note memo write',

  mount(root, api) {
    if (!get('notes.seeded', false)) {
      set('notes.items', seed(), true);
      set('notes.seeded', true, true);
    }
    let items = get('notes.items', []);
    let selId = items[0]?.id || null;
    let search = '';

    root.classList.add('app', 'notes');
    const sidebar = el('aside', { class: 'app-sidebar', style: { width: '218px' } });
    const editor = el('div', { class: 'n-editor' });
    root.append(sidebar, editor);

    const searchIn = el('input', { class: 'os-input', type: 'search', placeholder: 'Search', style: { margin: '2px 2px 8px' } });
    const newBtn = el('button', { class: 'os-btn icon-only', title: 'New Note', html: '<svg width="13" height="13" viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' });
    const sideTop = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, searchIn, newBtn);
    const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } });
    sidebar.append(sideTop, list);

    const titleIn = el('input', { class: 'n-title-in', placeholder: 'New Note' });
    const dateEl = el('div', { class: 'n-date' });
    const bodyIn = el('textarea', { placeholder: 'Start writing…', spellcheck: 'false' });
    const wordEl = el('div', { class: 'app-statusbar' });
    editor.append(titleIn, dateEl, bodyIn, wordEl);

    const persist = () => set('notes.items', items, true);
    const sorted = () => [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated);

    function renderList() {
      list.innerHTML = '';
      const q = search.toLowerCase();
      const shown = sorted().filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
      let pinnedHeaderDone = false;
      for (const n of shown) {
        if (n.pinned && !pinnedHeaderDone) { list.append(el('div', { class: 'side-h', text: 'Pinned' })); pinnedHeaderDone = true; }
        if (!n.pinned && pinnedHeaderDone && shown.some((x) => !x.pinned) && !list.querySelector('.unp-h')) {
          list.append(el('div', { class: 'side-h unp-h', text: 'Notes' }));
        }
        const row = el('div', { class: 'n-row side-row' + (n.id === selId ? ' on' : ''), dataset: { id: n.id }, style: { flexDirection: 'column', alignItems: 'stretch', gap: '0' } },
          el('div', { class: 'n-title' }, n.pinned ? el('span', { class: 'pin', html: '<svg viewBox="0 0 12 12" width="9" height="9"><path d="M6 1.5 8.5 4 7.5 7H4.5L3.5 4zM6 7v3.5M3 4h6" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' }) : null, el('span', { text: n.title || 'New Note' })),
          el('div', { class: 'n-meta' }, el('span', { text: fmtRel(n.updated) }), el('span', { class: 'n-snippet', text: (n.body || '').split('\n')[0].slice(0, 34) })));
        row.addEventListener('click', () => select(n.id));
        row.addEventListener('contextmenu', (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          showContextMenu(ev.clientX, ev.clientY, [
            { label: n.pinned ? 'Unpin' : 'Pin', action: () => { n.pinned = !n.pinned; persist(); renderList(); } },
            { label: 'Duplicate', action: () => { const c = { ...n, id: uid(), title: n.title + ' copy', pinned: false, updated: Date.now() }; items.push(c); persist(); select(c.id); } },
            { separator: true },
            { label: 'Delete', action: () => del(n.id) },
          ]);
        });
        list.append(row);
      }
      if (!shown.length) list.append(el('div', { class: 'empty-hint', style: { padding: '20px' } }, 'No notes'));
    }

    function current() { return items.find((n) => n.id === selId); }

    function select(id) {
      selId = id;
      const n = current();
      renderList();
      if (!n) { titleIn.value = ''; bodyIn.value = ''; dateEl.textContent = ''; wordEl.textContent = ''; titleIn.disabled = bodyIn.disabled = true; return; }
      titleIn.disabled = bodyIn.disabled = false;
      titleIn.value = n.title;
      bodyIn.value = n.body;
      dateEl.textContent = fmtRel(n.updated);
      updateWords();
    }

    function updateWords() {
      const words = (bodyIn.value.trim().match(/\S+/g) || []).length;
      wordEl.textContent = `${words} words · ${bodyIn.value.length} characters`;
    }

    const autosave = debounce(() => {
      const n = current();
      if (!n) return;
      n.title = titleIn.value.trim() || 'New Note';
      n.body = bodyIn.value;
      n.updated = Date.now();
      persist();
      renderList();
      dateEl.textContent = fmtRel(n.updated);
    }, 350);

    titleIn.addEventListener('input', autosave);
    bodyIn.addEventListener('input', () => { updateWords(); autosave(); });
    for (const i of [titleIn, bodyIn]) i.addEventListener('keydown', (e) => e.stopPropagation());
    searchIn.addEventListener('input', () => { search = searchIn.value; renderList(); });
    searchIn.addEventListener('keydown', (e) => e.stopPropagation());

    function newNote() {
      const n = { id: uid(), title: 'New Note', body: '', pinned: false, updated: Date.now() };
      items.push(n);
      persist();
      select(n.id);
      titleIn.focus(); titleIn.select();
    }
    function del(id) {
      items = items.filter((n) => n.id !== id);
      persist();
      if (selId === id) selId = sorted()[0]?.id || null;
      select(selId);
    }
    newBtn.addEventListener('click', newNote);

    api._app = {
      newNote,
      del: () => selId && del(selId),
      pin: () => { const n = current(); if (n) { n.pinned = !n.pinned; persist(); renderList(); } },
    };

    renderList();
    select(selId);
  },

  menus(win) {
    const a = win.api._app;
    return [
      { title: 'File', items: [
        { label: 'New Note', shortcut: '⌘N', action: () => a.newNote() },
        { separator: true },
        { label: 'Delete Note', action: () => a.del() },
      ] },
      { title: 'Edit', items: [
        { label: 'Pin / Unpin', action: () => a.pin() },
      ] },
    ];
  },
};
