// Dock - handles dock clicks, running indicators, and magnification
const Dock = {
  runningApps: {},
  items: [],

  init() {
    this.items = document.querySelectorAll('.dock-item');
    this.items.forEach(item => {
      const app = item.dataset.app;
      item.addEventListener('click', () => this.launch(app));
    });
    this.setupMagnification();
  },

  launch(appId) {
    const titles = {
      finder: 'Finder', calendar: 'Calendar', notes: 'Notes', clock: 'Clock',
      calculator: 'Calculator', weather: 'Weather', mail: 'Mail', messages: 'Messages',
      contacts: 'Contacts', photos: 'Photos', music: 'Music', reminders: 'Reminders',
      preview: 'Preview', textedit: 'Text Editor', activity: 'Activity Monitor',
      settings: 'System Settings', terminal: 'Terminal', trash: 'Trash',
      hermes: 'Hermes', openclaw: 'OpenClaw', agentcontrol: 'Agent Control',
    };
    WindowManager.open(appId, titles[appId] || appId);
  },

  setupMagnification() {
    // Apply proximity-based magnification to dock items
    const dock = document.getElementById('dock');
    const container = document.getElementById('dock-container');

    container.addEventListener('mousemove', (e) => {
      const items = [...dock.querySelectorAll('.dock-item')];
      const mouseX = e.clientX;

      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const dist = Math.abs(mouseX - centerX);
        const maxDist = 120; // influence radius

        if (dist < maxDist) {
          const t = 1 - (dist / maxDist);
          const scale = 1 + t * 0.25;
          const width = 52 + t * 24;
          item.style.width = width + 'px';
          const icon = item.querySelector('.dock-icon');
          if (icon) icon.style.transform = `scale(${scale})`;
          const label = item.querySelector('.dock-label');
          if (label) label.style.opacity = t > 0.5 ? 1 : 0;
        } else {
          item.style.width = '52px';
          const icon = item.querySelector('.dock-icon');
          if (icon) icon.style.transform = 'scale(1)';
          const label = item.querySelector('.dock-label');
          if (label) label.style.opacity = '0';
        }
      });
    });

    container.addEventListener('mouseleave', () => {
      const items = [...dock.querySelectorAll('.dock-item')];
      items.forEach(item => {
        item.style.width = '52px';
        item.style.transition = 'width 300ms cubic-bezier(0.17, 0.67, 0.35, 1.17), transform 300ms cubic-bezier(0.17, 0.67, 0.35, 1.17)';
        const icon = item.querySelector('.dock-icon');
        if (icon) { icon.style.transition = 'transform 300ms cubic-bezier(0.17, 0.67, 0.35, 1.17)'; icon.style.transform = 'scale(1)'; }
        const label = item.querySelector('.dock-label');
        if (label) label.style.opacity = '0';
      });
      setTimeout(() => {
        items.forEach(item => {
          item.style.transition = '';
          const icon = item.querySelector('.dock-icon');
          if (icon) icon.style.transition = '';
        });
      }, 310);
    });
  },

  setRunning(appId, running) {
    const item = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!item) return;
    if (running) {
      item.classList.add('running');
    } else {
      item.classList.remove('running');
    }
  }
};
