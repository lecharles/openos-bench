// Dock - handles dock clicks, running indicators, and magnification
const Dock = {
  runningApps: {},
  items: [],
  _dockItems: null,   // cached NodeList
  _dockEl: null,
  _containerEl: null,
  _rafId: null,
  _mouseX: -1,

  init() {
    this._dockEl = document.getElementById('dock');
    this._containerEl = document.getElementById('dock-container');
    this._dockItems = [...this._dockEl.querySelectorAll('.dock-item')];

    this._dockItems.forEach(item => {
      const app = item.dataset.app;
      item.addEventListener('click', () => this.launch(app));
    });
    this.setupMagnification();
  },

  launch(appId) {
    WindowManager.open(appId, AppRegistry.getTitle(appId));
  },

  setupMagnification() {
    const container = this._containerEl;

    // Use rAF-throttled handler for performance
    container.addEventListener('mousemove', (e) => {
      this._mouseX = e.clientX;
      if (!this._rafId) {
        this._rafId = requestAnimationFrame(() => this._updateMagnification());
      }
    });

    container.addEventListener('mouseleave', () => {
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      this._mouseX = -1;
      this._resetMagnification();
    });
  },

  _updateMagnification() {
    this._rafId = null;
    const items = this._dockItems;
    const mouseX = this._mouseX;
    const maxDist = 120;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - centerX);

      if (dist < maxDist && mouseX >= 0) {
        const t = 1 - (dist / maxDist);
        const scale = 1 + t * 0.25;
        const width = 52 + t * 24;
        item.style.width = width + 'px';
        const icon = item.querySelector('.dock-icon');
        if (icon) icon.style.transform = `scale(${scale})`;
        const label = item.querySelector('.dock-label');
        if (label) label.style.opacity = t > 0.5 ? '1' : '0';
      } else {
        item.style.width = '';
        const icon = item.querySelector('.dock-icon');
        if (icon) icon.style.transform = 'scale(1)';
        const label = item.querySelector('.dock-label');
        if (label) label.style.opacity = '0';
      }
    }
  },

  _resetMagnification() {
    const items = this._dockItems;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.style.width = '';
      item.style.transition = 'width 300ms cubic-bezier(0.17, 0.67, 0.35, 1.17)';
      const icon = item.querySelector('.dock-icon');
      if (icon) { icon.style.transition = 'transform 300ms cubic-bezier(0.17, 0.67, 0.35, 1.17)'; icon.style.transform = 'scale(1)'; }
      const label = item.querySelector('.dock-label');
      if (label) label.style.opacity = '0';
    }
    setTimeout(() => {
      for (let i = 0; i < items.length; i++) {
        items[i].style.transition = '';
        const icon = items[i].querySelector('.dock-icon');
        if (icon) icon.style.transition = '';
      }
    }, 310);
  },

  setRunning(appId, running) {
    const item = this._dockEl.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!item) return;
    item.classList.toggle('running', running);
  }
};
