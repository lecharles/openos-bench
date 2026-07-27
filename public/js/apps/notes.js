// Notes app
const AppNotes = {
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
  },

  async loadNotes() {
    try {
      const resp = await fetch('/api/notes');
      this.notes = await resp.json();
    } catch { this.notes = []; }
  },

  async saveNotes() {
    await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.notes) });
  },

  _renderSidebarOnly(container) {
    const list = container.querySelector('#notes-sidebar-list');
    if (!list) return;
    list.innerHTML = this.notes.map((n, i) => `
      <div class="app-sidebar-item notes-item${this.selectedNote === i ? ' active' : ''}" data-index="${i}">
        <div>
          <div class="item-title">${AppUtils.escapeHtml(n.title || 'Untitled')}</div>
          <div class="item-preview">${AppUtils.escapeHtml((n.body || '').substring(0, 40))}</div>
        </div>
      </div>
    `).join('');

    // Re-bind sidebar item clicks (idempotent, replaces old DOM anyway)
    list.querySelectorAll('.notes-item').forEach(el => {
      el.addEventListener('click', () => {
        this._selectNote(container, parseInt(el.dataset.index));
      });
    });
  },

  _setupListeners(container) {
    const newBtn = container.querySelector('#notes-new');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.notes.unshift({ title: '', body: '' });
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
    if (bodyEl) bodyEl.value = note.body || '';

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
    this.notes[this.selectedNote] = {
      title: titleEl?.value || '',
      body: bodyEl?.value || '',
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
        if (preview) preview.textContent = (n.body || '').substring(0, 40);
      }
    }
  }
};
