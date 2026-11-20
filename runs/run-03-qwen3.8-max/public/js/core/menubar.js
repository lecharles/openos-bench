import { el, fmtTime, esc } from './util.js';
import * as WM from './wm.js';
import { APPS } from '../apps/registry.js';
import { launch } from './launch.js';
import { settings } from './state.js';
import { applySettings } from './apply.js';
import { showContextMenu } from './contextmenu.js';

const LOGO = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

let openMenu = null;   // {title, el}
let activeApp = 'finder';

export function buildMenubar() {
  const left = document.getElementById('mb-left');
  const right = document.getElementById('mb-right');
  left.innerHTML = ''; right.innerHTML = '';

  const logo = el('div', { class: 'mb-item logo', 'data-testid': 'menubar-logo', html: LOGO });
  logo.addEventListener('click', (e) => toggleMenu(e, logo, appleMenu()));
  left.append(logo);

  const appName = el('div', { class: 'mb-item app-name', id: 'mb-appname', text: 'Finder' });
  left.append(appName);
  const menuHost = el('div', { id: 'mb-menus', style: { display: 'contents' } });
  left.append(menuHost);

  // right side
  const cc = el('div', { class: 'mb-item mb-icon', id: 'mb-cc', title: 'Control Center', html: '<svg viewBox="0 0 18 18"><rect x="1.5" y="3.5" width="15" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="6" r="1.7" fill="currentColor"/><rect x="1.5" y="10" width="15" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12.5" cy="12.5" r="1.7" fill="currentColor"/></svg>' });
  cc.addEventListener('click', (e) => { e.stopPropagation(); toggleCC(); });
  const wifi = el('div', { class: 'mb-item mb-icon', title: 'Wi-Fi: OpenOS-5G', html: '<svg viewBox="0 0 18 18"><path d="M2 6.5a10.5 10.5 0 0 1 14 0M4.4 9.2a7 7 0 0 1 9.2 0M6.8 11.9a3.6 3.6 0 0 1 4.4 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="9" cy="14.2" r="1.4" fill="currentColor"/></svg>' });
  wifi.addEventListener('click', (e) => showContextMenu(e.clientX - 140, 30, [
    { label: 'Wi-Fi: OpenOS-5G', checked: true, disabled: true },
    { separator: true },
    { label: 'Open Network Settings…', action: () => launch('settings') },
  ]));
  const battery = el('div', { class: 'mb-item mb-icon', title: 'Battery: 87%', html: '<svg viewBox="0 0 22 18"><rect x="1.5" y="5" width="16" height="8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="6.5" width="11" height="5" rx="1" fill="currentColor"/><path d="M19 7.5v3a1.6 1.6 0 0 0 0-3z" fill="currentColor"/></svg>' });
  const clock = el('div', { class: 'mb-item', id: 'mb-clock', 'data-testid': 'menubar-clock' });
  right.append(cc, wifi, battery, clock);
  tickClock();
  setInterval(tickClock, 1000);

  WM.onWM((type, win) => {
    if (type === 'focus') setActiveApp(win ? win.appId : 'finder');
    if (type === 'open' || type === 'close') renderAppMenus();
  });
  renderAppMenus();

  document.addEventListener('mousedown', (e) => {
    if (openMenu && !e.target.closest('.mb-menu') && !e.target.closest('.mb-item')) closeMenu();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeCC(); } });
}

function tickClock() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const c = document.getElementById('mb-clock');
  if (c) c.textContent = `${days[d.getDay()]} ${mons[d.getMonth()]} ${d.getDate()}  ${fmtTime(d)}`;
  const lc = document.getElementById('lock-clock');
  if (lc) lc.textContent = fmtTime(d).replace(' ', '');
  const ld = document.getElementById('lock-date');
  if (ld) ld.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function setActiveApp(id) {
  activeApp = APPS[id] ? id : 'finder';
  const n = document.getElementById('mb-appname');
  if (n) n.textContent = APPS[activeApp].name === 'Finder' ? 'Finder' : APPS[activeApp].name;
  renderAppMenus();
}

function renderAppMenus() {
  const host = document.getElementById('mb-menus');
  if (!host) return;
  host.innerHTML = '';
  closeMenu();
  const win = WM.focusedWindow();
  const app = APPS[activeApp];
  let specs = [];
  if (win && win.appId === activeApp && app.menus) specs = app.menus(win) || [];
  else if (app.menus && !win) specs = app.menus({ api: {} }) || [];
  if (!specs.length) specs = defaultMenus();
  for (const m of specs) {
    const item = el('div', { class: 'mb-item', text: m.title });
    item.addEventListener('click', (e) => toggleMenu(e, item, m.items));
    item.addEventListener('mouseenter', () => { if (openMenu && openMenu.anchor !== item) toggleMenu({ clientX: 0 }, item, m.items, true); });
    host.append(item);
  }
  // Window + Help always
  const winMenu = el('div', { class: 'mb-item', text: 'Window' });
  winMenu.addEventListener('click', (e) => toggleMenu(e, winMenu, windowMenuItems()));
  winMenu.addEventListener('mouseenter', () => { if (openMenu && openMenu.anchor !== winMenu) toggleMenu({ clientX: 0 }, winMenu, windowMenuItems(), true); });
  const helpMenu = el('div', { class: 'mb-item', text: 'Help' });
  helpMenu.addEventListener('click', (e) => toggleMenu(e, helpMenu, [
    { label: 'OpenOS Help', action: () => launch('terminal') },
    { label: 'Keyboard Shortcuts', action: () => showShortcuts() },
    { separator: true },
    { label: 'About OpenOS', action: () => launch('about') },
  ]));
  helpMenu.addEventListener('mouseenter', () => { if (openMenu && openMenu.anchor !== helpMenu) toggleMenu({ clientX: 0 }, helpMenu, [], true); });
  host.append(winMenu, helpMenu);
}

function defaultMenus() {
  return [
    { title: 'File', items: [
      { label: 'New Window', shortcut: '⌘N', action: () => launch(activeApp, { forceNew: true }) },
      { label: 'Close Window', shortcut: '⌘W', action: () => { const w = WM.focusedWindow(); if (w) WM.closeWindow(w); } },
    ] },
    { title: 'Edit', items: [
      { label: 'Undo', shortcut: '⌘Z', disabled: true },
      { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
      { separator: true },
      { label: 'Cut', shortcut: '⌘X', action: () => document.execCommand('cut') },
      { label: 'Copy', shortcut: '⌘C', action: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: '⌘V', action: () => document.execCommand('paste') },
    ] },
  ];
}

function windowMenuItems() {
  const items = [
    { label: 'Minimize', shortcut: '⌘M', action: () => { const w = WM.focusedWindow(); if (w) WM.minimizeWindow(w); } },
    { label: 'Zoom', action: () => { const w = WM.focusedWindow(); if (w) WM.toggleMax(w); } },
    { separator: true },
  ];
  const wins = WM.allWindows().sort((a, b) => b.z - a.z);
  for (const w of wins.slice(0, 8)) {
    items.push({ label: `${APPS[w.appId]?.name || w.appId} — ${w.title}`, checked: w === WM.focusedWindow(), action: () => WM.focusWindow(w) });
  }
  return items;
}

function appleMenu() {
  return [
    { label: 'About This Mac', action: () => launch('about') },
    { separator: true },
    { label: 'System Settings…', action: () => launch('settings') },
    { label: 'App Windows…', action: () => launch('finder') },
    { separator: true },
    { label: 'Sleep', action: () => lock(true) },
    { label: 'Lock Screen', shortcut: '⌃⌘Q', action: () => lock(false) },
    { label: 'Restart…', action: () => { if (confirm('Restart OpenOS? Open windows will be restored.')) location.reload(); } },
  ];
}

function showShortcuts() {
  showContextMenu(innerWidth / 2 - 120, innerHeight / 2 - 140, [
    { label: '⌘Space — Spotlight', disabled: true },
    { label: '⌘W — close window', disabled: true },
    { label: '⌘M — minimize', disabled: true },
    { label: '⌘⌫ — move to Trash (Finder)', disabled: true },
    { label: 'Esc — dismiss overlays', disabled: true },
  ]);
}

function toggleMenu(e, anchor, items, hoverSwitch = false) {
  if (openMenu && openMenu.anchor === anchor && !hoverSwitch) { closeMenu(); return; }
  closeMenu();
  if (!items || !items.length) return;
  const menu = el('div', { class: 'mb-menu', role: 'menu' });
  for (const it of items) {
    if (!it) continue;
    if (it.separator) { menu.append(el('div', { class: 'sep' })); continue; }
    const row = el('div', { class: 'mi' + (it.disabled ? ' disabled' : '') },
      it.checked ? el('span', { text: '✓', style: { width: '12px' } }) : null,
      el('span', { text: it.label }),
      it.shortcut ? el('span', { class: 'shortcut', text: it.shortcut }) : null);
    if (!it.disabled) row.addEventListener('mousedown', (ev) => { ev.stopPropagation(); closeMenu(); setTimeout(() => it.action && it.action(), 0); });
    menu.append(row);
  }
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mr = menu.getBoundingClientRect();
  menu.style.left = Math.min(r.left, innerWidth - mr.width - 6) + 'px';
  menu.style.top = (r.bottom + 2) + 'px';
  openMenu = { anchor, el: menu };
  anchor.classList.add('open');
  void e;
}
function closeMenu() {
  if (!openMenu) return;
  openMenu.el.remove();
  openMenu.anchor.classList.remove('open');
  openMenu = null;
}

// ---------------- control center ----------------
function toggleCC() {
  const cc = document.getElementById('control-center');
  if (cc.dataset.open === 'true') { closeCC(); return; }
  cc.innerHTML = '';
  const grid = el('div', { class: 'cc-grid' });
  const dark = settings.get('theme') === 'dark';
  const tileDark = el('div', { class: 'cc-tile' + (dark ? ' on' : ''), 'data-testid': 'cc-darkmode' },
    el('span', { html: '<svg viewBox="0 0 18 18"><path d="M14.5 10.7A6.6 6.6 0 0 1 7.3 3.5a6.6 6.6 0 1 0 7.2 7.2z" fill="currentColor"/></svg>' }),
    el('div', {}, el('div', { class: 't-title', text: 'Dark Mode' }), el('div', { class: 't-sub', text: dark ? 'On' : 'Off' })));
  tileDark.addEventListener('click', () => {
    settings.set('theme', settings.get('theme') === 'dark' ? 'light' : 'dark', true);
    applySettings(); toggleCC(); toggleCC();
  });
  const tileWifi = el('div', { class: 'cc-tile on' },
    el('span', { html: '<svg viewBox="0 0 18 18"><path d="M2 6.5a10.5 10.5 0 0 1 14 0M4.4 9.2a7 7 0 0 1 9.2 0M6.8 11.9a3.6 3.6 0 0 1 4.4 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="9" cy="14.2" r="1.4" fill="currentColor"/></svg>' }),
    el('div', {}, el('div', { class: 't-title', text: 'Wi-Fi' }), el('div', { class: 't-sub', text: 'OpenOS-5G' })));
  grid.append(tileDark, tileWifi);
  cc.append(grid);
  const rowB = el('div', { class: 'cc-row' },
    el('span', { class: 'cc-lab', text: 'Brightness' }),
    el('input', { class: 'os-slider', id: 'cc-bright', type: 'range', min: '0.35', max: '1', step: '0.01', value: String(settings.get('brightness')) }));
  rowB.querySelector('input').addEventListener('input', (e) => { settings.set('brightness', parseFloat(e.target.value)); applySettings(); });
  const rowV = el('div', { class: 'cc-row' },
    el('span', { class: 'cc-lab', text: 'Volume' }),
    el('input', { class: 'os-slider', id: 'cc-vol', type: 'range', min: '0', max: '1', step: '0.01', value: String(settings.get('volume')) }));
  rowV.querySelector('input').addEventListener('input', (e) => { settings.set('volume', parseFloat(e.target.value)); applySettings(); });
  const rowW = el('div', { class: 'cc-row' },
    el('span', { class: 'cc-lab', text: 'Wallpaper' }),
    el('div', { class: 'os-seg', id: 'cc-wp' }, ['sonoma', 'bigsur', 'graphite'].map((w) => el('button', { class: settings.get('wallpaper') === w ? 'on' : '', text: w[0].toUpperCase() + w.slice(1), onclick: () => { settings.set('wallpaper', w, true); applySettings(); toggleCC(); toggleCC(); } }))));
  cc.append(rowB, rowV, rowW);
  cc.dataset.open = 'true';
}
export function closeCC() {
  const cc = document.getElementById('control-center');
  if (cc) cc.dataset.open = 'false';
}
document.addEventListener('mousedown', (e) => {
  const cc = document.getElementById('control-center');
  if (cc && cc.dataset.open === 'true' && !e.target.closest('#control-center') && !e.target.closest('#mb-cc')) closeCC();
}, true);

// ---------------- lock / sleep ----------------
export function lock(sleep) {
  const ls = document.getElementById('lock-screen');
  ls.dataset.on = 'true';
  if (sleep) document.getElementById('brightness-layer').style.opacity = '0.92';
  const unlock = () => {
    ls.dataset.on = 'false';
    document.getElementById('brightness-layer').style.opacity = String(Math.max(0, 1 - settings.get('brightness')) * 0.78);
    ls.removeEventListener('mousedown', unlock);
    document.removeEventListener('keydown', unlock, true);
  };
  setTimeout(() => {
    ls.addEventListener('mousedown', unlock);
    document.addEventListener('keydown', unlock, true);
  }, 400);
}
void esc;
