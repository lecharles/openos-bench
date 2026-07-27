// System Settings app
const AppSettings = {
  async render(container) {
    const settings = await Persistence.getSettings();

    container.innerHTML = `
      <div style="display:flex;height:100%;gap:1px;">
        <div style="width:180px;border-right:1px solid rgba(0,0,0,0.08);overflow-y:auto;flex-shrink:0;padding:8px;" id="settings-nav">
          <div class="app-list-item settings-nav-item active" data-pane="general" style="font-weight:500;">General</div>
          <div class="app-list-item settings-nav-item" data-pane="appearance">Appearance</div>
          <div class="app-list-item settings-nav-item" data-pane="wallpaper">Wallpaper</div>
          <div class="app-list-item settings-nav-item" data-pane="desktop">Desktop & Dock</div>
          <div class="app-list-item settings-nav-item" data-pane="notifications">Notifications</div>
          <div class="app-list-item settings-nav-item" data-pane="about">About</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px;" id="settings-content"></div>
      </div>
    `;

    this.showPane(container, 'general');
    this.setupNav(container);
  },

  setupNav(container) {
    container.querySelectorAll('.settings-nav-item').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.settings-nav-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        this.showPane(container, el.dataset.pane);
      });
    });
  },

  async showPane(container, pane) {
    const content = container.querySelector('#settings-content');
    const settings = await Persistence.getSettings();

    const panes = {
      general: `
        <h2 style="font-size:20px;margin-bottom:16px;">General</h2>
        <div style="margin-bottom:12px;">
          <label style="font-weight:500;">Default Web Browser</label>
          <div style="color:#666;font-size:12px;">KiMi Browser is the default</div>
        </div>
      `,
      appearance: `
        <h2 style="font-size:20px;margin-bottom:16px;">Appearance</h2>
        <div style="margin-bottom:12px;">
          <label style="font-weight:500;">Theme</label>
          <select class="app-input" id="setting-theme" style="margin-left:12px;">
            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-weight:500;">Accent Color</label>
          <input type="color" id="setting-accent" value="${settings.accent || '#007AFF'}" style="margin-left:12px;vertical-align:middle;">
        </div>
        <button class="app-btn primary" id="appearance-save">Save</button>
      `,
      wallpaper: `
        <h2 style="font-size:20px;margin-bottom:16px;">Wallpaper</h2>
        <p style="color:#666;margin-bottom:12px;">Choose a wallpaper for your desktop.</p>
        <button class="app-btn primary" id="wallpaper-choose">Choose Wallpaper…</button>
      `,
      desktop: `
        <h2 style="font-size:20px;margin-bottom:16px;">Desktop & Dock</h2>
        <p style="color:#666;">Dock and desktop configuration options.</p>
      `,
      notifications: `
        <h2 style="font-size:20px;margin-bottom:16px;">Notifications</h2>
        <p style="color:#666;">Manage notification preferences.</p>
        <div id="notification-list-settings" class="app-list"></div>
      `,
      about: `
        <h2 style="font-size:20px;margin-bottom:16px;">About KiMi Desktop</h2>
        <div style="text-align:center;padding:20px;">
          <div style="font-size:64px;">🖥️</div>
          <div style="font-size:18px;font-weight:600;margin-top:8px;">KiMi Desktop</div>
          <div style="color:#666;">Version 1.0.0</div>
          <div style="color:#999;font-size:12px;margin-top:8px;">macOS-inspired browser desktop environment</div>
          <div style="color:#999;font-size:12px;">Built with Node.js + Express + Socket.IO</div>
        </div>
      `
    };

    content.innerHTML = panes[pane] || '';

    // Attach event listeners for interactive elements
    if (pane === 'appearance') {
      content.querySelector('#appearance-save').addEventListener('click', async () => {
        await Persistence.saveSettings({
          theme: content.querySelector('#setting-theme').value,
          accent: content.querySelector('#setting-accent').value,
        });
        Notifications.add('Settings', 'Appearance settings saved');
      });
    }
    if (pane === 'wallpaper') {
      content.querySelector('#wallpaper-choose').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          await fetch('/api/wallpaper', { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
          Desktop.loadWallpaper();
          Notifications.add('Settings', 'Wallpaper updated');
        };
        input.click();
      });
    }
  }
};
