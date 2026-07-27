// Notes app
const AppNotes = {
  notes: [],
  selectedNote: null,

  async render(container) {
    await this.loadNotes();
    container.innerHTML = `
      <div style="display:flex;height:100%;gap:1px;">
        <div style="width:220px;border-right:1px solid rgba(0,0,0,0.08);overflow-y:auto;flex-shrink:0;" id="notes-sidebar"></div>
        <div style="flex:1;display:flex;flex-direction:column;" id="notes-editor-area">
          <div class="app-empty" id="notes-placeholder">Select a note or create a new one</div>
          <div id="notes-editor" style="display:none;flex:1;display:none;flex-direction:column;padding:0 0 0 16px;">
            <input type="text" id="notes-title" class="app-input" placeholder="Title" style="font-size:18px;font-weight:600;margin-bottom:8px;border:none;padding:4px 0;">
            <textarea id="notes-body" class="app-input" placeholder="Start writing..." style="flex:1;border:none;font-size:14px;padding:4px 0;resize:none;"></textarea>
          </div>
        </div>
      </div>
    `;

    this.renderSidebar(container);
    this.setupListeners(container);
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

  renderSidebar(container) {
    const sidebar = container.querySelector('#notes-sidebar');
    sidebar.innerHTML = `
      <div style="padding:8px;">
        <button class="app-btn primary" id="notes-new" style="width:100%;">+ New Note</button>
      </div>
      ${this.notes.map((n, i) => `
        <div class="app-list-item notes-item" data-index="${i}">
          <div>
            <div style="font-weight:500;">${n.title || 'Untitled'}</div>
            <div style="font-size:11px;color:#999;">${(n.body || '').substring(0, 40)}</div>
          </div>
        </div>
      `).join('')}
    `;
  },

  setupListeners(container) {
    container.querySelector('#notes-new').addEventListener('click', () => {
      this.notes.unshift({ title: '', body: '' });
      this.selectNote(container, 0);
      this.renderSidebar(container);
    });

    container.querySelectorAll('.notes-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectNote(container, parseInt(el.dataset.index));
      });
    });

    const titleEl = container.querySelector('#notes-title');
    const bodyEl = container.querySelector('#notes-body');
    if (titleEl) {
      titleEl.addEventListener('input', () => this.updateCurrentNote(container));
      bodyEl.addEventListener('input', () => this.updateCurrentNote(container));
    }
  },

  selectNote(container, index) {
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
  },

  updateCurrentNote(container) {
    if (this.selectedNote === null) return;
    const titleEl = container.querySelector('#notes-title');
    const bodyEl = container.querySelector('#notes-body');
    this.notes[this.selectedNote] = {
      title: titleEl?.value || '',
      body: bodyEl?.value || '',
    };
    this.saveNotes();
    this.renderSidebar(container);
    this.setupListeners(container);
  }
};
