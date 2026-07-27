// Persistence - settings and state management
const Persistence = {
  settings: null,

  async init() {
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
    // Apply accent color
    const accent = this.settings.accent || '#007AFF';
    document.documentElement.style.setProperty('--accent-color', accent);
  }
};
