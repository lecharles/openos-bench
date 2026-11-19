/* Menu bar: Apple menu, active-app menus, right status cluster + control center. */
import { icon } from './icons.js';
import { openMenu, closeMenus } from './menu.js';
import { settings } from './state.js';
import { wm } from './wm.js';
import { APPS } from './registry.js';
import { bus } from './bus.js';
import { escapeHTML } from './toast.js';

const el = () => document.getElementById('menubar');
let activeAppId = 'finder';
let openTitle = null; // currently-open menu title ('apple', 'Finder', 'File'...)

export function initMenubar() {
  const bar = el();
  bar.innerHTML = `
    <div class="mb-item mb-logo-wrap" data-menu="apple" role="menuitem" aria-label="OpenOS menu">${icon('logoGlyph', 15)}</div>
    <div class="mb-item mb-app-name" data-menugroup="app" aria-label="Active app menu"></div>
    <span id="mb-app-menus" style="display:contents"></span>
    <div class="mb-right">
      <div class="mb-item" id="mb-battery" data-menu="battery" title="Battery">${icon('battery', 17)}<span style="font-size:12px;margin-left:1px">84%</span></div>
      <div class="mb-item" id="mb-wifi" data-menu="wifi" title="Wi-Fi">${icon('wifi', 16)}</div>
      <div class="mb-item" id="mb-cc" data-menu="cc" title="Control Center">${icon('cc', 17)}</div>
      <div class="mb-item" id="mb-spot" title="Spotlight Search (⌘Space)">${icon('search', 15)}</div>
      <div class="mb-item" id="menubar-clock" data-menu="clock">Wed Nov 18 9:41 PM</div>
    </div>
  `;
  document.querySelector('.mb-logo-wrap svg').style.filter = 'drop-shadow(0 0 1px rgba(0,0,0,.4))';

  bar.addEventListener('mousedown', (e) => {
    const item = e.target.closest('[data-menu]');
    if (!item) { closeMenus(); setOpen(null); return; }
    e.preventDefault();
    const title = item.dataset.menu;
    if (openTitle === title) { closeMenus(); setOpen(null); return; }
    openMenuFor(title, item);
  });
  bar.addEventListener('mouseover', (e) => {
    const item = e.target.closest('[data-menu]');
    if (item && openTitle && item.dataset.menu !== openTitle) openMenuFor(item.dataset.menu, item);
  });

  document.getElementById('mb-spot').addEventListener('mousedown', (e) => { e.stopPropagation(); bus.emit('spotlight:toggle'); });

  bus.on('wm:focus', (win) => setActiveApp(win ? win.appId : 'finder'));
  setInterval(tickClock, 1000);
  tickClock();
  setActiveApp('finder');
}

function setOpen(title) {
  openTitle = title;
  for (const it of el().querySelectorAll('[data-menu]')) it.classList.toggle('open', it.dataset.menu === title);
}

function openMenuFor(title, itemEl) {
  closeMenus();
  if (title === 'cc') { setOpen('cc'); showControlCenter(itemEl); return; }
  const r = itemEl.getBoundingClientRect();
  const items = buildItems(title);
  openMenu({
    x: Math.min(r.left, window.innerWidth - 240), y: r.bottom + 4,
    items, className: 'menu-panel',
    onclose: () => setOpen(null),
  });
  setOpen(title);
}

function buildItems(title) {
  switch (title) {
    case 'apple': return appleMenu();
    case 'battery': return [
      { label: 'Battery — 84%', disabled: true },
      { separator: true },
      { label: 'Power Source: VPS UPS', disabled: true },
      { label: 'Battery Health…', disabled: true },
    ];
    case 'wifi': return [
      { label: 'Wi-Fi: On', checked: true },
      { separator: true },
      { label: 'OpenOS-5G', checked: true, action: () => {} },
      { label: 'Neighbour\u2019s Wi-Fi', disabled: true },
      { separator: true },
      { label: 'Wi-Fi Settings…', action: () => wm.open('settings', { payload: { pane: 'network' } }) },
    ];
    case 'clock': return [
      { label: clockMenuDate(), disabled: true },
      { separator: true },
      { label: 'Open Clock…', action: () => wm.open('clock') },
      { label: 'Date & Time Settings…', action: () => wm.open('settings', { payload: { pane: 'datetime' } }) },
    ];
    default: {
      if (title === activeAppId) return appMenu(activeAppId);
      const def = APPS[activeAppId];
      const group = (def && def.menus && def.menus()[title]);
      if (group) return group;
      return defaultMenus()[title] || [{ label: 'Nothing here', disabled: true }];
    }
  }
}

function appleMenu() {
  return [
    { label: 'About This Computer', action: () => wm.open('about') },
    { separator: true },
    { label: 'System Settings…', shortcut: '⌘,', action: () => wm.open('settings') },
    { label: 'App Store…', disabled: true },
    { separator: true },
    { label: 'Recent Items', disabled: true },
    { separator: true },
    { label: 'Force Quit…', shortcut: '⌥⌘⎋', action: () => { const w = wm.focused; if (w) wm.close(w); } },
    { separator: true },
    { label: 'Sleep', action: () => bus.emit('os:sleep') },
    { label: 'Restart…', action: () => bus.emit('os:restart') },
    { label: 'Shut Down…', action: () => bus.emit('os:shutdown') },
    { separator: true },
    { label: 'Lock Screen', shortcut: '⌃⌘Q', action: () => bus.emit('os:sleep') },
  ];
}

function appMenu(appId) {
  const def = APPS[appId] || { name: 'Finder' };
  return [
    { label: `About ${def.name}`, action: () => wm.open('about', { payload: { app: appId } }) },
    { separator: true },
    { label: 'Settings…', shortcut: '⌘,', action: () => wm.open('settings') },
    { separator: true },
    { label: `Hide ${def.name}`, shortcut: '⌘H', action: () => { const w = wm.focused; if (w) wm.minimize(w); } },
    { separator: true },
    { label: `Quit ${def.name}`, shortcut: '⌘Q', action: () => quitApp(appId) },
  ];
}

function quitApp(appId) {
  for (const w of wm.byApp(appId)) wm.close(w);
}

export function setActiveApp(appId) {
  activeAppId = appId || 'finder';
  const def = APPS[activeAppId];
  const nameEl = document.querySelector('#menubar .mb-app-name');
  if (!nameEl) return;
  nameEl.textContent = def ? def.name : 'Finder';
  nameEl.dataset.menu = activeAppId;
  renderAppMenus();
}

function renderAppMenus() {
  const def = APPS[activeAppId];
  const menus = Object.assign(defaultMenus(), (def && def.menus && def.menus()) || {});
  const titles = Object.keys(menus);
  const html = titles.map((t) => `<div class="mb-item" data-menu="${escapeHTML(t)}">${escapeHTML(t)}</div>`).join('');
  document.getElementById('mb-app-menus').innerHTML = html;
}

function defaultMenus() {
  return {
    File: [
      { label: 'New Window', shortcut: '⌘N', action: () => activeAppId !== 'finder' && wm.open(activeAppId, { payload: {} }) },
      { label: 'New Finder Window', action: () => wm.open('finder', { payload: { path: '~' } }) },
      { label: 'New Folder', shortcut: '⇧⌘N', action: () => bus.emit('finder:newfolder') },
      { separator: true },
      { label: 'Close Window', shortcut: '⌘W', action: () => { const w = wm.focused; if (w) wm.close(w); } },
    ],
    Edit: [
      { label: 'Undo', shortcut: '⌘Z', disabled: true },
      { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
      { separator: true },
      { label: 'Cut', shortcut: '⌘X', disabled: true },
      { label: 'Copy', shortcut: '⌘C', action: () => document.execCommand && document.execCommand('copy') },
      { label: 'Paste', shortcut: '⌘V', disabled: true },
      { label: 'Select All', shortcut: '⌘A', disabled: true },
    ],
    View: [
      { label: 'as Icons', shortcut: '⌘1', action: () => bus.emit('finder:view', 'icons') },
      { label: 'as List', shortcut: '⌘2', action: () => bus.emit('finder:view', 'list') },
      { separator: true },
      { label: 'Toggle Dark Mode', action: () => settings.set({ theme: settings.effectiveTheme() === 'dark' ? 'light' : 'dark' }) },
      { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: () => { const w = wm.focused; if (w) wm.zoom(w); } },
    ],
    Window: [
      { label: 'Minimize', shortcut: '⌘M', action: () => { const w = wm.focused; if (w) wm.minimize(w); } },
      { label: 'Zoom', action: () => { const w = wm.focused; if (w) wm.zoom(w); } },
      { separator: true },
      ...wm.windows.map((w) => ({ label: w.titleEl.textContent || w.def.name, action: () => { if (w.minimized) wm.restore(w); wm.focus(w); } })),
    ],
    Help: [
      { label: 'OpenOS Help', action: () => wm.open('about', { payload: { app: activeAppId, help: true } }) },
      { label: 'Keyboard Shortcuts…', action: () => openHelpDoc() },
    ],
  };
}

async function openHelpDoc() {
  wm.open('textedit', { payload: { path: '~/Desktop/Shortcuts.md' } });
}

function clockMenuDate() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function tickClock() {
  const d = new Date();
  const s = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const clock = document.getElementById('menubar-clock');
  if (clock) clock.textContent = s;
  const sc = document.getElementById('sleep-clock');
  if (sc) sc.textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/* ---------------- control center ---------------- */
function showControlCenter(anchorRect) {
  const old = document.getElementById('cc-panel');
  if (old) { old.remove(); setOpen(null); return; }
  const p = document.createElement('div');
  p.id = 'cc-panel';
  p.className = 'cc-panel';
  p.innerHTML = `
    <div class="cc-tile" id="cc-wifi" role="button" aria-label="Wi-Fi">
      <div class="cc-row"><div class="cc-pill on">${icon('wifi', 16)}</div><div><div class="cc-name">Wi-Fi</div><div class="cc-state">OpenOS-5G</div></div></div>
    </div>
    <div class="cc-tile" id="cc-dnd" role="button" aria-label="Do Not Disturb">
      <div class="cc-row"><div class="cc-pill">${icon('dndS', 16)}</div><div><div class="cc-name">Focus</div><div class="cc-state">Do Not Disturb</div></div></div>
    </div>
    <div class="cc-tile wide" id="cc-theme" role="button" aria-label="Appearance">
      <div class="cc-row"><div class="cc-pill ${settings.effectiveTheme() === 'dark' ? 'on' : ''}">${icon('moon', 15)}</div><div><div class="cc-name">Dark Mode</div><div class="cc-state">Toggle appearance</div></div></div>
    </div>
    <div class="cc-tile wide">
      <div class="cc-slider-row">${icon('sun', 15)}<input type="range" id="cc-brightness" min="30" max="100" value="100" style="flex:1" aria-label="Brightness"></div>
    </div>
    <div class="cc-tile wide">
      <div class="cc-slider-row">${icon('speaker', 15)}<input type="range" id="cc-volume" min="0" max="100" value="70" style="flex:1" aria-label="Volume"></div>
    </div>
  `;
  document.body.appendChild(p);
  const r = anchorRect.getBoundingClientRect ? anchorRect.getBoundingClientRect() : anchorRect;
  p.style.top = (32) + 'px';
  p.style.left = Math.max(8, Math.min(r.left - 240, window.innerWidth - p.offsetWidth - 8)) + 'px';

  const close = (e) => { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('mousedown', close, true); setOpen(null); } };
  setTimeout(() => document.addEventListener('mousedown', close, true), 0);
  p.addEventListener('mousedown', (e) => e.stopPropagation());

  p.querySelector('#cc-wifi .cc-pill').addEventListener('click', (e) => { e.target.closest('.cc-pill').classList.toggle('on'); });
  const dndTile = p.querySelector('#cc-dnd');
  dndTile.querySelector('.cc-pill').addEventListener('click', (e) => {
    const pill = e.target.closest('.cc-pill');
    pill.classList.toggle('on');
    bus.emit('os:dnd', pill.classList.contains('on'));
    dndTile.querySelector('.cc-state').textContent = pill.classList.contains('on') ? 'On' : 'Do Not Disturb';
  });
  p.querySelector('#cc-theme .cc-pill').addEventListener('click', (e) => {
    const pill = e.target.closest('.cc-pill');
    const dark = !pill.classList.contains('on');
    pill.classList.toggle('on', dark);
    settings.set({ theme: dark ? 'dark' : 'light' });
  });
  p.querySelector('#cc-brightness').addEventListener('input', (e) => {
    document.getElementById('screen-brightness')?.remove();
    const layer = document.createElement('div');
    layer.id = 'screen-brightness';
    layer.style.cssText = `position:fixed;inset:0;z-index:9500;pointer-events:none;background:#000;opacity:${(100 - e.target.value) / 160}`;
    document.body.appendChild(layer);
  });
  p.querySelector('#cc-volume').addEventListener('input', (e) => bus.emit('os:volume', e.target.value / 100));
}
