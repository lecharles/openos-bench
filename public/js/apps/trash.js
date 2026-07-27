// Trash app
const AppTrash = {
  items: [
    { name: 'old_script.sh', date: 'Jul 25', size: '2.3 KB' },
    { name: 'draft.txt', date: 'Jul 23', size: '456 B' },
    { name: 'temp_data.json', date: 'Jul 20', size: '15 KB' },
  ],

  render(container) {
    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;font-size:16px;">🗑️ Trash</span>
        <span style="flex:1;"></span>
        <button class="app-btn" id="trash-empty">Empty Trash</button>
      </div>
      <div id="trash-list" class="app-list"></div>
    `;

    this.renderList(container);
    this.setupListeners(container);
  },

  renderList(container) {
    const list = container.querySelector('#trash-list');
    if (this.items.length === 0) {
      list.innerHTML = '<div class="app-empty">🗑️ Trash is empty</div>';
      return;
    }
    list.innerHTML = this.items.map((item, i) => `
      <div class="app-list-item" style="padding:10px 12px;">
        <span style="font-size:20px;">📄</span>
        <span style="flex:1;">${item.name}</span>
        <span style="font-size:11px;color:#999;">${item.date}</span>
        <span style="font-size:11px;color:#999;margin-left:8px;">${item.size}</span>
        <button class="app-btn" data-restore="${i}" style="font-size:10px;padding:2px 6px;margin-left:8px;">Restore</button>
      </div>
    `).join('');
  },

  setupListeners(container) {
    container.querySelector('#trash-empty')?.addEventListener('click', () => {
      if (confirm('Permanently delete all items in Trash?')) {
        this.items = [];
        this.renderList(container);
        this.setupListeners(container);
        Notifications.add('Trash', 'Trash emptied');
      }
    });

    container.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.restore);
        const item = this.items.splice(idx, 1)[0];
        Notifications.add('Trash', `"${item.name}" restored`);
        this.renderList(container);
        this.setupListeners(container);
      });
    });
  }
};
