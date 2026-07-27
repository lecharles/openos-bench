// Finder - file browser
const AppFinder = {
  currentDir: '/root',

  async render(container, opts) {
    if (opts && opts.dir) this.currentDir = opts.dir;
    container.innerHTML = `
      <div class="app-toolbar">
        <button id="finder-back">◀</button>
        <button id="finder-fwd">▶</button>
        <button id="finder-home">🏠 Home</button>
        <span class="app-spacer"></span>
        <span id="finder-path" class="app-finder-path">${this.currentDir}</span>
      </div>
      <div id="finder-list" class="app-list" style="flex:1;overflow-y:auto;"></div>
    `;

    container.querySelector('#finder-back').addEventListener('click', () => {
      const parts = this.currentDir.split('/').filter(Boolean);
      parts.pop();
      this.currentDir = '/' + parts.join('/');
      this.loadDir(container);
    });
    container.querySelector('#finder-home').addEventListener('click', () => {
      this.currentDir = '/root';
      this.loadDir(container);
    });

    await this.loadDir(container);
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
          this.currentDir = '/' + parts.join('/');
          this.loadDir(container);
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
          if (entry.type === 'directory') {
            const base = this.currentDir.replace(/\/+$/, '');
            this.currentDir = base + '/' + entry.name;
            this.loadDir(container);
          } else {
            const base = this.currentDir.replace(/\/+$/, '');
            this.openFile(base + '/' + entry.name, entry.name);
          }
        });
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
        if (data.content) {
          WindowManager.open('textedit', name, { content: data.content, path: path });
        }
      } catch {}
    } else {
      WindowManager.open('preview', name, { path: path });
    }
  }
};
