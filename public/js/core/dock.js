// Dock - handles dock clicks and running indicators
const Dock = {
  runningApps: {},

  init() {
    document.querySelectorAll('.dock-item').forEach(item => {
      const app = item.dataset.app;
      item.addEventListener('click', () => this.launch(app));
    });
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
