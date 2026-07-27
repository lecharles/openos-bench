// Desktop shell - initialization, wallpaper, context menu, desktop icons
const Desktop = {
  init() {
    this.loadWallpaper();
    this.setupContextMenu();
    this.createDesktopIcons();
  },

  async loadWallpaper() {
    const settings = await Persistence.getSettings();
    const wp = document.getElementById('wallpaper');
    // Try custom wallpaper
    const paths = ['/data/wallpaper.jpg', '/data/wallpaper.png'];
    for (const p of paths) {
      try {
        const resp = await fetch(p);
        if (resp.ok) {
          wp.style.backgroundImage = `url(${p})`;
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
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
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
      await fetch('/api/wallpaper', { method: 'POST', body: blob, headers: { 'Content-Type': file.type } });
      this.loadWallpaper();
      Notifications.add('Wallpaper', 'Wallpaper updated');
    };
    input.click();
  },

  createFolder() {
    const name = prompt('Folder name:', 'New Folder');
    if (name) {
      const icon = this.addDesktopIcon(name, '📁', 'folder');
    }
  },

  createFile() {
    const name = prompt('File name:', 'New File.txt');
    if (name) {
      const icon = this.addDesktopIcon(name, '📄', 'file');
    }
  },

  createDesktopIcons() {
    const icons = document.getElementById('desktop-icons');
    const items = [
      { name: 'Home', icon: '🏠', app: 'finder', action: () => WindowManager.open('finder', 'Finder') },
      { name: 'Projects', icon: '📂', app: 'finder', action: () => WindowManager.open('finder', 'Finder', { dir: '/root' }) },
    ];
    items.forEach(item => {
      this.addDesktopIcon(item.name, item.icon, item.app, item.action);
    });
  },

  addDesktopIcon(name, icon, app, action) {
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.innerHTML = `<div class="icon-img">${icon}</div><div class="icon-label">${name}</div>`;
    el.addEventListener('dblclick', () => {
      if (action) action(); else WindowManager.open(app, name);
    });
    document.getElementById('desktop-icons').appendChild(el);
    return el;
  }
};
