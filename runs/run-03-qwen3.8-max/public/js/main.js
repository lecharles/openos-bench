import { loadState, State } from './core/state.js';
import { applySettings } from './core/apply.js';
import { buildMenubar, setActiveApp } from './core/menubar.js';
import { buildDock } from './core/dock.js';
import { buildSpotlight, toggle as toggleSpotlight, isOpen as spotOpen, hide as spotHide } from './core/spotlight.js';
import { buildDesktop } from './core/desktop.js';
import { restoreLayout } from './core/wm.js';
import * as WM from './core/wm.js';
import { launch, allApps } from './core/launch.js';
import { metaKey } from './core/util.js';

async function boot() {
  const fill = document.getElementById('boot-fill');
  fill.style.width = '28%';
  await loadState();
  fill.style.width = '56%';
  applySettings();
  buildMenubar();
  buildDock();
  buildSpotlight();
  await buildDesktop();
  fill.style.width = '82%';

  restoreLayout((appId, opts) => launch(appId, opts));
  if (!WM.allWindows().length) {
    launch('finder', { params: { path: 'Desktop' }, noAnim: true });
  }
  connectSocket();
  initShortcuts();
  fill.style.width = '100%';

  window.OpenOS = { launch, apps: allApps(), wm: WM, state: State, version: '1.0' };

  setTimeout(() => {
    document.getElementById('boot').classList.add('done');
    const dr = document.getElementById('desktop-root');
    dr.classList.add('on');
    dr.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('boot').remove(), 900);
  }, 650);
}

function connectSocket() {
  try {
    if (!window.io) return;
    const sock = window.io();
    sock.on('presence', ({ count }) => {
      const logo = document.querySelector('#mb-left .mb-item.logo');
      if (logo && !logo.querySelector('.mb-badge')) logo.append(Object.assign(document.createElement('span'), { className: 'mb-badge', title: `${count} session(s) connected` }));
    });
  } catch (e) { console.warn('socket unavailable', e); }
}

function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
      e.preventDefault();
      toggleSpotlight();
      return;
    }
    if (spotOpen()) return; // spotlight input handles its own keys
    if (e.key === 'Escape') { spotHide(); return; }
    if (!metaKey(e)) return;
    const w = WM.focusedWindow();
    const k = e.key.toLowerCase();
    if (k === 'w' && w) { e.preventDefault(); WM.closeWindow(w); }
    else if (k === 'm' && w) { e.preventDefault(); WM.minimizeWindow(w); }
    else if (k === 'q' && w) { e.preventDefault(); WM.windowsForApp(w.appId).forEach((x) => WM.closeWindow(x)); }
    else if (k === 'n' && w) {
      const app = w.app;
      if (app.singleton === false) { e.preventDefault(); launch(app.id, { forceNew: true }); }
    }
    else if (k === '1' && w && w.api._finder) { e.preventDefault(); w.api._finder.setView('icons'); }
    else if (k === '2' && w && w.api._finder) { e.preventDefault(); w.api._finder.setView('list'); }
    else if (e.key === '.' && e.shiftKey && w && w.api._finder) { e.preventDefault(); w.api._finder.toggleHidden(); }
    else if (k === 'i' && w && w.api._finder) { e.preventDefault(); w.api._finder.getInfo(); }
    void typing;
  });
}

window.addEventListener('error', (e) => {
  console.warn('[openos]', e.message);
});

boot().catch((err) => {
  console.error('boot failed', err);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<div style="color:#ff6961;font-family:monospace;padding:20px">boot failed: ${String(err && err.stack || err)}</div>`;
});
