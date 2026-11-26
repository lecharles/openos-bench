(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const uniqueId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const formatSize = bytes => bytes == null ? '—' : bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const formatDate = (date, options) => new Intl.DateTimeFormat('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
  const appIcon = (id, extra = '') => `<span class="app-icon icon-${id} ${extra}">${id === 'calendar' ? `<span class="calendar-icon-day">${new Date().getDate()}</span><svg><use href="#i-calendar"/></svg>` : `<svg><use href="#i-${id === 'settings' ? 'settings' : id}"/></svg>`}</span>`;

  const fallbackState = { settings: { theme: 'light', wallpaper: 'aurora', accent: 'blue', reduceMotion: false }, windows: {}, notes: [], events: [], contacts: [], preferences: {} };
  const OS = window.OS = {
    $, $$, esc, icon, appIcon, uniqueId, formatSize, formatDate, apps: new Map(), instances: new Map(), state: fallbackState,
    activeApp: 'finder', ready: false,
    register(id, definition) { this.apps.set(id, { id, width: 760, height: 520, minWidth: 360, minHeight: 260, ...definition }); },
    async api(url, options = {}) {
      const config = { ...options, headers: { ...(options.headers || {}) } };
      if (config.body && typeof config.body !== 'string') { config.headers['Content-Type'] = 'application/json'; config.body = JSON.stringify(config.body); }
      const response = await fetch(url, config);
      const type = response.headers.get('content-type') || '';
      const data = type.includes('application/json') ? await response.json() : await response.text();
      if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
      return data;
    },
    save(immediate = false) {
      clearTimeout(saveTimer); savePending = true;
      if (immediate) return flushState();
      saveTimer = setTimeout(flushState, 350);
      return Promise.resolve();
    },
    openApp, closeApp, minimizeApp, maximizeApp, focusApp, toast, prompt, confirm, showContext,
    applySettings,
    fileIcon(item) { return item.isDirectory ? 'folder' : item.extension && ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(item.extension) ? 'image' : 'file'; },
    isImage(item) { return ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(item.extension || ''); },
    openFile(item) { if (item.isDirectory) return openApp('finder', { path: item.path }); if (OS.isImage(item)) return openApp('preview', { path: item.path }); return openApp('textedit', { path: item.path }); }
  };

  let saveTimer = null, savePending = false, saving = false, zCounter = 100, cascade = 0;
  async function flushState() {
    clearTimeout(saveTimer);
    if (saving) { savePending = true; return; }
    if (!savePending) return;
    saving = true; savePending = false;
    try { await OS.api('/api/state', { method: 'PUT', body: OS.state }); }
    catch (error) { console.error('Could not save state', error); savePending = true; }
    finally { saving = false; if (savePending) { savePending = false; OS.save(); } }
  }

  function applySettings() {
    const settings = OS.state.settings || {};
    const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
    [...document.body.classList].filter(c => c.startsWith('wallpaper-') || c.startsWith('accent-')).forEach(c => document.body.classList.remove(c));
    document.body.classList.add(`wallpaper-${settings.wallpaper || 'aurora'}`, `accent-${settings.accent || 'blue'}`);
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    $('.theme-card small').textContent = dark ? 'Dark' : 'Light';
    $('.theme-card use').setAttribute('href', dark ? '#i-moon' : '#i-sun');
  }

  function defaultBounds(def) {
    const availableW = window.innerWidth, availableH = window.innerHeight - 30;
    const width = Math.min(def.width, availableW - 30), height = Math.min(def.height, availableH - 92);
    const offset = (cascade++ % 7) * 24;
    return { x: Math.max(10, Math.round((availableW - width) / 2 - 45 + offset)), y: Math.max(10, Math.round((availableH - height) / 2 - 25 + offset * .55)), width, height };
  }

  function normalizeBounds(raw, def) {
    const fallback = defaultBounds(def), maxW = window.innerWidth - 16, maxH = window.innerHeight - 45;
    let width = clamp(Number(raw?.width) || fallback.width, def.minWidth || 330, maxW);
    let height = clamp(Number(raw?.height) || fallback.height, def.minHeight || 220, maxH);
    let x = clamp(Number.isFinite(raw?.x) ? raw.x : fallback.x, 8 - width + 120, window.innerWidth - 100);
    let y = clamp(Number.isFinite(raw?.y) ? raw.y : fallback.y, 2, window.innerHeight - 90);
    return { x, y, width, height };
  }

  async function openApp(id, options = {}) {
    closeTransient();
    const def = OS.apps.get(id);
    if (!def) { toast('OpenOS', `${id} is not available.`); return null; }
    const existing = OS.instances.get(id);
    if (existing) {
      existing.el.hidden = false; existing.el.classList.remove('minimizing');
      existing.el.classList.add('restoring'); setTimeout(() => existing.el.classList.remove('restoring'), 300);
      OS.state.windows[id] = { ...(OS.state.windows[id] || {}), open: true, minimized: false };
      focusApp(id);
      if (Object.keys(options).some(k => !['_restore'].includes(k)) && def.reopen) { try { await def.reopen(existing.body, existing.el, options); } catch (error) { toast(def.name, error.message); } }
      OS.save(); updateDock(); return existing.el;
    }
    const restoring = !!options._restore;
    const saved = OS.state.windows[id] || {};
    const bounds = normalizeBounds(saved, def);
    const el = document.createElement('section');
    el.className = `window ${id}-window opening`; el.dataset.app = id; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', def.name);
    Object.assign(el.style, { left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, zIndex: ++zCounter });
    el.innerHTML = `<header class="window-titlebar"><div class="traffic-lights"><button class="traffic-light close" data-window-action="close" aria-label="Close ${esc(def.name)}">${icon('close')}</button><button class="traffic-light minimize" data-window-action="minimize" aria-label="Minimize ${esc(def.name)}"></button><button class="traffic-light maximize" data-window-action="maximize" aria-label="Maximize ${esc(def.name)}"></button></div><div class="window-title">${esc(def.name)}</div><div class="window-titlebar-actions"></div></header><div class="window-body"><div class="empty-state">${icon('clock')}<p>Opening ${esc(def.name)}…</p></div></div>${['n','s','e','w','ne','nw','se','sw'].map(dir => `<i class="resize-handle" data-dir="${dir}"></i>`).join('')}`;
    $('#windows').append(el);
    const body = $('.window-body', el);
    const instance = { el, body, def, options, normalBounds: bounds };
    OS.instances.set(id, instance);
    OS.state.windows[id] = { ...saved, ...bounds, open: true, minimized: restoring ? !!saved.minimized : false, maximized: restoring ? !!saved.maximized : false };
    bindWindow(instance);
    focusApp(id);
    if (restoring && saved.maximized) applyMaximize(instance, true);
    if (restoring && saved.minimized) { el.hidden = true; el.classList.remove('opening'); }
    setTimeout(() => el.classList.remove('opening'), 280);
    try {
      await def.render(body, el, options);
      if (options.title) setWindowTitle(id, options.title);
    } catch (error) {
      console.error(error); body.innerHTML = `<div class="empty-state">${icon('info')}<h3>Couldn’t open ${esc(def.name)}</h3><p>${esc(error.message)}</p></div>`;
    }
    updateDock(); if (!restoring) OS.save();
    const dockItem = $(`.dock-item[data-app="${id}"]`); if (dockItem && !restoring) { dockItem.classList.remove('bounce'); void dockItem.offsetWidth; dockItem.classList.add('bounce'); }
    return el;
  }

  function setWindowTitle(id, title) { const instance = OS.instances.get(id); if (instance) $('.window-title', instance.el).textContent = title; }
  OS.setWindowTitle = setWindowTitle;

  function bindWindow(instance) {
    const { el, def } = instance, id = def.id;
    el.addEventListener('pointerdown', () => focusApp(id));
    $('.traffic-light.close', el).addEventListener('click', event => { event.stopPropagation(); closeApp(id); });
    $('.traffic-light.minimize', el).addEventListener('click', event => { event.stopPropagation(); minimizeApp(id); });
    $('.traffic-light.maximize', el).addEventListener('click', event => { event.stopPropagation(); maximizeApp(id); });
    const titlebar = $('.window-titlebar', el);
    titlebar.addEventListener('dblclick', event => { if (!event.target.closest('button')) maximizeApp(id); });
    titlebar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button') || el.classList.contains('maximized')) return;
      event.preventDefault(); focusApp(id);
      const startX = event.clientX, startY = event.clientY, start = el.getBoundingClientRect(), desktop = $('#desktop').getBoundingClientRect();
      titlebar.setPointerCapture(event.pointerId); el.classList.add('dragging');
      const move = e => {
        const x = clamp(start.left - desktop.left + e.clientX - startX, -start.width + 110, desktop.width - 90);
        const y = clamp(start.top - desktop.top + e.clientY - startY, 0, desktop.height - 48);
        el.style.left = `${x}px`; el.style.top = `${y}px`;
      };
      const up = () => { titlebar.removeEventListener('pointermove', move); titlebar.removeEventListener('pointerup', up); titlebar.removeEventListener('pointercancel', up); el.classList.remove('dragging'); saveWindow(id); };
      titlebar.addEventListener('pointermove', move); titlebar.addEventListener('pointerup', up); titlebar.addEventListener('pointercancel', up);
    });
    $$('.resize-handle', el).forEach(handle => handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || el.classList.contains('maximized')) return;
      event.preventDefault(); event.stopPropagation(); focusApp(id);
      const dir = handle.dataset.dir, startX = event.clientX, startY = event.clientY, start = el.getBoundingClientRect(), desktop = $('#desktop').getBoundingClientRect();
      const original = { x: start.left - desktop.left, y: start.top - desktop.top, width: start.width, height: start.height };
      handle.setPointerCapture(event.pointerId);
      const move = e => {
        const dx = e.clientX - startX, dy = e.clientY - startY; let { x, y, width, height } = original;
        if (dir.includes('e')) width = Math.max(def.minWidth, original.width + dx);
        if (dir.includes('s')) height = Math.max(def.minHeight, original.height + dy);
        if (dir.includes('w')) { width = Math.max(def.minWidth, original.width - dx); x = original.x + original.width - width; }
        if (dir.includes('n')) { height = Math.max(def.minHeight, original.height - dy); y = Math.max(0, original.y + original.height - height); height = original.y + original.height - y; }
        Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
      };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); saveWindow(id); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    }));
  }

  function saveWindow(id) {
    const instance = OS.instances.get(id); if (!instance) return;
    const { el } = instance;
    if (!el.classList.contains('maximized')) {
      instance.normalBounds = { x: parseFloat(el.style.left), y: parseFloat(el.style.top), width: el.offsetWidth, height: el.offsetHeight };
    }
    OS.state.windows[id] = { ...(OS.state.windows[id] || {}), ...instance.normalBounds, open: true, minimized: !!el.hidden, maximized: el.classList.contains('maximized') };
    OS.save();
  }
  function focusApp(id) {
    const instance = OS.instances.get(id); if (!instance) return;
    $$('.window').forEach(w => w.classList.remove('focused'));
    instance.el.classList.add('focused'); instance.el.style.zIndex = ++zCounter;
    OS.activeApp = id; $('.app-menu-name').textContent = instance.def.name;
  }
  function closeApp(id) {
    const instance = OS.instances.get(id); if (!instance) return;
    saveWindow(id); OS.state.windows[id].open = false; OS.state.windows[id].minimized = false;
    instance.el.classList.add('closing');
    if (instance.def.cleanup) try { instance.def.cleanup(instance.body, instance.el); } catch {}
    setTimeout(() => { instance.el.remove(); OS.instances.delete(id); updateDock(); const remaining = [...OS.instances.keys()]; if (remaining.length) focusApp(remaining[remaining.length - 1]); else { OS.activeApp = 'finder'; $('.app-menu-name').textContent = 'Finder'; } }, 190);
    OS.save();
  }
  function minimizeApp(id) {
    const instance = OS.instances.get(id); if (!instance || instance.el.hidden) return;
    saveWindow(id); instance.el.classList.add('minimizing'); OS.state.windows[id].minimized = true;
    setTimeout(() => { instance.el.hidden = true; instance.el.classList.remove('minimizing'); updateDock(); }, 340); OS.save();
  }
  function applyMaximize(instance, value) {
    const { el } = instance;
    if (value) {
      instance.normalBounds = { x: parseFloat(el.style.left), y: parseFloat(el.style.top), width: el.offsetWidth, height: el.offsetHeight };
      el.classList.add('maximized'); Object.assign(el.style, { left: '0px', top: '0px', width: '100%', height: 'calc(100% - 73px)' });
    } else {
      el.classList.remove('maximized'); const b = instance.normalBounds;
      Object.assign(el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.width}px`, height: `${b.height}px` });
    }
  }
  function maximizeApp(id) { const instance = OS.instances.get(id); if (!instance) return; applyMaximize(instance, !instance.el.classList.contains('maximized')); saveWindow(id); }
  function updateDock() { $$('.dock-item[data-app]').forEach(button => button.classList.toggle('running', OS.instances.has(button.dataset.app))); }

  const menus = {
    apple: [
      { label: 'About This Mac', action: 'about' }, { separator: true },
      { label: 'System Settings…', action: 'settings' }, { label: 'App Store…', action: 'appstore' }, { separator: true },
      { label: 'Recent Items', action: 'recent' }, { separator: true },
      { label: 'Force Quit…', shortcut: '⌥⌘⎋', action: 'forcequit' }, { separator: true },
      { label: 'Sleep', action: 'sleep' }, { label: 'Restart…', action: 'restart' }, { label: 'Shut Down…', action: 'shutdown' }, { separator: true },
      { label: 'Lock Screen', shortcut: '⌃⌘Q', action: 'lock' }, { label: 'Log Out OpenOS User…', shortcut: '⇧⌘Q', action: 'logout' }
    ],
    app: [{ label: 'About This App', action: 'aboutapp' }, { separator: true }, { label: 'Settings…', shortcut: '⌘,', action: 'settings' }, { separator: true }, { label: 'Hide', shortcut: '⌘H', action: 'minimize' }, { label: 'Quit', shortcut: '⌘Q', action: 'quit' }],
    file: [{ label: 'New Finder Window', shortcut: '⌘N', action: 'newfinder' }, { label: 'New Folder', shortcut: '⇧⌘N', action: 'newfolder' }, { label: 'New Note', action: 'newnote' }, { separator: true }, { label: 'Open', shortcut: '⌘O', action: 'open' }, { separator: true }, { label: 'Close Window', shortcut: '⌘W', action: 'close' }],
    edit: [{ label: 'Undo', shortcut: '⌘Z', action: 'undo' }, { label: 'Redo', shortcut: '⇧⌘Z', action: 'redo' }, { separator: true }, { label: 'Cut', shortcut: '⌘X', action: 'cut' }, { label: 'Copy', shortcut: '⌘C', action: 'copy' }, { label: 'Paste', shortcut: '⌘V', action: 'paste' }, { label: 'Select All', shortcut: '⌘A', action: 'selectall' }],
    view: [{ label: 'as Icons', action: 'dummy' }, { label: 'as List', action: 'dummy' }, { separator: true }, { label: 'Toggle Appearance', action: 'theme' }, { label: 'Show Launchpad', action: 'launchpad' }, { separator: true }, { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: 'fullscreen' }],
    go: [{ label: 'Back', shortcut: '⌘[', action: 'dummy' }, { separator: true }, { label: 'Recents', action: 'newfinder' }, { label: 'Documents', shortcut: '⇧⌘O', action: 'documents' }, { label: 'Desktop', action: 'desktopfolder' }, { label: 'Downloads', shortcut: '⌥⌘L', action: 'downloads' }, { label: 'Pictures', action: 'pictures' }, { separator: true }, { label: 'Applications', shortcut: '⇧⌘A', action: 'launchpad' }],
    window: [{ label: 'Minimize', shortcut: '⌘M', action: 'minimize' }, { label: 'Zoom', action: 'zoom' }, { separator: true }, { label: 'Bring All to Front', action: 'front' }, { separator: true }, { label: 'Show Launchpad', action: 'launchpad' }],
    help: [{ label: 'OpenOS Help', action: 'help' }, { label: 'Keyboard Shortcuts', action: 'shortcuts' }, { separator: true }, { label: 'What’s New in OpenOS', action: 'whatsnew' }],
    wifi: [{ label: 'OpenOS Network', checked: true, action: 'wifiinfo' }, { label: 'Other Networks…', action: 'wifiinfo' }, { separator: true }, { label: 'Wi-Fi Settings…', action: 'settings' }]
  };

  function openMenu(name, anchor) {
    closeTransient(false);
    const dropdown = $('#menu-dropdown'), entries = menus[name] || [];
    anchor?.classList.add('active-menu');
    dropdown.innerHTML = entries.map(item => item.separator ? '<div class="menu-separator"></div>' : `<div class="menu-entry ${item.disabled ? 'disabled' : ''}" data-action="${item.action || ''}">${item.checked ? `<span class="menu-check">${icon('check')}</span>` : ''}<span>${esc(item.label)}</span>${item.shortcut ? `<span class="shortcut">${esc(item.shortcut)}</span>` : ''}</div>`).join('');
    dropdown.hidden = false;
    const rect = anchor?.getBoundingClientRect() || { left: innerWidth - 240, bottom: 30 };
    dropdown.style.left = `${clamp(rect.left, 5, innerWidth - dropdown.offsetWidth - 5)}px`; dropdown.style.top = `${rect.bottom + 3}px`;
    dropdown.dataset.anchorId = anchor?.id || '';
    if (anchor) dropdown.dataset.menuName = name;
  }
  function closeMenus() { $('#menu-dropdown').hidden = true; $$('.menu-button').forEach(b => b.classList.remove('active-menu')); }
  function closeTransient(includeOverlays = true) {
    closeMenus(); $('#context-menu').hidden = true; $('#control-center').hidden = true; $('#notification-center').hidden = true;
    if (includeOverlays) { $('#spotlight').hidden = true; }
  }

  async function performAction(action) {
    closeTransient();
    const active = OS.activeApp;
    const commands = {
      about: () => openApp('settings', { section: 'about' }), aboutapp: () => openApp('settings', { section: 'about' }), settings: () => openApp('settings'),
      appstore: () => toast('App Store', 'All built-in OpenOS apps are already installed.'), recent: () => openApp('finder', { path: '/' }),
      forcequit: () => active !== 'finder' && closeApp(active), sleep: lockScreen, lock: lockScreen,
      restart: async () => { if (await confirm('Restart OpenOS?', 'Your open windows and documents will be restored.', 'Restart')) location.reload(); },
      shutdown: async () => { if (await confirm('Shut Down?', 'This is a browser desktop, so we’ll lock the screen instead.', 'Shut Down')) lockScreen(); },
      logout: lockScreen, quit: () => active !== 'finder' ? closeApp(active) : toast('Finder', 'Finder keeps running to manage your desktop.'),
      newfinder: () => openApp('finder', { path: '/' }), newfolder: () => openApp('finder', { path: '/Documents', newFolder: true }), newnote: () => openApp('notes', { newNote: true }),
      open: () => openApp('finder'), close: () => active !== 'finder' ? closeApp(active) : null, minimize: () => active !== 'finder' ? minimizeApp(active) : null, zoom: () => active !== 'finder' && maximizeApp(active),
      undo: () => document.execCommand('undo'), redo: () => document.execCommand('redo'), cut: () => document.execCommand('cut'), copy: () => document.execCommand('copy'), paste: async () => { try { const text = await navigator.clipboard.readText(); document.execCommand('insertText', false, text); } catch { toast('Edit', 'Use your browser’s paste command in a text field.'); } }, selectall: () => document.execCommand('selectAll'),
      theme: () => { OS.state.settings.theme = document.body.classList.contains('theme-dark') ? 'light' : 'dark'; applySettings(); OS.save(); },
      launchpad: showLaunchpad, fullscreen: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(),
      documents: () => openApp('finder', { path: '/Documents' }), desktopfolder: () => openApp('finder', { path: '/Desktop' }), downloads: () => openApp('finder', { path: '/Downloads' }), pictures: () => openApp('finder', { path: '/Pictures' }),
      front: () => { if (active !== 'finder') focusApp(active); }, help: () => openApp('textedit', { path: '/Documents/Welcome.txt' }), shortcuts: showShortcuts,
      whatsnew: () => toast('OpenOS 1.0', 'A refined desktop, real files, fourteen apps, and server-side persistence.'),
      wifiinfo: () => toast('Wi-Fi', 'Connected to OpenOS Network. No external network access is used.'),
      dummy: () => toast('OpenOS', 'Choose this action inside the active app.')
    };
    if (commands[action]) await commands[action]();
  }

  function toast(title, message, duration = 3500) {
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<span class="toast-icon">${icon('info')}</span><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
    $('#toast-stack').append(el);
    const remove = () => { el.classList.add('removing'); setTimeout(() => el.remove(), 250); };
    el.addEventListener('click', remove); setTimeout(remove, duration); return el;
  }
  function dialogBase({ title, message = '', input, confirmText = 'OK', danger = false }) {
    return new Promise(resolve => {
      const layer = $('#dialog-layer');
      layer.innerHTML = `<div class="dialog" role="alertdialog" aria-label="${esc(title)}"><span class="dialog-icon">${icon(danger ? 'trash' : 'info')}</span><h3>${esc(title)}</h3><p>${esc(message)}</p>${input !== undefined ? `<input id="dialog-input" value="${esc(input)}" aria-label="${esc(title)}">` : ''}<div class="dialog-buttons"><button data-value="cancel">Cancel</button><button class="${danger ? 'danger' : 'primary'}" data-value="ok">${esc(confirmText)}</button></div></div>`;
      layer.hidden = false;
      const field = $('#dialog-input'); if (field) { field.focus(); field.select(); }
      const done = value => { layer.hidden = true; layer.innerHTML = ''; document.removeEventListener('keydown', key, true); resolve(value); };
      const key = event => { if (event.key === 'Escape') { event.preventDefault(); done(null); } if (event.key === 'Enter' && input !== undefined) { event.preventDefault(); done(field.value); } };
      document.addEventListener('keydown', key, true);
      $$('.dialog-buttons button', layer).forEach(button => button.addEventListener('click', () => done(button.dataset.value === 'ok' ? (field ? field.value : true) : null)));
    });
  }
  function prompt(title, initial = '', message = '') { return dialogBase({ title, message, input: initial, confirmText: 'Save' }); }
  function confirm(title, message = '', confirmText = 'OK', danger = false) { return dialogBase({ title, message, confirmText, danger }).then(Boolean); }

  function showContext(items, x, y) {
    closeTransient(false); const menu = $('#context-menu');
    menu.innerHTML = items.map(item => item.separator ? '<div class="menu-separator"></div>' : `<div class="menu-entry ${item.disabled ? 'disabled' : ''}" data-context-action="${esc(item.action)}">${esc(item.label)}</div>`).join('');
    menu.hidden = false; menu.style.left = `${clamp(x, 5, innerWidth - menu.offsetWidth - 6)}px`; menu.style.top = `${clamp(y, 30, innerHeight - menu.offsetHeight - 8)}px`;
    $$('.menu-entry', menu).forEach(entry => entry.addEventListener('click', () => { const item = items.find(i => i.action === entry.dataset.contextAction); menu.hidden = true; item?.handler?.(); }));
  }

  function lockScreen() {
    const boot = $('#boot-screen'); boot.classList.remove('finished'); boot.style.background = 'rgba(8,12,20,.78)'; boot.style.backdropFilter = 'blur(25px)';
    boot.innerHTML = `${icon('apple')}<div style="text-align:center"><h2 style="font-size:28px;font-weight:400;margin:0 0 8px">OpenOS User</h2><p style="opacity:.65">Click anywhere to log in</p></div>`;
    const unlock = () => { boot.classList.add('finished'); setTimeout(() => { boot.style.display = 'none'; }, 700); boot.removeEventListener('click', unlock); };
    boot.style.display = 'flex'; boot.addEventListener('click', unlock);
  }
  function showShortcuts() { toast('Keyboard shortcuts', '⌘ Space: Spotlight · ⌘ W: Close · ⌘ M: Minimize · ⌘ Q: Quit · ⌘ S: Save', 6500); }

  function fuzzyScore(query, text) {
    query = query.toLowerCase(); text = text.toLowerCase();
    if (!query) return 1; if (text === query) return 1000; if (text.startsWith(query)) return 700 - text.length; if (text.includes(query)) return 500 - text.indexOf(query);
    let qi = 0, score = 0; for (const char of text) { if (char === query[qi]) { qi++; score += 4; } } return qi === query.length ? score : 0;
  }
  let spotlightResults = [], spotlightIndex = 0, spotlightSearchTimer;
  function showSpotlight() {
    closeTransient(); $('#launchpad').hidden = true;
    const overlay = $('#spotlight'); overlay.hidden = false; const input = $('#spotlight-input'); input.value = ''; spotlightIndex = 0; renderSpotlight(''); setTimeout(() => input.focus(), 20);
  }
  function appResult(def) { return { type: 'app', id: def.id, name: def.name, subtitle: def.description || 'OpenOS application', kind: 'Application', icon: def.id }; }
  function renderSpotlight(query) {
    const apps = [...OS.apps.values()].map(def => ({ def, score: fuzzyScore(query, def.name) })).filter(x => x.score).sort((a, b) => b.score - a.score).slice(0, query ? 7 : 6).map(x => appResult(x.def));
    spotlightResults = apps; spotlightIndex = clamp(spotlightIndex, 0, Math.max(0, apps.length - 1)); paintSpotlight();
    clearTimeout(spotlightSearchTimer);
    if (query.trim().length >= 2) spotlightSearchTimer = setTimeout(async () => {
      try {
        const data = await OS.api(`/api/fs/search?q=${encodeURIComponent(query.trim())}`);
        if ($('#spotlight-input').value !== query) return;
        spotlightResults = [...apps, ...data.items.slice(0, 5).map(item => ({ type: 'file', item, name: item.name, subtitle: item.path, kind: item.isDirectory ? 'Folder' : 'Document', icon: OS.fileIcon(item) }))]; paintSpotlight();
      } catch {}
    }, 180);
  }
  function paintSpotlight() {
    const container = $('#spotlight-results');
    if (!spotlightResults.length) { container.innerHTML = $('#spotlight-input').value ? '<div class="spotlight-empty">No results. Try another search.</div>' : ''; return; }
    container.innerHTML = `<div class="spotlight-section-title">${$('#spotlight-input').value ? 'Top Hits' : 'Suggested'}</div>` + spotlightResults.map((result, index) => `<div class="spotlight-result ${index === spotlightIndex ? 'selected' : ''}" data-index="${index}">${result.type === 'app' ? appIcon(result.icon) : `<span class="app-icon" style="background:rgba(125,145,170,.18);color:var(--accent)">${icon(result.icon)}</span>`}<div class="spotlight-result-text"><strong>${esc(result.name)}</strong><small>${esc(result.subtitle)}</small></div><span class="spotlight-result-kind">${esc(result.kind)}</span></div>`).join('');
    $$('.spotlight-result', container).forEach(el => { el.addEventListener('mouseenter', () => { spotlightIndex = Number(el.dataset.index); paintSpotlight(); }); el.addEventListener('click', () => launchSpotlight(Number(el.dataset.index))); });
  }
  function launchSpotlight(index) { const result = spotlightResults[index]; if (!result) return; $('#spotlight').hidden = true; result.type === 'app' ? openApp(result.id) : OS.openFile(result.item); }

  function showLaunchpad() {
    closeTransient(); $('#spotlight').hidden = true; const overlay = $('#launchpad'); overlay.hidden = false; $('#launchpad-input').value = ''; renderLaunchpad(''); setTimeout(() => $('#launchpad-input').focus(), 50);
  }
  function renderLaunchpad(query) {
    const defs = [...OS.apps.values()].filter(def => fuzzyScore(query, def.name));
    $('#launchpad-grid').innerHTML = defs.map(def => `<button class="launchpad-app" data-app="${def.id}">${appIcon(def.id)}<span>${esc(def.name)}</span></button>`).join('') || '<div style="grid-column:1/-1;text-align:center;opacity:.7">No applications found</div>';
    $$('.launchpad-app').forEach(button => button.addEventListener('click', () => { $('#launchpad').hidden = true; openApp(button.dataset.app); }));
  }

  function updateClock() {
    const now = new Date(), time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#menu-clock').innerHTML = `${esc(day)}&nbsp; ${esc(time)}`;
    $('.calendar-icon-day').textContent = now.getDate();
    $('#notification-weekday').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
    $('#notification-date').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const events = (OS.state.events || []).filter(e => e.date === today);
    $('#notification-events').textContent = events.length ? `${events.length} event${events.length > 1 ? 's' : ''} today. Next: ${events[0].title}.` : 'No events scheduled today. Enjoy the open space.';
  }

  function bindShell() {
    $$('.menu-button[data-menu]').forEach(button => {
      button.addEventListener('click', event => { event.stopPropagation(); if (!$('#menu-dropdown').hidden && $('#menu-dropdown').dataset.menuName === button.dataset.menu) closeMenus(); else openMenu(button.dataset.menu, button); });
      button.addEventListener('mouseenter', () => { if (!$('#menu-dropdown').hidden && $('#menu-dropdown').dataset.menuName) openMenu(button.dataset.menu, button); });
    });
    $('#menu-dropdown').addEventListener('click', event => { const entry = event.target.closest('.menu-entry'); if (entry && !entry.classList.contains('disabled')) performAction(entry.dataset.action); });
    document.addEventListener('click', event => { if (!event.target.closest('#menu-dropdown,#context-menu,.floating-panel,#control-button,#clock-button')) closeTransient(false); });
    $('#spotlight-button').addEventListener('click', event => { event.stopPropagation(); showSpotlight(); });
    $('#spotlight').addEventListener('click', event => { if (event.target === $('#spotlight')) $('#spotlight').hidden = true; });
    $('#spotlight-input').addEventListener('input', event => { spotlightIndex = 0; renderSpotlight(event.target.value); });
    $('#spotlight-input').addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); spotlightIndex = clamp(spotlightIndex + 1, 0, spotlightResults.length - 1); paintSpotlight(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); spotlightIndex = clamp(spotlightIndex - 1, 0, spotlightResults.length - 1); paintSpotlight(); }
      if (event.key === 'Enter') { event.preventDefault(); launchSpotlight(spotlightIndex); }
    });
    $('#control-button').addEventListener('click', event => { event.stopPropagation(); const panel = $('#control-center'); const show = panel.hidden; closeTransient(); panel.hidden = !show; });
    $('#clock-button').addEventListener('click', event => { event.stopPropagation(); const panel = $('#notification-center'); const show = panel.hidden; closeTransient(); panel.hidden = !show; });
    $$('.control-toggle').forEach(button => button.addEventListener('click', () => { button.classList.toggle('active'); const small = $('small', button); if (small && button.dataset.toggle !== 'wifi') small.textContent = button.classList.contains('active') ? 'On' : 'Off'; if (button.dataset.toggle === 'wifi') $('small', button).textContent = button.classList.contains('active') ? 'OpenOS Network' : 'Off'; }));
    $('[data-toggle="focus"]').addEventListener('click', () => { const button = $('[data-toggle="focus"]'); button.classList.toggle('active'); $('small', button).textContent = button.classList.contains('active') ? 'Do Not Disturb' : 'Off'; });
    $('[data-toggle="theme"]').addEventListener('click', () => performAction('theme'));
    $('#brightness-slider').addEventListener('input', event => $('#brightness-dimmer').style.opacity = String((100 - Number(event.target.value)) / 100));
    $('[data-open-app="calendar"]').addEventListener('click', () => openApp('calendar'));
    $$('.dock-item').forEach(button => button.addEventListener('click', () => button.dataset.app ? openApp(button.dataset.app) : button.dataset.action === 'launchpad' ? showLaunchpad() : null));
    const dock = $('#dock');
    dock.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || innerWidth < 850) return;
      $$('.dock-item', dock).forEach(item => { const rect = item.getBoundingClientRect(), distance = Math.abs(event.clientX - (rect.left + rect.width / 2)); const scale = distance < 115 ? 1 + .65 * Math.pow(1 - distance / 115, 2) : 1; $('.dock-icon', item).style.transform = `scale(${scale}) translateY(${-(scale - 1) * 13}px)`; item.style.margin = `0 ${(scale - 1) * 10}px`; });
    });
    dock.addEventListener('pointerleave', () => $$('.dock-item', dock).forEach(item => { $('.dock-icon', item).style.transform = ''; item.style.margin = ''; }));
    $('#launchpad-input').addEventListener('input', event => renderLaunchpad(event.target.value));
    $('#launchpad').addEventListener('click', event => { if (event.target === $('#launchpad') || event.target.classList.contains('launchpad-inner')) $('#launchpad').hidden = true; });
    document.addEventListener('keydown', event => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.code === 'Space') { event.preventDefault(); $('#spotlight').hidden ? showSpotlight() : $('#spotlight').hidden = true; return; }
      if (event.key === 'Escape') { closeTransient(); $('#launchpad').hidden = true; return; }
      if (event.key === 'F4') { event.preventDefault(); showLaunchpad(); return; }
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'w') { event.preventDefault(); if (OS.activeApp !== 'finder') closeApp(OS.activeApp); }
      if (key === 'm') { event.preventDefault(); if (OS.activeApp !== 'finder') minimizeApp(OS.activeApp); }
      if (key === 'q') { event.preventDefault(); if (OS.activeApp !== 'finder') closeApp(OS.activeApp); }
      if (key === ',') { event.preventDefault(); openApp('settings'); }
    });
    window.addEventListener('beforeunload', () => { if (savePending) fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(OS.state), keepalive: true }); });
    window.addEventListener('resize', () => { for (const [id, instance] of OS.instances) { if (!instance.el.classList.contains('maximized')) { const b = normalizeBounds(instance.normalBounds, instance.def); Object.assign(instance.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.width}px`, height: `${b.height}px` }); } } });
  }

  const desktopPaths = { disk: '/', documents: '/Documents', welcome: '/Desktop/About OpenOS.txt' };
  function bindDesktop() {
    $$('.desktop-icon').forEach(button => {
      button.addEventListener('click', event => { event.stopPropagation(); $$('.desktop-icon').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); });
      button.addEventListener('dblclick', () => openDesktopItem(button));
      button.addEventListener('contextmenu', event => {
        event.preventDefault(); event.stopPropagation(); button.click();
        showContext([{ label: 'Open', action: 'open', handler: () => openDesktopItem(button) }, { label: 'Get Info', action: 'info', handler: () => desktopInfo(button) }, { separator: true }, ...(button.dataset.desktopAction !== 'disk' ? [{ label: 'Rename', action: 'rename', handler: () => renameDesktopItem(button) }, { label: 'Move to Trash', action: 'trash', handler: () => trashDesktopItem(button) }] : []), { separator: true }, { label: 'Change Wallpaper…', action: 'wallpaper', handler: () => openApp('settings', { section: 'wallpaper' }) }], event.clientX, event.clientY);
      });
    });
    $('#desktop').addEventListener('click', event => { if (event.target === $('#desktop') || event.target === $('#windows')) $$('.desktop-icon').forEach(b => b.classList.remove('selected')); });
    $('#desktop').addEventListener('contextmenu', event => {
      if (event.composedPath().some(node => node instanceof Element && (node.matches('.desktop-icon,.window,#dock') || node.id === 'windows'))) return; event.preventDefault();
      showContext([{ label: 'New Folder', action: 'folder', handler: newDesktopFolder }, { label: 'New Note', action: 'note', handler: () => openApp('notes', { newNote: true }) }, { separator: true }, { label: 'Clean Up', action: 'cleanup', handler: () => toast('Desktop', 'Desktop icons are neatly arranged.') }, { label: 'Show View Options', action: 'view', handler: () => toast('Desktop', 'Icon size: medium · Sort by: name') }, { separator: true }, { label: 'Change Wallpaper…', action: 'wallpaper', handler: () => openApp('settings', { section: 'wallpaper' }) }], event.clientX, event.clientY);
    });
    $('.desktop-widget').addEventListener('dblclick', () => openApp('weather'));
  }
  function openDesktopItem(button) { const type = button.dataset.desktopAction, path = button.dataset.path || desktopPaths[type]; type === 'welcome' ? openApp('textedit', { path }) : openApp('finder', { path }); }
  async function desktopInfo(button) { const type = button.dataset.desktopAction; if (type === 'disk') return dialogBase({ title: 'Macintosh HD', message: 'OpenOS Workspace\n4 folders · Server-backed storage\nAvailable: Unlimited for this demo', confirmText: 'Done' }); try { const data = await OS.api(`/api/fs/list?path=${encodeURIComponent(type === 'documents' ? '/Documents' : '/Desktop')}`); const item = type === 'documents' ? { name: 'Documents', path: '/Documents', isDirectory: true } : data.items.find(i => i.path === (button.dataset.path || desktopPaths.welcome)); await dialogBase({ title: item?.name || 'Info', message: `${item?.isDirectory ? 'Folder' : 'Document'}\n${item?.path || '/Documents'}\n${item ? formatSize(item.size) : ''}`, confirmText: 'Done' }); } catch (e) { toast('Finder', e.message); } }
  async function renameDesktopItem(button) { const type = button.dataset.desktopAction; if (type === 'documents') return toast('Finder', 'Favorite folders cannot be renamed.'); const oldPath = button.dataset.path || desktopPaths[type]; const name = await prompt('Rename item', $('.desktop-label', button).textContent); if (!name || name === $('.desktop-label', button).textContent) return; try { const data = await OS.api('/api/fs/rename', { method: 'POST', body: { path: oldPath, newName: name } }); button.dataset.path = data.item.path; $('.desktop-label', button).textContent = name; toast('Finder', `Renamed to ${name}`); } catch (e) { toast('Finder', e.message); } }
  async function trashDesktopItem(button) { const oldPath = button.dataset.path || desktopPaths[button.dataset.desktopAction]; if (button.dataset.desktopAction === 'documents') return toast('Finder', 'Favorite folders cannot be moved to Trash.'); if (!await confirm('Move to Trash?', `“${$('.desktop-label', button).textContent}” will be moved to the Trash.`, 'Move to Trash', true)) return; try { await OS.api('/api/fs/trash', { method: 'POST', body: { path: oldPath } }); button.hidden = true; toast('Finder', 'Item moved to Trash.'); } catch (e) { toast('Finder', e.message); } }
  async function newDesktopFolder() { const name = await prompt('New folder', 'untitled folder', 'Create a folder on the desktop.'); if (!name) return; try { await OS.api('/api/fs/mkdir', { method: 'POST', body: { path: '/Desktop', name } }); toast('Finder', `Created “${name}” on the desktop.`); } catch (e) { toast('Finder', e.message); } }

  async function init() {
    try { OS.state = { ...fallbackState, ...(await OS.api('/api/state')) }; }
    catch { toast('OpenOS', 'The server is unavailable. Changes may not be saved.'); }
    OS.state.settings = { ...fallbackState.settings, ...(OS.state.settings || {}) };
    OS.state.windows = OS.state.windows || {}; OS.state.notes = OS.state.notes || []; OS.state.events = OS.state.events || [];
    if (typeof window.registerOpenOSApps === 'function') window.registerOpenOSApps(OS);
    applySettings(); bindShell(); bindDesktop(); renderLaunchpad(''); updateClock(); setInterval(updateClock, 15000);
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);
    const entries = Object.entries(OS.state.windows).filter(([id, value]) => value?.open && OS.apps.has(id));
    for (const [id, value] of entries) await openApp(id, { _restore: true, ...(value.appOptions || {}) });
    if (!entries.length) await openApp('finder');
    updateDock(); OS.ready = true;
    setTimeout(() => { $('#boot-screen').classList.add('finished'); setTimeout(() => $('#boot-screen').style.display = 'none', 750); }, 650);
  }
  init();
})();
