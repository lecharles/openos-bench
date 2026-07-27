// Window Manager - creates, manages, drags, resizes windows
const WindowManager = {
  windows: {},
  zIndex: 100,
  focusedWindow: null,
  container: null,
  _saveTimer: null,

  init() {
    this.container = document.getElementById('windows-container');
    this.loadSaved();
  },

  _debouncedSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveWindows(), 300);
  },

  open(appId, title, opts = {}) {
    // Single-window-per-app by default: focus/restore an existing window
    if (!opts.forceNew) {
      const existing = Object.values(this.windows).find(w => w.appId === appId);
      if (existing) {
        existing.el.classList.remove('minimized');
        this.focus(existing);
        return existing;
      }
    }

    const win = this.createWindow(appId, title, opts);
    const key = `${appId}-${opts.instance || this.getNextInstance(appId)}`;
    win.key = key;
    this.windows[key] = win;
    this.focus(win);
    this._debouncedSave();
    Dock.setRunning(appId, true);
    Dock.bounce(appId);
    return win;
  },

  getNextInstance(appId) {
    let n = 1;
    while (this.windows[`${appId}-${n}`]) n++;
    return n;
  },

  createWindow(appId, title, opts) {
    const el = document.createElement('div');
    el.className = 'window';
    const w = opts.width || 720;
    const h = opts.height || 500;
    const l = opts.x || (120 + Object.keys(this.windows).length * 32);
    const t = opts.y || (60 + Object.keys(this.windows).length * 30);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = l + 'px';
    el.style.top = t + 'px';
    el.style.zIndex = ++this.zIndex;

    // Titlebar
    const tb = document.createElement('div');
    tb.className = 'window-titlebar';
    tb.innerHTML = `
      <div class="window-buttons">
        <div class="window-btn close" title="Close"></div>
        <div class="window-btn minimize" title="Minimize"></div>
        <div class="window-btn maximize" title="Maximize"></div>
      </div>
      <div class="window-title">${title}</div>
    `;

    // Content
    const content = document.createElement('div');
    content.className = 'window-content';
    content.setAttribute('data-app', appId);

    // Resize handles
    const handles = ['nw','ne','sw','se','n','s','e','w'];
    handles.forEach(dir => {
      const hdl = document.createElement('div');
      hdl.className = `window-resize-handle ${dir}`;
      el.appendChild(hdl);
    });

    el.appendChild(tb);
    el.appendChild(content);
    this.container.appendChild(el);

    const winObj = { el, content, appId, title, maximized: false, opts };
    el._winObj = winObj;

    // Setup interactions
    this.setupDrag(el, tb);
    this.setupResize(el);
    this.setupButtons(el, tb);

    // Focus on click
    el.addEventListener('mousedown', () => this.focus(winObj));

    // Render app content
    this.renderApp(winObj, appId, opts);

    return winObj;
  },

  setupDrag(el, titlebar) {
    let dragging = false, ox, oy, sx, sy;
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-buttons')) return;
      if (el.classList.contains('maximized')) return;
      dragging = true;
      el.classList.add('dragging');
      ox = e.clientX;
      oy = e.clientY;
      sx = parseInt(el.style.left) || el.offsetLeft;
      sy = parseInt(el.style.top) || el.offsetTop;
    });
    document.addEventListener('mousemove', el._winObj._dragMove = (e) => {
      if (!dragging) return;
      const minLeft = -el.offsetWidth + 80; // keep a grab strip visible
      el.style.left = Math.max(minLeft, sx + e.clientX - ox) + 'px';
      el.style.top = Math.max(0, sy + e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', el._winObj._dragUp = () => {
      if (dragging) {
        dragging = false;
        el.classList.remove('dragging');
        WindowManager._debouncedSave();
      }
    });
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.window-buttons')) return;
      this.toggleMaximize(el._winObj);
    });
  },

  setupResize(el) {
    el.querySelectorAll('.window-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const dir = [...handle.classList].find(c => ['nw','ne','sw','se','n','s','e','w'].includes(c));
        if (!dir || el.classList.contains('maximized')) return;
        el.classList.add('resizing');
        const startX = e.clientX, startY = e.clientY;
        const startW = el.offsetWidth, startH = el.offsetHeight;
        const startL = parseInt(el.style.left) || el.offsetLeft;
        const startT = parseInt(el.style.top) || el.offsetTop;

        const onMove = (ev) => {
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (dir.includes('e')) el.style.width = Math.max(340, startW + dx) + 'px';
          if (dir.includes('w')) { el.style.width = Math.max(340, startW - dx) + 'px'; el.style.left = (startL + dx) + 'px'; }
          if (dir.includes('s')) el.style.height = Math.max(220, startH + dy) + 'px';
          if (dir.includes('n')) { el.style.height = Math.max(220, startH - dy) + 'px'; el.style.top = (startT + dy) + 'px'; }
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          el.classList.remove('resizing');
          WindowManager._debouncedSave();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  },

  setupButtons(el, titlebar) {
    const winObj = el._winObj;
    titlebar.querySelector('.close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(winObj);
    });
    titlebar.querySelector('.minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize(winObj);
    });
    titlebar.querySelector('.maximize').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize(winObj);
    });
  },

  focus(winObj) {
    if (this.focusedWindow === winObj) return;
    if (this.focusedWindow && this.focusedWindow.el.parentNode) {
      this.focusedWindow.el.classList.remove('focused');
    }
    this.focusedWindow = winObj;
    winObj.el.classList.remove('minimized');
    winObj.el.classList.add('focused');
    winObj.el.style.zIndex = ++this.zIndex;
    // Update active app menu
    document.getElementById('active-app-menu').textContent = winObj.title;
  },

  toggleMaximize(winObj) {
    if (winObj.maximized) {
      winObj.el.classList.remove('maximized');
      winObj.maximized = false;
    } else {
      winObj.el.classList.add('maximized');
      winObj.maximized = true;
    }
    this._debouncedSave();
  },

  minimize(winObj) {
    const el = winObj.el;
    // Genie-style: animate the window down into its dock icon
    const dockItem = document.querySelector(`.dock-item[data-app="${winObj.appId}"]`);
    if (dockItem && !el.classList.contains('minimized')) {
      const r = dockItem.getBoundingClientRect();
      const wr = el.getBoundingClientRect();
      const dx = (r.left + r.width / 2) - (wr.left + wr.width / 2);
      const dy = (r.top + r.height / 2) - (wr.top + wr.height / 2);
      el.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      setTimeout(() => {
        el.classList.add('minimized');
        el.style.transition = '';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }, 300);
    } else {
      el.classList.add('minimized');
    }
    if (this.focusedWindow === winObj) {
      this.focusedWindow = null;
      document.getElementById('active-app-menu').textContent = '';
    }
    this._debouncedSave();
  },

  close(winObj) {
    // Call app cleanup if defined
    if (winObj._cleanup && typeof winObj._cleanup === 'function') {
      try { winObj._cleanup(); } catch {}
    }
    // Remove document-level drag listeners for this window
    if (winObj._dragMove) document.removeEventListener('mousemove', winObj._dragMove);
    if (winObj._dragUp) document.removeEventListener('mouseup', winObj._dragUp);

    // Animate out
    winObj.el.style.transition = 'opacity 150ms cubic-bezier(0.2,0,0,1), transform 150ms cubic-bezier(0.2,0,0,1)';
    winObj.el.style.opacity = '0';
    winObj.el.style.transform = 'scale(0.92)';
    winObj.el.style.pointerEvents = 'none';

    const key = winObj.key;
    delete this.windows[key];
    Dock.setRunning(winObj.appId, Object.values(this.windows).some(w => w.appId === winObj.appId));
    if (this.focusedWindow === winObj) {
      this.focusedWindow = null;
      document.getElementById('active-app-menu').textContent = '';
    }

    setTimeout(() => {
      if (winObj.el.parentNode) winObj.el.remove();
    }, 160);
    this._debouncedSave();
  },

  renderApp(winObj, appId, opts) {
    // Apps expose themselves as window.App<Name>; a few have irregular casing
    const nameMap = { textedit: 'TextEdit', openclaw: 'OpenClaw', agentcontrol: 'AgentControl' };
    const globalName = 'App' + (nameMap[appId] || appId.charAt(0).toUpperCase() + appId.slice(1));
    const renderFn = window[globalName];

    if (renderFn && typeof renderFn.render === 'function') {
      setTimeout(() => renderFn.render(winObj.content, opts), 50);
    } else {
      const appMeta = AppRegistry.get(appId);
      winObj.content.innerHTML = `<div class="app-empty">"${appMeta.name}" failed to load.</div>`;
      console.error(`App global ${globalName} not found for app "${appId}"`);
    }
  },

  saveWindows() {
    const data = Object.values(this.windows).map(w => {
      // Never persist transient payloads (e.g. TextEdit file content) — only open-options like path
      const { content, ...safeOpts } = w.opts || {};
      return {
        key: w.key,
        appId: w.appId,
        title: w.title,
        x: parseInt(w.el.style.left) || w.el.offsetLeft,
        y: parseInt(w.el.style.top) || w.el.offsetTop,
        width: parseInt(w.el.style.width) || w.el.offsetWidth,
        height: parseInt(w.el.style.height) || w.el.offsetHeight,
        maximized: w.maximized,
        minimized: w.el.classList.contains('minimized'),
        opts: safeOpts,
      };
    });
    fetch('/api/windows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },

  async loadSaved() {
    try {
      const resp = await fetch('/api/windows');
      const windows = await resp.json();
      if (!Array.isArray(windows)) return;
      windows.forEach(w => {
        // Clamp restored geometry into the current viewport
        const x = Math.min(Math.max(0, w.x || 0), Math.max(0, window.innerWidth - 120));
        const y = Math.min(Math.max(0, w.y || 0), Math.max(0, window.innerHeight - 120));
        const width = Math.min(w.width || 720, window.innerWidth);
        const height = Math.min(w.height || 500, window.innerHeight);
        const dup = Object.values(this.windows).some(ew => ew.appId === w.appId);
        // Minimized windows restore visible (no minimized-window dock in this build)
        const win = this.open(w.appId, w.title, {
          ...(w.opts || {}),
          x, y, width, height,
          forceNew: dup,
        });
        if (win && w.maximized) {
          win.el.classList.add('maximized');
          win.maximized = true;
        }
      });
    } catch {}
  },
};
