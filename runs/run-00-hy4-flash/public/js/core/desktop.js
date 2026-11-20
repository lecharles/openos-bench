// Desktop shell - initialization, wallpaper, context menu, desktop icons
const Desktop = {
  async init() {
    await this.loadWallpaper();
    this.setupContextMenu();
    this.createDesktopIcons();
    await this.restoreCustomIcons();
  },

  async loadWallpaper() {
    const settings = await Persistence.getSettings();
    const wp = document.getElementById('wallpaper');
    // Prefer the path recorded in settings; fall back to probing both formats
    const paths = [];
    if (settings.wallpaper) paths.push(settings.wallpaper);
    paths.push('/data/wallpaper.jpg', '/data/wallpaper.png');
    for (const p of paths) {
      try {
        const resp = await fetch(p);
        if (resp.ok) {
          // Cache-bust so a freshly uploaded image replaces a cached one
          wp.style.backgroundImage = `url(${p}?t=${Date.now()})`;
          return;
        }
      } catch {}
    }
    // Keep default gradient
  },

  setupContextMenu() {
    const menu = document.getElementById('context-menu');
    document.getElementById('desktop').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      menu.classList.remove('hidden');
      // Clamp into the viewport
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      menu.style.left = Math.min(e.clientX, window.innerWidth - mw - 8) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - mh - 8) + 'px';
    });
    document.addEventListener('click', () => menu.classList.add('hidden'));

    menu.querySelectorAll('.context-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.add('hidden');
        const text = item.textContent;
        if (text.includes('Wallpaper')) this.promptWallpaper();
        if (text.includes('New Folder')) this.createFolder();
        if (text.includes('New File')) this.createFile();
      });
    });
  },

  promptWallpaper() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const blob = new Blob([file], { type: file.type });
      try {
        const resp = await fetch('/api/wallpaper', { method: 'POST', body: blob, headers: { 'Content-Type': file.type } });
        const data = await resp.json();
        if (data.path) await Persistence.saveSettings({ wallpaper: data.path });
        await this.loadWallpaper();
        Notifications.add('Wallpaper', 'Wallpaper updated');
      } catch {
        Notifications.add('Wallpaper', 'Wallpaper upload failed');
      }
    };
    input.click();
  },

  async createFolder() {
    const name = prompt('Folder name:', 'New Folder');
    if (name) {
      this.addDesktopIcon(name, '📁', 'folder');
      await this._persistCustomIcons();
    }
  },

  async createFile() {
    const name = prompt('File name:', 'New File.txt');
    if (name) {
      this.addDesktopIcon(name, '📄', 'file');
      await this._persistCustomIcons();
    }
  },

  createDesktopIcons() {
    const items = [
      { name: 'Home', icon: '🏠', app: 'finder', action: () => WindowManager.open('finder', 'Finder') },
      { name: 'Projects', icon: '📂', app: 'finder', action: () => WindowManager.open('finder', 'Finder', { dir: '/root' }) },
    ];
    items.forEach(item => {
      this.addDesktopIcon(item.name, item.icon, item.app, item.action);
    });
  },

  // User-created icons persist in settings.desktopIcons
  async _persistCustomIcons() {
    const settings = await Persistence.getSettings();
    const customs = [...document.querySelectorAll('.desktop-icon[data-custom]')]
      .map(el => ({ name: el.dataset.name, icon: el.dataset.icon }));
    await Persistence.saveSettings({ desktopIcons: customs });
  },

  async restoreCustomIcons() {
    try {
      const settings = await Persistence.getSettings();
      (settings.desktopIcons || []).forEach(ic => {
        this.addDesktopIcon(ic.name, ic.icon, 'file');
      });
    } catch {}
  },

  addDesktopIcon(name, icon, app, action) {
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    if (!action) {
      el.dataset.custom = '1';
      el.dataset.name = name;
      el.dataset.icon = icon;
    }
    el.innerHTML = `<div class="icon-img">${icon}</div><div class="icon-label">${AppUtils.escapeHtml(name)}</div>`;
    el.addEventListener('dblclick', () => {
      if (action) { action(); return; }
      // Custom icons have no real backing file yet: folders open Finder, files open a new TextEdit document
      if (app === 'folder') WindowManager.open('finder', 'Finder');
      else WindowManager.open('textedit', 'TextEdit');
    });
    document.getElementById('desktop-icons').appendChild(el);
    return el;
  }
};
