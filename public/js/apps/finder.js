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
        <span style="flex:1"></span>
        <span id="finder-path" style="color:#666;font-size:11px;">${this.currentDir}</span>
      </div>
      <div id="finder-list" class="app-list"></div>
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
    container.querySelector('#finder-fwd').addEventListener('click', () => {});

    // Context menu on items
    container.querySelector('#finder-list').addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    await this.loadDir(container);
  },

  async loadDir(container) {
    const list = container.querySelector('#finder-list');
    const pathSpan = container.querySelector('#finder-path');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading...</div>';

    try {
      const resp = await fetch(`/api/fs?dir=${encodeURIComponent(this.currentDir)}`);
      const data = await resp.json();
      if (data.error) { list.innerHTML = `<div class="app-empty">Error: ${data.error}</div>`; return; }

      pathSpan.textContent = data.path;
      this.currentDir = data.path;

      // Parent dir
      if (data.path !== '/') {
        const parentItem = document.createElement('div');
        parentItem.className = 'app-list-item';
        parentItem.innerHTML = '<span style="font-size:20px;">📂</span> <span style="font-weight:500;">..</span>';
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
        const icon = entry.type === 'directory' ? '📁' : this.getFileIcon(entry.name);
        const sizeStr = entry.type === 'file' ? this.formatSize(entry.size) : '--';
        item.innerHTML = `
          <span style="font-size:20px;">${icon}</span>
          <span style="flex:1;">${entry.name}</span>
          <span style="color:#999;font-size:11px;">${sizeStr}</span>
        `;
        item.addEventListener('dblclick', () => {
          if (entry.type === 'directory') {
            this.currentDir = this.currentDir.replace(/\/$/, '') + '/' + entry.name;
            this.loadDir(container);
          } else {
            this.openFile(this.currentDir + '/' + entry.name, entry.name);
          }
        });
        list.appendChild(item);
      });
    } catch (e) {
      list.innerHTML = `<div class="app-empty">Failed to load directory</div>`;
    }
  },

  getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { txt: '📄', md: '📝', json: '📋', js: '📜', py: '🐍', html: '🌐', css: '🎨',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
      mp3: '🎵', wav: '🎵', mp4: '🎬', pdf: '📕', zip: '📦', tar: '📦', gz: '📦',
      sh: '⚙️', yml: '⚙️', yaml: '⚙️', toml: '⚙️', lock: '🔒' };
    return map[ext] || '📄';
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  async openFile(path, name) {
    const ext = name.split('.').pop().toLowerCase();
    const textExts = ['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'yml', 'yaml', 'toml', 'sh', 'xml', 'log', 'env', 'cfg', 'ini', 'conf'];
    if (textExts.includes(ext) || !ext) {
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
