// Control Center — connectivity toggles + brightness/volume sliders
const ControlCenter = {
  state: { wifi: true, bluetooth: true, airdrop: false, dnd: false, brightness: 80, volume: 60 },

  async init() {
    const btn = document.getElementById('control-center-btn');
    const overlay = document.getElementById('control-overlay');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.toggle('hidden');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'control-overlay') overlay.classList.add('hidden');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
      }
    });

    // Restore persisted brightness
    try {
      const s = await Persistence.getSettings();
      if (typeof s.brightness === 'number') this.state.brightness = s.brightness;
    } catch {}

    // Connectivity toggles
    overlay.querySelectorAll('.control-item').forEach(item => {
      const action = item.dataset.action;
      item.classList.toggle('active', !!this.state[action]);
      item.addEventListener('click', () => {
        this.state[action] = !this.state[action];
        item.classList.toggle('active', this.state[action]);
        Notifications.add('Control Center',
          `${item.textContent.trim()} ${this.state[action] ? 'enabled' : 'disabled'}`);
      });
    });

    // Brightness slider — drives a real screen-dim overlay
    const bright = document.getElementById('cc-brightness');
    bright.value = this.state.brightness;
    this._applyBrightness();
    bright.addEventListener('input', () => {
      this.state.brightness = parseInt(bright.value, 10);
      this._applyBrightness();
    });
    bright.addEventListener('change', () => {
      Persistence.saveSettings({ brightness: this.state.brightness });
    });

    // Volume slider (no audio subsystem — state is displayed and kept per session)
    const vol = document.getElementById('cc-volume');
    const volLabel = document.getElementById('cc-volume-label');
    vol.value = this.state.volume;
    vol.addEventListener('input', () => {
      this.state.volume = parseInt(vol.value, 10);
      volLabel.textContent = `Volume ${this.state.volume}%`;
    });
  },

  _applyBrightness() {
    const dim = document.getElementById('brightness-dim');
    // 100% brightness = no dim; 20% = strong dim
    dim.style.opacity = ((100 - this.state.brightness) / 100) * 0.75;
  }
};
