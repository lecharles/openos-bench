/* OpenOS boot — orchestrates shell init and restores persisted state. */
import './apps.js'; // registers all apps (must run first)
import { api } from './core/api.js';
import { settings, layout } from './core/state.js';
import { bus } from './core/bus.js';
import { initMenubar } from './core/menubar.js';
import { initDock } from './core/dock.js';
import { initDesktop } from './core/desktop.js';
import { initSpotlight } from './core/spotlight.js';
import { initAppSwitcher } from './core/appswitcher.js';
import { restoreWindows, wm } from './core/wm.js';
import { loadLocations } from './finder.js';
import { icon } from './core/icons.js';
import { APPS } from './core/registry.js';
import { setDND, toast, escapeHTML } from './core/toast.js';
import { closeMenus } from './core/menu.js';

const progress = (p) => { const el = document.getElementById('boot-progress'); if (el) el.style.width = p + '%'; };

async function boot() {
  progress(12);
  await Promise.all([
    api.resolveHome().catch(() => {}),
    api.health().catch(() => null),
  ]);
  progress(32);
  await Promise.all([settings.load(), layout.load()]);
  progress(48);
  initMenubar();
  initDock();
  progress(58);
  await loadLocations();
  await initDesktop();
  initSpotlight();
  initAppSwitcher();
  wireSystem();
  wireSocket();
  progress(72);
  if (layout.windows && layout.windows.length) restoreWindows(layout.windows);
  progress(88);
  await new Promise((r) => setTimeout(r, 420));
  progress(100);
  const bootEl = document.getElementById('boot');
  bootEl.classList.add('done');
  setTimeout(() => bootEl.remove(), 800);
}

/* ---------------- Launchpad ---------------- */
let launchpadEl = null;
function toggleLaunchpad() {
  if (launchpadEl) { launchpadEl.remove(); launchpadEl = null; return; }
  launchpadEl = document.createElement('div');
  launchpadEl.id = 'launchpad';
  launchpadEl.style.cssText = `position:fixed;inset:0;z-index:4500;background:rgba(20,20,26,.45);backdrop-filter:blur(40px) saturate(1.4);display:flex;align-items:center;justify-content:center;animation:menu-in .18s ease`;
  const apps = Object.values(APPS).filter((a) => !a.hidden);
  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(6, 110px);gap:26px 10px;max-width:780px`;
  grid.innerHTML = apps.map((a) => `
    <div data-app="${a.id}" role="button" aria-label="${escapeHTML(a.name)}" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer">
      <div style="width:72px;height:72px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))">${icon(a.icon || a.id)}</div>
      <div style="color:#fff;font-size:12.5px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.5)">${escapeHTML(a.name)}</div>
    </div>`).join('');
  launchpadEl.appendChild(grid);
  launchpadEl.addEventListener('mousedown', (e) => { if (e.target === launchpadEl) toggleLaunchpad(); });
  grid.addEventListener('click', (e) => {
    const item = e.target.closest('[data-app]');
    if (item) { toggleLaunchpad(); wm.open(item.dataset.app); }
  });
  document.body.appendChild(launchpadEl);
}
  bus.on('launchpad:toggle', toggleLaunchpad);

/* ---------------- global debug/E2E helper ---------------- */
window.openos = {
  version: '1.0.0',
  open: (id, payload) => wm.open(id, { payload: payload || {} }),
  windows: () => wm.serializeAll(),
  settings: () => settings.data,
  refresh: () => bus.emit('fs:changed'),
};

/* ---------------- system events ---------------- */
function wireSystem() {
  bus.on('os:sleep', () => {
    const sleep = document.getElementById('sleep');
    sleep.hidden = false;
    sleep.classList.remove('waking');
    const wake = () => {
      sleep.classList.add('waking');
      setTimeout(() => { sleep.hidden = true; sleep.classList.remove('waking'); }, 800);
      document.removeEventListener('keydown', wakeKey);
      document.removeEventListener('mousedown', wake);
    };
    const wakeKey = (e) => { e.preventDefault(); wake(); };
    setTimeout(() => {
      document.addEventListener('keydown', wakeKey, { once: false });
      document.addEventListener('mousedown', wake);
    }, 120);
  });
  bus.on('os:restart', () => {
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;z-index:9800;background:#000;display:grid;place-items:center;transition:opacity .4s;opacity:1';
    veil.innerHTML = `<div style="filter:drop-shadow(0 0 20px rgba(20,120,255,.5))">${icon('logo', 72)}</div>`;
    document.body.appendChild(veil);
    setTimeout(() => location.reload(), 650);
  });
  bus.on('os:shutdown', () => {
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;z-index:9800;background:#000;display:grid;place-items:center;color:#666;font-size:13px;cursor:pointer';
    veil.innerHTML = `<div style="text-align:center;line-height:3">${icon('power', 40)}<div>Click anywhere to power on</div></div>`;
    veil.addEventListener('click', () => location.reload());
    document.body.appendChild(veil);
  });
  bus.on('os:dnd', (v) => setDND(v));
  bus.on('trash:empty', async () => {
    try {
      await api.fs.emptyTrash();
      toast({ title: 'Trash emptied', app: 'trash' });
      bus.emit('trash:changed');
      bus.emit('fs:changed');
    } catch (e) { toast({ title: 'Empty failed', body: e.message, app: 'trash' }); }
  });

  // global shortcuts
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'w' || e.key === 'W')) { e.preventDefault(); const w = wm.focused; if (w) wm.close(w); }
    else if (mod && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); const w = wm.focused; if (w) wm.minimize(w); }
    else if (mod && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      if (wm.focused) for (const w of wm.byApp(wm.focused.appId)) wm.close(w);
    }
    else if (mod && e.key === ',') { e.preventDefault(); wm.open('settings'); }
    else if (e.key === 'Escape') {
      if (launchpadEl) toggleLaunchpad();
      closeMenus();
    }
  });

  // persist layout on unload (sendBeacon → POST /api/layout)
  window.addEventListener('pagehide', () => {
    try {
      layout.windows = wm.serializeAll();
      const blob = new Blob([JSON.stringify({ windows: layout.windows, desktopIcons: layout.desktopIcons })], { type: 'application/json' });
      navigator.sendBeacon('/api/layout', blob);
    } catch { /* ignore */ }
  });
  window.addEventListener('resize', () => {
    for (const w of wm.windows) {
      if (w.maximized) {
        const b = wm.bounds();
        w.el.style.width = window.innerWidth + 'px';
        w.el.style.height = (b.bottom - b.top) + 'px';
        w.el.style.top = b.top + 'px';
        w.el.style.left = '0px';
      }
    }
  });
}

function wireSocket() {
  if (location.search.includes('nosock')) return; // testing: skip websocket
  if (typeof io !== 'function') return;
  try {
    const sock = io();
    sock.on('settings:updated', (s) => {
      if (!s) return;
      let changed = false;
      for (const k of Object.keys(s)) if (JSON.stringify(settings.data[k]) !== JSON.stringify(s[k])) { changed = true; break; }
      Object.assign(settings.data, s);
      if (changed) settings.apply();
    });
    sock.on('trash:changed', () => bus.emit('trash:changed'));
    sock.on('fs:changed', () => bus.emit('fs:changed'));
  } catch (e) { console.warn('socket.io unavailable', e); }
}

boot().catch((e) => {
  console.error(e);
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.innerHTML = `<div style="color:#fff;font:14px -apple-system">Boot error: ${String(e)}</div>`;
});
