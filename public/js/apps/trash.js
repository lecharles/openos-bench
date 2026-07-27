// Trash app
window.AppTrash = {
  render(container) {
    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;font-size:16px;">🗑️ Trash</span>
        <span style="flex:1;"></span>
        <button class="app-btn" id="trash-empty">Empty Trash</button>
      </div>
      <div id="trash-list" class="app-list"></div>
    `;

    // Bind persistent toolbar button exactly once
    container.querySelector('#trash-empty').addEventListener('click', async () => {
      if (!confirm('Permanently delete all items in Trash?')) return;
      try {
        const resp = await fetch('/api/trash/empty', { method: 'POST' });
        const data = await resp.json();
        if (!resp.ok) {
          Notifications.add('Trash', data.error || 'Failed to empty Trash');
          return;
        }
        Notifications.add('Trash', 'Trash emptied');
        this.load(container);
      } catch (e) {
        Notifications.add('Trash', 'Failed to empty Trash: ' + e.message);
      }
    });

    this.load(container);
  },

  async load(container) {
    const list = container.querySelector('#trash-list');
    list.innerHTML = '<div class="app-empty">Loading...</div>';

    let items;
    try {
      const resp = await fetch('/api/trash');
      items = await resp.json();
    } catch (e) {
      list.innerHTML = '<div class="app-empty">Failed to load Trash</div>';
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<div class="app-empty">🗑️ Trash is empty</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="app-list-item" style="padding:10px 12px;">
        <span style="font-size:20px;">📄</span>
        <span style="flex:1;">${AppUtils.escapeHtml(item.name)}</span>
        <span style="font-size:11px;color:#999;">${AppUtils.escapeHtml(new Date(item.deletedAt).toLocaleDateString())}</span>
        <button class="app-btn" data-restore="${AppUtils.escapeHtml(item.id)}" style="font-size:10px;padding:2px 6px;margin-left:8px;">Restore</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const resp = await fetch('/api/trash/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: btn.dataset.restore })
          });
          const data = await resp.json();
          if (!resp.ok) {
            Notifications.add('Trash', data.error || 'Restore failed');
            return;
          }
          Notifications.add('Trash', 'Item restored');
          this.load(container);
        } catch (e) {
          Notifications.add('Trash', 'Restore failed: ' + e.message);
        }
      });
    });
  }
};
