import { el, debounce, esc } from '../core/util.js';
import { FS, dedupeName } from '../core/fsapi.js';
import { bus } from '../core/bus.js';
import { toast } from '../core/toast.js';

export default {
  id: 'textedit',
  name: 'TextEdit',
  size: { w: 680, h: 520 },
  minW: 400, minH: 300,
  singleton: false,
  keywords: 'text editor write document',

  mount(root, api) {
    let path = api.params.path || null;
    let dirty = false;
    let savedContent = '';
    root.classList.add('te');

    const toolbar = el('div', { class: 'app-toolbar' });
    const btnNew = el('button', { class: 'os-btn', text: 'New' });
    const btnOpen = el('button', { class: 'os-btn', text: 'Open…' });
    const btnSave = el('button', { class: 'os-btn primary', text: 'Save', title: '⌘S' });
    const btnMono = el('button', { class: 'os-btn icon-only', title: 'Monospace', text: 'M' });
    toolbar.append(btnNew, btnOpen, btnSave, el('div', { class: 'spacer' }), btnMono);
    const ta = el('textarea', { spellcheck: 'false', placeholder: 'Start typing…', 'data-testid': 'textedit-area' });
    const status = el('div', { class: 'app-statusbar' });
    root.append(toolbar, ta, status);

    function setTitle() {
      const name = path ? path.split('/').pop() : 'Untitled';
      api.setTitle(name + (dirty ? ' — Edited' : ''));
    }
    function updStatus() {
      const words = (ta.value.trim().match(/\S+/g) || []).length;
      status.textContent = `${words} words · ${ta.value.length} characters   ·   ${path ? '/' + path : 'not saved'}`;
    }

    async function load(p) {
      path = p;
      api.params.path = p;
      try {
        const r = await FS.read(p);
        if (r.binary) { toast('Cannot open', 'That file is not plain text.', 'textedit'); return; }
        ta.value = r.content;
        savedContent = r.content;
        dirty = false;
      } catch (e) {
        ta.value = '';
        toast('Open failed', String(e.message), 'textedit');
      }
      setTitle(); updStatus();
    }

    async function save(as = false) {
      if (!path || as) {
        const name = await askSaveName(path ? path.split('/').pop() : 'Untitled.txt');
        if (!name) return;
        path = name;
        api.params.path = path;
      }
      await FS.write(path, ta.value);
      savedContent = ta.value;
      dirty = false;
      setTitle(); updStatus();
      bus.emit('fschange', { type: 'write', path });
      toast('Saved', `/${path}`, 'textedit');
    }

    function askSaveName(def) {
      return new Promise((resolve) => {
        const back = el('div', { class: 'os-modal-backdrop' });
        const input = el('input', { class: 'os-input', value: def, style: { width: '100%' } });
        const loc = el('select', { class: 'os-input' }, ['Documents', 'Desktop', 'Downloads'].map((d) => el('option', { value: d, text: d })));
        const modal = el('div', { class: 'os-modal' },
          el('h3', { text: 'Save file' }),
          el('div', { class: 'sub', text: 'Choose a name and location inside the OpenOS filesystem.' }),
          el('div', { style: { display: 'flex', gap: '8px' } }, loc, input),
          el('div', { class: 'actions' },
            el('button', { class: 'os-btn', text: 'Cancel', onclick: () => { back.remove(); resolve(null); } }),
            el('button', { class: 'os-btn primary', text: 'Save', onclick: async () => {
              let name = input.value.trim();
              if (!name) return;
              if (!/\./.test(name)) name += '.txt';
              const dir = loc.value;
              const listing = await FS.list(dir).catch(() => ({ entries: [] }));
              if (path !== `${dir}/${name}`) name = dedupeName(listing.entries, name);
              back.remove();
              resolve(`${dir}/${name}`);
            } })));
        back.append(modal);
        root.append(back);
        input.focus(); input.select();
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') modal.querySelectorAll('.os-btn.primary')[0].click();
          if (e.key === 'Escape') { back.remove(); resolve(null); }
        });
      });
    }

    function openPicker() {
      const back = el('div', { class: 'os-modal-backdrop' });
      const listEl = el('div', { style: { maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' } });
      const modal = el('div', { class: 'os-modal', style: { width: '360px' } },
        el('h3', { text: 'Open file' }),
        el('div', { class: 'sub', text: 'Text documents in your OpenOS folders.' }), listEl);
      back.append(modal);
      root.append(back);
      back.addEventListener('mousedown', (e) => { if (e.target === back) back.remove(); });
      (async () => {
        for (const dir of ['Documents', 'Desktop', 'Downloads', 'Documents/Projects']) {
          let entries = [];
          try { entries = (await FS.list(dir)).entries.filter((e) => e.text); } catch { continue; }
          if (!entries.length) continue;
          listEl.append(el('div', { class: 'side-h', text: dir }));
          for (const f of entries) {
            const row = el('div', { class: 'side-row', style: { background: 'var(--hover)' } }, el('span', { text: f.name }));
            row.addEventListener('click', () => { back.remove(); load(f.path); });
            listEl.append(row);
          }
        }
        if (!listEl.children.length) listEl.append(el('div', { class: 'empty-hint' }, 'No text files found'));
      })();
    }

    const markDirty = debounce(() => { dirty = ta.value !== savedContent; setTitle(); }, 120);
    ta.addEventListener('input', () => { updStatus(); markDirty(); });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    });
    btnNew.addEventListener('click', () => { path = null; api.params.path = null; ta.value = ''; savedContent = ''; dirty = false; setTitle(); updStatus(); ta.focus(); });
    btnOpen.addEventListener('click', openPicker);
    btnSave.addEventListener('click', () => save());
    btnMono.addEventListener('click', () => { root.classList.toggle('ruler'); btnMono.classList.toggle('toggled'); });

    api.openPath = (p) => load(p);
    api._te = { save: () => save() };
    if (path) load(path); else { setTitle(); updStatus(); }
  },

  onRelaunch(api, opts) {
    if (opts.params && opts.params.path && api.openPath) api.openPath(opts.params.path);
  },

  menus(win) {
    return [
      { title: 'File', items: [
        { label: 'Save', shortcut: '⌘S', action: () => win.api._te.save() },
      ] },
    ];
  },
};
