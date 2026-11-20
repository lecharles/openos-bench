import { settings } from './state.js';
import { setVolume } from './audio.js';

export function applySettings() {
  const theme = settings.get('theme');
  const resolved = theme === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.setProperty('--accent', settings.get('accent'));
  const wp = document.getElementById('wallpaper');
  if (wp) wp.dataset.wp = settings.get('wallpaper');
  document.documentElement.style.setProperty('--dock-icon', `${settings.get('dockSize')}px`);
  const b = settings.get('brightness');
  const bl = document.getElementById('brightness-layer');
  if (bl) bl.style.opacity = String(Math.max(0, 1 - b) * 0.78);
  try { setVolume(settings.get('volume')); } catch {}
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (settings.get('theme') === 'auto') applySettings();
});
