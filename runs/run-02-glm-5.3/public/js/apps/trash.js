/* Trash — list / restore / empty, backed by the server trash store. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { bus } from '../core/bus.js';
import { iconForEntry } from '../core/icons.js';
import { escapeHTML } from '../core/toast.js';

export function mountTrash(win) {
  let items = [];
  let confirmEmpty = false;

  win.body.innerHTML = `
    <div class="trash-root">
      <div class="trash-toolbar">
        <button class="btn danger small" id="${win.id}-empty">Empty</button>
        <span id="${win.id}-hint" style="font-size:12.5px;color:var(--text-2)">Items moved here can be restored.</span>
      </div>
      <div class="trash-list" id="${win.id}-list" role="list" aria-label="Trash items"></div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  async function load() {
    try {
      const r = await api.fs.listTrash();
      items = r.items || [];
    } catch { items = []; }
    render();
  }

  function render() {
    const list = $(`#${win.id}-list`);
    if (!items.length) {
      list.innerHTML = `<div class="empty-state" style="flex:1;display:flex">${icon('trash', 64)}<div>Trash is empty</div></div>`;
      $(`#${win.id}-empty`).disabled = true;
    } else {
      $(`#${win.id}-empty`).disabled = false;
      list.innerHTML = items.map((it) => `
        <div class="trash-item" data-id="${it.id}" role="listitem">
          <div style="width:44px;height:44px;display:grid;place-items:center">${icon(it.isDir ? 'folder' : iconForEntry({ kind: 'text' }), 40)}</div>
          <div>
            <div class="ti-name">${escapeHTML(it.name)}</div>
            <div class="ti-path">was: ${escapeHTML(it.origPath)}</div>
          </div>
          <div class="ti-date">${new Date(it.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          <button class="btn small" data-restore="${it.id}">Put Back</button>
        </div>`).join('');
      for (const b of list.querySelectorAll('[data-restore]')) {
        b.addEventListener('click', async () => {
          try {
            const r = await api.fs.restore(b.dataset.restore);
            toast({ title: 'Restored', body: r.restoredTo.split('/').pop(), app: 'finder' });
            bus.emit('fs:changed');
            bus.emit('trash:changed');
            load();
          } catch (e) { toast({ title: 'Restore failed', body: e.message, app: 'trash' }); }
        });
      }
    }
    const eb = $(`#${win.id}-empty`);
    eb.textContent = confirmEmpty ? 'Confirm Empty' : 'Empty';
    eb.classList.toggle('danger', confirmEmpty);
  }

  $(`#${win.id}-empty`).addEventListener('click', async () => {
    if (!items.length) return;
    if (!confirmEmpty) { confirmEmpty = true; render(); setTimeout(() => { confirmEmpty = false; render(); }, 2600); return; }
    try {
      await api.fs.emptyTrash();
      toast({ title: 'Trash emptied', app: 'trash' });
      confirmEmpty = false;
      bus.emit('fs:changed');
      bus.emit('trash:changed');
      load();
    } catch (e) { toast({ title: 'Empty failed', body: e.message, app: 'trash' }); }
  });

  const off = bus.on('trash:changed', load);
  win.onclose = () => off();
  load();
}

export function serializeTrash() { return {}; }
