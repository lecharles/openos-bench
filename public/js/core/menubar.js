// Menu Bar - clock, Apple menu, application menus
const MenuBar = {
  _openDropdown: null,

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.setupMenus();
    this.setupAppleMenu();
    // macOS: clicking the clock opens Notification Center
    document.getElementById('menubar-clock').addEventListener('click', (e) => {
      e.stopPropagation();
      Notifications.toggle();
    });
  },

  updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('menubar-clock').textContent =
      `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}  ${h}:${m}`;
  },

  // Menu definitions; items: [label, action] or '-' for separator
  _menus: {
    finder: [
      ['About Finder', () => Notifications.add('Finder', 'KiMi Desktop Finder 1.0')],
      '-',
      ['Open Finder', () => WindowManager.open('finder', 'Finder')],
    ],
    file: [
      ['New Finder Window', () => WindowManager.open('finder', 'Finder')],
      ['Close Window', () => {
        const w = WindowManager.focusedWindow;
        if (w) WindowManager.close(w);
      }],
    ],
    edit: [
      ['Cut', () => document.execCommand('cut')],
      ['Copy', () => document.execCommand('copy')],
      ['Paste', () => document.execCommand('paste')],
      ['Select All', () => document.execCommand('selectAll')],
    ],
    view: [
      ['Show / Hide Path Bar', () => window.dispatchEvent(new CustomEvent('kbd:toggle-pathbar'))],
      '-',
      ['Toggle Dark Mode', async () => {
        const s = await Persistence.getSettings();
        const cur = document.documentElement.getAttribute('data-theme');
        await Persistence.saveSettings({ theme: cur === 'dark' ? 'light' : 'dark' });
      }],
      '-',
      ['Enter Full Screen', () => document.documentElement.requestFullscreen?.()],
      ['Reload Desktop', () => location.reload()],
    ],
    go: [
      ['Home', () => WindowManager.open('finder', 'Finder', { dir: '/root' })],
      ['Projects', () => WindowManager.open('finder', 'Finder', { dir: '/root/kimi-browser-desktop' })],
      ['Temporary', () => WindowManager.open('finder', 'Finder', { dir: '/tmp' })],
    ],
    window: [
      ['Minimize', () => {
        const w = WindowManager.focusedWindow;
        if (w) WindowManager.minimize(w);
      }],
      ['Zoom', () => {
        const w = WindowManager.focusedWindow;
        if (w) WindowManager.toggleMaximize(w);
      }],
      '-',
      // Open windows are appended dynamically
    ],
    help: [
      ['About KiMi Desktop', () => Notifications.add('KiMi Desktop', 'macOS-inspired browser desktop — KiMi 3 build')],
    ],
  },

  setupMenus() {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = item.dataset.menu;
        if (this._openDropdown && this._openDropdown.dataset.menu === name) {
          this._closeDropdown();
          return;
        }
        this._showDropdown(name, item);
      });
    });
  },

  _showDropdown(name, anchor) {
    this._closeDropdown();
    const items = [...(this._menus[name] || [])];
    if (name === 'window') {
      Object.values(WindowManager.windows).forEach(w => {
        items.push([w.title, () => {
          w.el.classList.remove('minimized');
          WindowManager.focus(w);
        }]);
      });
    }
    if (items.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu apple-dropdown';
    menu.dataset.menu = name;
    menu.style.position = 'fixed';
    const rect = anchor.getBoundingClientRect();
    menu.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    menu.style.top = '28px';
    menu.style.zIndex = '3001';
    menu.style.transformOrigin = 'top left';
    menu.innerHTML = items.map(it =>
      it === '-' ? '<div class="context-sep"></div>'
                 : `<div class="context-item">${AppUtils.escapeHtml(it[0])}</div>`
    ).join('');
    document.body.appendChild(menu);

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    menu.querySelectorAll('.context-item').forEach((el, i) => {
      const actionable = items.filter(it => it !== '-');
      el.addEventListener('click', () => {
        const item = actionable[i];
        if (item && item[1]) item[1]();
        this._closeDropdown();
      });
    });

    this._openDropdown = menu;
    setTimeout(() => {
      document.addEventListener('click', this._dropdownDismiss = (ev) => {
        if (this._openDropdown && !this._openDropdown.contains(ev.target)) this._closeDropdown();
      });
    }, 10);
  },

  _closeDropdown() {
    if (this._openDropdown) {
      this._openDropdown.remove();
      this._openDropdown = null;
    }
    if (this._dropdownDismiss) {
      document.removeEventListener('click', this._dropdownDismiss);
      this._dropdownDismiss = null;
    }
  },

  setupAppleMenu() {
    const btn = document.getElementById('apple-menu-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove any existing apple menu
      const existing = document.querySelector('.apple-dropdown');
      if (existing) { existing.remove(); return; }

      const menu = document.createElement('div');
      menu.className = 'context-menu apple-dropdown';
      menu.style.position = 'fixed';
      menu.style.left = '6px';
      menu.style.top = '28px';
      menu.style.zIndex = '3001';
      menu.style.transformOrigin = 'top left';
      // Override hidden — show immediately
      menu.classList.remove('hidden');
      menu.innerHTML = `
        <div class="context-item" data-action="about">About This Mac</div>
        <div class="context-sep"></div>
        <div class="context-item" data-action="settings">System Settings…</div>
        <div class="context-sep"></div>
        <div class="context-item" data-action="forcequit">Force Quit…</div>
        <div class="context-sep"></div>
        <div class="context-item" data-action="sleep">Sleep</div>
        <div class="context-item" data-action="restart">Restart…</div>
        <div class="context-item" data-action="shutdown">Shut Down…</div>
        <div class="context-sep"></div>
        <div class="context-item" data-action="lock">Lock Screen</div>
      `;
      document.body.appendChild(menu);

      // Animate in
      requestAnimationFrame(() => {
        menu.style.opacity = '1';
        menu.style.transform = 'scale(1)';
      });

      menu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          if (action === 'settings') WindowManager.open('settings', 'System Settings');
          if (action === 'forcequit') WindowManager.open('activity', 'Activity Monitor');
          if (action === 'about') Notifications.add('About This Mac', 'KiMi Desktop 1.0 — macOS-inspired browser desktop');
          if (action === 'lock') Notifications.add('Lock Screen', 'Screen locked');
          if (action === 'sleep') Notifications.add('Sleep', 'System sleeping…');
          if (action === 'restart') Notifications.add('Restart', 'System restarting…');
          if (action === 'shutdown') Notifications.add('Shut Down', 'System shutting down…');
          menu.remove();
        });
      });

      const remove = (ev) => {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('click', remove);
        }
      };
      setTimeout(() => document.addEventListener('click', remove), 10);
    });
  }
};
