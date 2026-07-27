// Menu Bar - clock and interactions
const MenuBar = {
  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 10000);
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
    document.getElementById('apple-menu-btn').addEventListener('click', (e) => {
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.position = 'fixed';
      menu.style.left = '4px';
      menu.style.top = '30px';
      menu.style.zIndex = '3000';
      menu.innerHTML = `
        <div class="context-item">About This Mac</div>
        <div class="context-sep"></div>
        <div class="context-item">System Settings…</div>
        <div class="context-item">App Store…</div>
        <div class="context-sep"></div>
        <div class="context-item">Recent Items</div>
        <div class="context-sep"></div>
        <div class="context-item">Force Quit…</div>
        <div class="context-sep"></div>
        <div class="context-item">Sleep</div>
        <div class="context-item">Restart…</div>
        <div class="context-item">Shut Down…</div>
        <div class="context-sep"></div>
        <div class="context-item">Lock Screen</div>
      `;
      document.body.appendChild(menu);

      menu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
          const text = item.textContent;
          if (text.includes('System Settings')) WindowManager.open('settings', 'System Settings');
          if (text.includes('Force Quit')) WindowManager.open('activity', 'Activity Monitor');
          menu.remove();
        });
      });

      const remove = () => { menu.remove(); document.removeEventListener('click', remove); };
      setTimeout(() => document.addEventListener('click', remove), 10);
    });
  }
};
