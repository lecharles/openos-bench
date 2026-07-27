// Reminders app
const AppReminders = {
  reminders: [],

  async render(container) {
    await this.loadReminders();

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;font-size:16px;">Reminders</span>
        <span style="flex:1;"></span>
        <button class="app-btn primary" id="rem-add">+ New Reminder</button>
      </div>
      <div id="rem-list"></div>
      <div id="rem-editor" style="display:none;"></div>
    `;

    this._renderList(container);
    this._setupListeners(container);
  },

  async loadReminders() {
    try { const r = await fetch('/api/reminders'); this.reminders = await r.json(); } catch { this.reminders = []; }
  },

  async saveReminders() {
    await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.reminders) });
  },

  _renderList(container) {
    const list = container.querySelector('#rem-list');
    if (!list) return;
    if (this.reminders.length === 0) {
      list.innerHTML = '<div class="app-empty">No reminders</div>';
      return;
    }
    list.innerHTML = this.reminders.map((r, i) => `
      <div class="app-list-item" style="padding:10px 12px;display:flex;align-items:center;gap:10px;">
        <input type="checkbox" ${r.done ? 'checked' : ''} data-index="${i}" class="rem-checkbox" style="width:18px;height:18px;cursor:pointer;">
        <span style="flex:1;text-decoration:${r.done ? 'line-through' : 'none'};color:${r.done ? '#999' : '#1d1d1f'};">${AppUtils.escapeHtml(r.title)}</span>
        <span style="font-size:11px;color:#999;">${AppUtils.escapeHtml(r.date || '')}</span>
        <button class="app-btn rem-del-btn" data-index="${i}" style="font-size:10px;padding:2px 6px;">✕</button>
      </div>
    `).join('');

    // Bind per-item events here (DOM is fresh)
    list.querySelectorAll('.rem-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.index);
        this.reminders[idx].done = cb.checked;
        this.saveReminders();
        this._renderList(container);
      });
    });

    list.querySelectorAll('.rem-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this.reminders.splice(idx, 1);
        this.saveReminders();
        this._renderList(container);
      });
    });
  },

  _setupListeners(container) {
    const addBtn = container.querySelector('#rem-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const editor = container.querySelector('#rem-editor');
        editor.style.display = 'block';
        editor.innerHTML = `
          <input type="text" id="rem-title" class="app-input" placeholder="Reminder title" style="width:100%;margin-bottom:8px;">
          <input type="date" id="rem-date" class="app-input" style="margin-bottom:8px;">
          <button class="app-btn primary" id="rem-save">Save</button>
          <button class="app-btn" id="rem-cancel">Cancel</button>
        `;
        editor.querySelector('#rem-save').addEventListener('click', () => {
          const title = editor.querySelector('#rem-title').value;
          const date = editor.querySelector('#rem-date').value;
          if (title) {
            this.reminders.push({ title, date, done: false });
            this.saveReminders();
            this._renderList(container);
            editor.style.display = 'none';
          }
        });
        editor.querySelector('#rem-cancel').addEventListener('click', () => { editor.style.display = 'none'; });
      });
    }
  }
};
