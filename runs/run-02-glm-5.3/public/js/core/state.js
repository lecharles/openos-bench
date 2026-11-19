/* Persistent OS state: settings + window layout (server-side JSON). */
import { api } from './api.js';
import { bus } from './bus.js';
import { WALLPAPERS, applyWallpaper } from './wallpapers.js';

const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

export const settings = {
  data: { theme: 'light', wallpaper: 'horizon', accent: 'blue', dockSize: 52, dockMagnify: 0.7 },
  _saveTimer: null,

  async load() {
    try {
      const s = await api.settings.get();
      this.data = Object.assign(this.data, s);
    } catch (e) { console.error('settings load', e); }
    this.apply();
  },

  effectiveTheme() {
    if (this.data.theme === 'auto') return mqDark.matches ? 'dark' : 'light';
    return this.data.theme;
  },

  apply() {
    document.body.dataset.theme = this.effectiveTheme();
    document.body.dataset.accent = this.data.accent || 'blue';
    applyWallpaper(this.data.wallpaper);
    document.documentElement.style.setProperty('--dock-size', (this.data.dockSize || 52) + 'px');
    bus.emit('settings:applied', this.data);
  },

  async set(patch) {
    Object.assign(this.data, patch);
    this.apply();
    try { await api.settings.put(patch); } catch (e) { console.error(e); }
    bus.emit('settings:changed', this.data);
  },

  /** Save soon (debounced) — for slider-type changes. */
  setDebounced(patch) {
    Object.assign(this.data, patch);
    this.apply();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.set({}), 350);
  },
};

export const layout = {
  windows: [],
  desktopIcons: {},

  async load() {
    try {
      const l = await api.layout.get();
      this.windows = Array.isArray(l.windows) ? l.windows : [];
      this.desktopIcons = l.desktopIcons || {};
    } catch (e) { console.error('layout load', e); }
  },

  _saveTimer: null,
  save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 700);
  },
  async saveNow() {
    try { await api.layout.put({ windows: this.windows, desktopIcons: this.desktopIcons }); } catch (e) { console.error(e); }
  },
};

mqDark.addEventListener('change', () => { if (settings.data.theme === 'auto') settings.apply(); });
