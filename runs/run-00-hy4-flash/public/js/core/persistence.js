// Persistence - settings and state management
const Persistence = {
  settings: null,
  _themeMq: null,

  async init() {
    // Track OS theme for "auto" mode
    this._themeMq = window.matchMedia('(prefers-color-scheme: dark)');
    this._themeMq.addEventListener('change', () => this.applySettings());
    await this.loadSettings();
    // Listen for realtime updates
    if (window.socket) {
      window.socket.on('settings:updated', (data) => {
        this.settings = data;
        this.applySettings();
      });
      window.socket.on('notes:updated', () => {});
      window.socket.on('reminders:updated', () => {});
      window.socket.on('calendar:updated', () => {});
      window.socket.on('contacts:updated', () => {});
      window.socket.on('mail:updated', () => {});
      window.socket.on('messages:updated', () => {});
    }
  },

  async loadSettings() {
    try {
      const resp = await fetch('/api/settings');
      this.settings = await resp.json();
      this.applySettings();
    } catch {
      this.settings = { wallpaper: '', theme: 'auto', accent: '#007AFF' };
    }
  },

  async getSettings() {
    if (!this.settings) await this.loadSettings();
    return this.settings;
  },

  async saveSettings(updates) {
    Object.assign(this.settings, updates);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.settings)
    });
    this.applySettings();
  },

  applySettings() {
    if (!this.settings) return;
    // Apply accent color — --color-blue is the token all blue UI derives from
    const accent = this.settings.accent || '#007AFF';
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--color-blue', accent);

    // Apply theme ("auto" follows the OS via prefers-color-scheme)
    let theme = this.settings.theme || 'auto';
    if (theme === 'auto') {
      theme = (this._themeMq && this._themeMq.matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    // Cache for the pre-paint boot script in index.html (avoids theme flash)
    try { localStorage.setItem('kbd-theme', theme); } catch {}
  }
};
