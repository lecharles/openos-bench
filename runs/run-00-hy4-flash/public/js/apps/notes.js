// Notes app
window.AppNotes = {
  notes: [],
  selectedNote: null,
  _renderDebounce: null,

  async render(container) {
    await this.loadNotes();
    container.innerHTML = `
      <div class="app-split">
        <div class="app-sidebar">
          <div class="app-sidebar-header">
            <button class="app-btn primary" id="notes-new" style="width:100%;">+ New Note</button>
          </div>
          <div class="app-sidebar-list" id="notes-sidebar-list"></div>
        </div>
        <div class="app-detail" id="notes-editor-area">
          <div class="app-notes-placeholder" id="notes-placeholder">Select a note or create a new one</div>
          <div id="notes-editor" style="display:none;flex:1;flex-direction:column;padding:0 16px;">
            <input type="text" id="notes-title" class="app-notes-title" placeholder="Title">
            <textarea id="notes-body" class="app-notes-body" placeholder="Start writing..."></textarea>
          </div>
        </div>
      </div>
    `;

    this._renderSidebarOnly(container);
    this._setupListeners(container);
    if (this.selectedNote === null && this.notes.length) this._selectNote(container, 0);
  },

  async loadNotes() {
    try {
      const resp = await fetch('/api/notes');
      const notes = await resp.json();
      // Migrate legacy {title, body} notes to canonical {id, title, content, updated}
      this.notes = (Array.isArray(notes) ? notes : []).map(n => ({
        id: n.id || Date.now().toString() + Math.random().toString(36).slice(2, 8),
        title: n.title || '',
        content: n.content !== undefined ? n.content : (n.body || ''),
        updated: n.updated || Date.now(),
      }));
    } catch { this.notes = []; }
    if (this.notes.length === 0) {
      this.notes = [{
        id: 'welcome-' + Date.now(),
        title: 'Welcome to Notes',
        content: 'Your notes are saved on the server.\n\nType here, then reload — everything comes back.',
        updated: Date.now(),
      }];
      this.saveNotes();
    }
  },

  async saveNotes() {
    await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.notes) });
  },

  _renderSidebarOnly(container) {
    const list = container.querySelector('#notes-sidebar-list');
    if (!list) return;
    list.innerHTML = this.notes.map((n, i) => `
      <div class="app-sidebar-item notes-item${this.selectedNote === i ? ' active' : ''}" data-index="${i}">
        <div style="flex:1;min-width:0;">
          <div class="item-title">${AppUtils.escapeHtml(n.title || 'Untitled')}</div>
          <div class="item-preview">${AppUtils.escapeHtml((n.content || '').substring(0, 40))}</div>
        </div>
        <button class="app-btn notes-del-btn" data-index="${i}" style="font-size:10px;padding:2px 6px;flex-shrink:0;">✕</button>
      </div>
    `).join('');

    // Re-bind sidebar item clicks (idempotent, replaces old DOM anyway)
    list.querySelectorAll('.notes-item').forEach(el => {
      el.addEventListener('click', () => {
        this._selectNote(container, parseInt(el.dataset.index));
      });
    });

    list.querySelectorAll('.notes-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const note = this.notes[idx];
        if (!note) return;
        if (!confirm(`Delete "${note.title || 'Untitled'}"?`)) return;
        this.notes.splice(idx, 1);
        if (this.selectedNote === idx) {
          this.selectedNote = null;
          const placeholder = container.querySelector('#notes-placeholder');
          const editor = container.querySelector('#notes-editor');
          if (placeholder) placeholder.style.display = '';
          if (editor) editor.style.display = 'none';
        } else if (this.selectedNote > idx) {
          this.selectedNote--;
        }
        this.saveNotes();
        this._renderSidebarOnly(container);
      });
    });
  },

  _setupListeners(container) {
    const newBtn = container.querySelector('#notes-new');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.notes.unshift({ id: Date.now().toString(), title: '', content: '', updated: Date.now() });
        this.selectedNote = 0;
        this._selectNote(container, 0);
        this._renderSidebarOnly(container);
      });
    }

    // Sidebar items are bound in _renderSidebarOnly

    const titleEl = container.querySelector('#notes-title');
    const bodyEl = container.querySelector('#notes-body');
    if (titleEl && bodyEl) {
      const save = AppUtils.debounce(() => this._updateCurrentNote(container), 300);
      titleEl.addEventListener('input', save);
      bodyEl.addEventListener('input', save);
    }
  },

  _selectNote(container, index) {
    this.selectedNote = index;
    const note = this.notes[index];
    if (!note) return;

    const placeholder = container.querySelector('#notes-placeholder');
    const editor = container.querySelector('#notes-editor');
    if (placeholder) placeholder.style.display = 'none';
    if (editor) editor.style.display = 'flex';

    const titleEl = container.querySelector('#notes-title');
    const bodyEl = container.querySelector('#notes-body');
    if (titleEl) titleEl.value = note.title || '';
    if (bodyEl) bodyEl.value = note.content || '';

    // Update active state in sidebar
    const sidebar = container.querySelector('#notes-sidebar-list');
    if (sidebar) {
      sidebar.querySelectorAll('.notes-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });
    }
  },

  _updateCurrentNote(container) {
    if (this.selectedNote === null) return;
    const titleEl = container.querySelector('#notes-title');
    const bodyEl = container.querySelector('#notes-body');
    const current = this.notes[this.selectedNote] || {};
    this.notes[this.selectedNote] = {
      id: current.id || Date.now().toString(),
      title: titleEl?.value || '',
      content: bodyEl?.value || '',
      updated: Date.now(),
    };
    this.saveNotes();
    // Only update sidebar preview text, don't re-bind everything
    const list = container.querySelector('#notes-sidebar-list');
    if (list && this.selectedNote !== null) {
      const items = list.querySelectorAll('.notes-item');
      const item = items[this.selectedNote];
      if (item) {
        const n = this.notes[this.selectedNote];
        const title = item.querySelector('.item-title');
        const preview = item.querySelector('.item-preview');
        if (title) title.textContent = n.title || 'Untitled';
        if (preview) preview.textContent = (n.content || '').substring(0, 40);
      }
    }
  }
};
