// Window Manager - creates, manages, drags, resizes windows
const WindowManager = {
  windows: {},
  zIndex: 100,
  focusedWindow: null,
  container: null,

  init() {
    this.container = document.getElementById('windows-container');
    this.loadSaved();
  },

  open(appId, title, opts = {}) {
    // If window exists and is minimized, restore
    const existingKey = `${appId}-${opts.instance || 0}`;
    if (this.windows[existingKey]) {
      const win = this.windows[existingKey];
      if (win.el.classList.contains('minimized')) {
        win.el.classList.remove('minimized');
      }
      this.focus(win);
      return win;
    }

    const win = this.createWindow(appId, title, opts);
    const key = `${appId}-${opts.instance || this.getNextInstance(appId)}`;
    win.key = key;
    this.windows[key] = win;
    this.focus(win);
    this.saveWindows();
    Dock.setRunning(appId, true);
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
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      el.style.left = (sx + e.clientX - ox) + 'px';
      el.style.top = Math.max(0, sy + e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        el.classList.remove('dragging');
        WindowManager.saveWindows();
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
          WindowManager.saveWindows();
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
    this.saveWindows();
  },

  minimize(winObj) {
    winObj.el.classList.add('minimized');
    if (this.focusedWindow === winObj) {
      this.focusedWindow = null;
      document.getElementById('active-app-menu').textContent = '';
    }
    this.saveWindows();
  },

  close(winObj) {
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
    this.saveWindows();
  },

  renderApp(winObj, appId, opts) {
    // Each app module handles its own rendering
    const renderers = {
      finder: () => AppFinder && AppFinder.render(winObj.content, opts),
      calendar: () => AppCalendar && AppCalendar.render(winObj.content),
      notes: () => AppNotes && AppNotes.render(winObj.content),
      clock: () => AppClock && AppClock.render(winObj.content),
      calculator: () => AppCalculator && AppCalculator.render(winObj.content),
      weather: () => AppWeather && AppWeather.render(winObj.content),
      mail: () => AppMail && AppMail.render(winObj.content),
      messages: () => AppMessages && AppMessages.render(winObj.content),
      contacts: () => AppContacts && AppContacts.render(winObj.content),
      photos: () => AppPhotos && AppPhotos.render(winObj.content),
      music: () => AppMusic && AppMusic.render(winObj.content),
      reminders: () => AppReminders && AppReminders.render(winObj.content),
      preview: () => AppPreview && AppPreview.render(winObj.content),
      textedit: () => AppTextEdit && AppTextEdit.render(winObj.content),
      activity: () => AppActivity && AppActivity.render(winObj.content),
      settings: () => AppSettings && AppSettings.render(winObj.content),
      terminal: () => AppTerminal && AppTerminal.render(winObj.content),
      trash: () => AppTrash && AppTrash.render(winObj.content),
      hermes: () => AppHermes && AppHermes.render(winObj.content),
      openclaw: () => AppOpenClaw && AppOpenClaw.render(winObj.content),
      agentcontrol: () => AppAgentControl && AppAgentControl.render(winObj.content),
    };
    const render = renderers[appId];
    if (render) {
      // Allow DOM to settle
      setTimeout(() => render(), 50);
    } else {
      winObj.content.innerHTML = `<div class="app-empty">Application "${appId}" is loading...</div>`;
    }
  },

  saveWindows() {
    const data = Object.values(this.windows).map(w => ({
      key: w.key,
      appId: w.appId,
      title: w.title,
      x: parseInt(w.el.style.left) || w.el.offsetLeft,
      y: parseInt(w.el.style.top) || w.el.offsetTop,
      width: parseInt(w.el.style.width) || w.el.offsetWidth,
      height: parseInt(w.el.style.height) || w.el.offsetHeight,
      maximized: w.maximized,
      minimized: w.el.classList.contains('minimized'),
      opts: w.opts,
    }));
    if (data.length > 0) {
      fetch('/api/windows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
  },

  async loadSaved() {
    try {
      const resp = await fetch('/api/windows');
      const windows = await resp.json();
      if (!Array.isArray(windows)) return;
      windows.forEach(w => {
        if (!w.minimized) {
          const win = this.open(w.appId, w.title, {
            x: w.x, y: w.y, width: w.width, height: w.height, instance: w.opts?.instance,
          });
          if (win && w.maximized) {
            win.el.classList.add('maximized');
            win.maximized = true;
          }
        }
      });
    } catch {}
  },
};
