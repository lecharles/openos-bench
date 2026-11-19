/* TextEdit — open/edit/save real text files through the FS API. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';
import { bus } from '../core/bus.js';

export function mountTextEdit(win, payload) {
  let path = payload.path || null;
  let dirty = false;
  let fname = payload.fname || 'Untitled.txt';

  win.body.innerHTML = `
    <div class="tedit-root">
      <div class="tedit-toolbar">
        <button class="btn small" id="${win.id}-save">${icon('docS', 12)} Save</button>
        <input class="field tedit-save-name" id="${win.id}-fname" value="${escapeHTML(fname)}" style="width:190px" aria-label="File name" spellcheck="false">
        <span style="font-size:12px;color:var(--text-2)" id="${win.id}-fpath">${path ? escapeHTML(path.split('/').slice(0, -1).join('/') + '/') : '~/Documents/'}</span>
      </div>
      <textarea id="${win.id}-ta" placeholder="Start typing…" spellcheck="false" aria-label="Text editor"></textarea>
      <div class="tedit-status" id="${win.id}-status">
        <span class="ts-dot"></span>
        <span id="${win.id}-savestate">Unsaved</span>
        <span id="${win.id}-stats"></span>
      </div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);
  const ta = $(`#${win.id}-ta`);
  win.__teditState = { get path() { return path; } };

  function setStatus() {
    const st = $(`#${win.id}-status`);
    st.classList.toggle('unsaved', dirty);
    st.classList.toggle('saved', !dirty);
    $(`#${win.id}-savestate`).textContent = dirty ? 'Modified' : 'Saved';
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    $(`#${win.id}-stats`).textContent = `${ta.value.length} characters · ${words} words`;
    win.setModified(dirty);
  }

  async function loadFile() {
    if (!path) {
      ta.value = payload.content || '';
      win.setTitle('Untitled — TextEdit');
      dirty = false;
      setStatus();
      return;
    }
    try {
      const r = await api.fs.readText(path);
      ta.value = r.text;
      fname = path.split('/').pop();
      $(`#${win.id}-fname`).value = fname;
      win.setTitle(`${fname} — TextEdit`);
      dirty = false;
      setStatus();
    } catch (e) {
      toast({ title: 'Cannot open file', body: e.message, app: 'textedit' });
      path = null;
      win.setTitle('Untitled — TextEdit');
    }
  }

  async function save() {
    try {
      let target = path;
      if (!target) {
        const name = $(`#${win.id}-fname`).value.trim() || 'Untitled.txt';
        target = name.startsWith('/') || name.startsWith('~') ? name : `~/Documents/${name}`;
      } else if ($(`#${win.id}-fname`).value.trim() && $(`#${win.id}-fname`).value.trim() !== path.split('/').pop()) {
        const newName = $(`#${win.id}-fname`).value.trim();
        const dir = path.split('/').slice(0, -1).join('/');
        const newTarget = `${dir}/${newName}`;
        await api.fs.rename(path, newTarget);
        target = newTarget;
      }
      await api.fs.write(target, ta.value);
      path = target;
      fname = target.split('/').pop();
      $(`#${win.id}-fname`).value = fname;
      $(`#${win.id}-fpath`).textContent = path.split('/').slice(0, -1).join('/') + '/';
      win.setTitle(`${fname} — TextEdit`);
      dirty = false;
      setStatus();
      toast({ title: 'Saved', body: fname, app: 'textedit' });
      bus.emit('fs:changed');
      win.save();
    } catch (e) {
      toast({ title: 'Save failed', body: e.message, app: 'textedit' });
    }
  }

  ta.addEventListener('input', () => { dirty = true; setStatus(); });
  $(`#${win.id}-save`).addEventListener('click', save);
  const keyHandler = (e) => {
    if (win.el.classList.contains('active') && (e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  };
  document.addEventListener('keydown', keyHandler);
  win.onclose = () => document.removeEventListener('keydown', keyHandler);

  loadFile();
}

export function serializeTextEdit(win) {
  return { path: win.__teditState?.path ?? null };
}
