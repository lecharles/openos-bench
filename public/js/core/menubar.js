// Menu Bar - clock and interactions
const MenuBar = {
  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 30000);
    this.setupMenus();
    this.setupAppleMenu();
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

  setupMenus() {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const menu = item.dataset.menu;
        if (menu === 'finder' && !WindowManager.windows['finder-0']) {
          WindowManager.open('finder', 'Finder');
        }
      });
    });
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
        <div class="context-item" data-action="appstore">App Store…</div>
        <div class="context-sep"></div>
        <div class="context-item" data-action="recent">Recent Items</div>
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
