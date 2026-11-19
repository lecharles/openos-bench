/* Notes — three-pane, persisted to server JSON. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';

export function mountNotes(win, payload) {
  let notes = [];
  let selectedId = null;
  let saveTimer = null;

  win.body.innerHTML = `
    <div class="notes-root">
      <div class="sidebar notes-sidebar">
        <div class="sidebar-group">
          <div class="sidebar-heading">iCloud</div>
          <div class="sidebar-item selected">${icon('notes', 15)}<span>All iCloud</span><span class="si-count" id="${win.id}-count"></span></div>
        </div>
      </div>
      <div class="notes-list">
        <div class="notes-list-header">
          <input class="field" id="${win.id}-search" placeholder="Search" aria-label="Search notes">
          <button class="icon-btn" id="${win.id}-new" aria-label="New note" title="New note">${icon('compose', 14)}</button>
        </div>
        <div class="notes-list-body" id="${win.id}-list" style="flex:1;overflow-y:auto" role="listbox" aria-label="Notes"></div>
      </div>
      <div class="notes-editor">
        <textarea id="${win.id}-ta" placeholder="New note" aria-label="Note content" spellcheck="false"></textarea>
      </div>
    </div>`;

  const $ = (sel) => win.body.querySelector(sel);
  const listEl = $(`#${win.id}-list`);
  const ta = $(`#${win.id}-ta`);
  const searchEl = $(`#${win.id}-search`);
  win.__notesState = { get selectedId() { return selectedId; } };

  async function load() {
    notes = await api.store.get('notes').catch(() => []);
    if (!notes.length) {
      notes = [{ id: 'n' + Date.now(), body: 'Welcome to Notes', updated: Date.now(), created: Date.now() }];
      await persist();
    }
    if (payload.noteId && notes.some((n) => n.id === payload.noteId)) selectedId = payload.noteId;
    else if (payload.newNote) return newNote();
    else selectedId = (selectedId && notes.some((n) => n.id === selectedId)) ? selectedId : notes[0].id;
    renderList();
    renderEditor();
  }

  async function persist() {
    await api.store.put('notes', notes).catch((e) => toast({ title: 'Save failed', body: e.message, app: 'notes' }));
  }

  function noteTitle(n) { return (n.body || '').split('\n')[0].slice(0, 44) || 'New Note'; }

  function renderList() {
    const q = searchEl.value.trim().toLowerCase();
    const filtered = notes.filter((n) => !q || (n.body || '').toLowerCase().includes(q));
    listEl.innerHTML = filtered.map((n) => `
      <div class="note-row ${n.id === selectedId ? 'selected' : ''}" data-id="${n.id}" role="option" aria-selected="${n.id === selectedId}">
        <div class="nr-title">${escapeHTML(noteTitle(n))}</div>
        <div class="nr-snippet">${escapeHTML((n.body || '').split('\n').slice(1).join(' ').slice(0, 60) || 'No additional text')}</div>
        <div class="nr-date">${new Date(n.updated || n.created || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
      </div>`).join('');
    for (const el of listEl.querySelectorAll('.note-row')) {
      el.addEventListener('click', () => { selectedId = el.dataset.id; renderList(); renderEditor(); });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        import('../core/menu.js').then(({ contextMenu }) => contextMenu(e.clientX, e.clientY, [
          { label: 'Delete Note', danger: true, action: () => deleteNote(el.dataset.id) },
        ]));
      });
    }
    $(`#${win.id}-count`).textContent = notes.length ? notes.length : '';
  }

  function renderEditor() {
    const n = notes.find((x) => x.id === selectedId);
    ta.value = n ? n.body : '';
    ta.disabled = !n;
  }

  function scheduleSave() {
    const n = notes.find((x) => x.id === selectedId);
    if (!n) return;
    n.body = ta.value;
    n.updated = Date.now();
    renderList();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 500);
    win.save();
  }

  ta.addEventListener('input', scheduleSave);

  function newNote() {
    const n = { id: 'n' + Date.now().toString(36), body: '', updated: Date.now(), created: Date.now() };
    notes.unshift(n);
    selectedId = n.id;
    persist();
    renderList();
    renderEditor();
    ta.focus();
    win.save();
  }

  async function deleteNote(id) {
    notes = notes.filter((n) => n.id !== id);
    if (selectedId === id) selectedId = notes.length ? notes[0].id : null;
    await persist();
    renderList();
    renderEditor();
    win.save();
  }

  $(`#${win.id}-new`).addEventListener('click', newNote);
  searchEl.addEventListener('input', renderList);

  load();
}

export function serializeNotes(win) {
  return { noteId: win.__notesState?.selectedId ?? null };
}
