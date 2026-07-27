// System Settings app
window.AppSettings = {
  async render(container) {
    const settings = await Persistence.getSettings();

    container.innerHTML = `
      <div class="app-split">
        <div class="app-settings-nav" id="settings-nav">
          <div class="app-list-item settings-nav-item active" data-pane="general" style="font-weight:var(--weight-medium);">General</div>
          <div class="app-list-item settings-nav-item" data-pane="appearance">Appearance</div>
          <div class="app-list-item settings-nav-item" data-pane="wallpaper">Wallpaper</div>
          <div class="app-list-item settings-nav-item" data-pane="desktop">Desktop &amp; Dock</div>
          <div class="app-list-item settings-nav-item" data-pane="notifications">Notifications</div>
          <div class="app-list-item settings-nav-item" data-pane="about">About</div>
        </div>
        <div class="app-settings-content" id="settings-content"></div>
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
        <h2 class="app-settings-heading">General</h2>
        <div style="margin-bottom:var(--space-3);">
          <label style="font-weight:var(--weight-medium);">Default Web Browser</label>
          <div style="color:var(--content-text-secondary);font-size:var(--text-caption);">KiMi Browser is the default</div>
        </div>
      `,
      appearance: `
        <h2 class="app-settings-heading">Appearance</h2>
        <div style="margin-bottom:var(--space-3);">
          <label style="font-weight:var(--weight-medium);">Theme</label>
          <select class="app-input" id="setting-theme" style="margin-left:var(--space-3);">
            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
        <div style="margin-bottom:var(--space-3);">
          <label style="font-weight:var(--weight-medium);">Accent Color</label>
          <input type="color" id="setting-accent" value="${settings.accent || '#007AFF'}" style="margin-left:var(--space-3);vertical-align:middle;">
        </div>
        <button class="app-btn primary" id="appearance-save">Save</button>
      `,
      wallpaper: `
        <h2 class="app-settings-heading">Wallpaper</h2>
        <p style="color:var(--content-text-secondary);margin-bottom:var(--space-3);">Choose a wallpaper for your desktop.</p>
        <button class="app-btn primary" id="wallpaper-choose">Choose Wallpaper…</button>
      `,
      desktop: `
        <h2 class="app-settings-heading">Desktop &amp; Dock</h2>
        <p style="color:var(--content-text-secondary);">Dock size and desktop configuration are not available in this build.</p>
      `,
      notifications: `
        <h2 class="app-settings-heading">Notifications</h2>
        <p style="color:var(--content-text-secondary);">Notification preferences are not available in this build.</p>
      `,
      about: `
        <h2 class="app-settings-heading">About KiMi Desktop</h2>
        <div style="text-align:center;padding:var(--space-5);">
          <div style="font-size:64px;">🖥️</div>
          <div style="font-size:var(--text-title3);font-weight:var(--weight-semibold);margin-top:var(--space-2);">KiMi Desktop</div>
          <div style="color:var(--content-text-secondary);">Version 1.0.0</div>
          <div style="color:var(--content-text-tertiary);font-size:var(--text-caption);margin-top:var(--space-2);">macOS-inspired browser desktop environment</div>
          <div style="color:var(--content-text-tertiary);font-size:var(--text-caption);">Built with Node.js + Express + Socket.IO</div>
        </div>
      `
    };

    content.innerHTML = panes[pane] || '';

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
