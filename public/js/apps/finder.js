// Finder - file browser
window.AppFinder = {
  currentDir: '/root',
  _back: [],
  _fwd: [],

  async render(container, opts) {
    if (opts && opts.dir) this.currentDir = opts.dir;
    container.innerHTML = `
      <div class="app-toolbar">
        <button id="finder-back">◀</button>
        <button id="finder-fwd">▶</button>
        <button id="finder-home">🏠 Home</button>
        <span class="app-spacer"></span>
        <span id="finder-path" class="app-finder-path">${AppUtils.escapeHtml(this.currentDir)}</span>
      </div>
      <div id="finder-list" class="app-list" style="flex:1;overflow-y:auto;"></div>
    `;

    container.querySelector('#finder-back').addEventListener('click', () => {
      if (this._back.length === 0) return;
      this._fwd.push(this.currentDir);
      this.currentDir = this._back.pop();
      this.loadDir(container);
    });
    container.querySelector('#finder-fwd').addEventListener('click', () => {
      if (this._fwd.length === 0) return;
      this._back.push(this.currentDir);
      this.currentDir = this._fwd.pop();
      this.loadDir(container);
    });
    container.querySelector('#finder-home').addEventListener('click', () => {
      this.navigate(container, '/root');
    });

    await this.loadDir(container);
  },

  // Navigate to a new directory, pushing current location onto the back stack
  navigate(container, dir) {
    this._back.push(this.currentDir);
    this._fwd = [];
    this.currentDir = dir;
    this.loadDir(container);
  },

  async loadDir(container) {
    const list = container.querySelector('#finder-list');
    const pathSpan = container.querySelector('#finder-path');
    list.innerHTML = '<div class="app-empty">Loading...</div>';

    try {
      const resp = await fetch(`/api/fs?dir=${encodeURIComponent(this.currentDir)}`);
      const data = await resp.json();
      if (data.error) { list.innerHTML = `<div class="app-empty">Error: ${AppUtils.escapeHtml(data.error)}</div>`; return; }

      pathSpan.textContent = data.path;
      this.currentDir = data.path;

      // Parent dir
      if (data.path !== '/') {
        const parentItem = document.createElement('div');
        parentItem.className = 'app-list-item';
        parentItem.innerHTML = '<span class="app-finder-item-icon">📂</span> <span style="font-weight:var(--weight-medium);">..</span>';
        parentItem.addEventListener('dblclick', () => {
          const parts = this.currentDir.split('/').filter(Boolean);
          parts.pop();
          if (parts.length === 0) {
            // '/' is outside the allowed roots — stay put
            Notifications.add('Finder', 'Cannot go above this folder (access restricted)');
            return;
          }
          this.navigate(container, '/' + parts.join('/'));
        });
        list.appendChild(parentItem);
      }

      // Sort: directories first, then files
      const sorted = [...data.entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      sorted.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'app-list-item';
        const icon = entry.type === 'directory' ? '📁' : AppUtils.getFileIcon(entry.name);
        const sizeStr = entry.type === 'file' ? AppUtils.formatSize(entry.size) : '--';
        item.innerHTML = `
          <span class="app-finder-item-icon">${icon}</span>
          <span class="app-finder-item-name">${AppUtils.escapeHtml(entry.name)}</span>
          <span class="app-finder-item-size">${sizeStr}</span>
        `;
        item.addEventListener('dblclick', () => {
          const base = this.currentDir.replace(/\/+$/, '');
          if (entry.type === 'directory') {
            this.navigate(container, base + '/' + entry.name);
          } else {
            this.openFile(base + '/' + entry.name, entry.name);
          }
        });

        // Move to Trash action
        const trashBtn = document.createElement('button');
        trashBtn.className = 'app-btn';
        trashBtn.textContent = '🗑';
        trashBtn.title = 'Move to Trash';
        trashBtn.style.cssText = 'font-size:11px;padding:2px 6px;margin-left:8px;';
        trashBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const base = this.currentDir.replace(/\/+$/, '');
          const fp = base + '/' + entry.name;
          try {
            const resp = await fetch('/api/fs/trash', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: fp })
            });
            const data = await resp.json();
            if (!resp.ok) {
              Notifications.add('Finder', data.error || 'Move to Trash failed');
              return;
            }
            Notifications.add('Finder', `"${entry.name}" moved to Trash`);
            this.loadDir(container);
          } catch (err) {
            Notifications.add('Finder', 'Move to Trash failed: ' + err.message);
          }
        });
        item.appendChild(trashBtn);

        list.appendChild(item);
      });
    } catch (e) {
      list.innerHTML = `<div class="app-empty">Failed to load directory</div>`;
    }
  },

  async openFile(path, name) {
    if (AppUtils.isTextFile(name)) {
      try {
        const resp = await fetch(`/api/fs/read?file=${encodeURIComponent(path)}`);
        const data = await resp.json();
        if (data.error) {
          Notifications.add('Finder', data.error);
          return;
        }
        WindowManager.open('textedit', name, { content: data.content || '', path: path });
      } catch {}
    } else {
      WindowManager.open('preview', name, { path: path });
    }
  }
};
