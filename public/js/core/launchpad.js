// Launchpad - app grid overlay
const Launchpad = {
  init() {
    // Trigger via F4 or the Launchpad icon in dock (we add it implicitly)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        this.toggle();
      }
    });
    this.buildGrid();
  },

  buildGrid() {
    const apps = [
      { name: 'Finder', icon: '📁', app: 'finder' },
      { name: 'Calendar', icon: '📅', app: 'calendar' },
      { name: 'Notes', icon: '📝', app: 'notes' },
      { name: 'Clock', icon: '🕐', app: 'clock' },
      { name: 'Calculator', icon: '🔢', app: 'calculator' },
      { name: 'Weather', icon: '🌤️', app: 'weather' },
      { name: 'Mail', icon: '📧', app: 'mail' },
      { name: 'Messages', icon: '💬', app: 'messages' },
      { name: 'Contacts', icon: '👤', app: 'contacts' },
      { name: 'Photos', icon: '🖼️', app: 'photos' },
      { name: 'Music', icon: '🎵', app: 'music' },
      { name: 'Reminders', icon: '✅', app: 'reminders' },
      { name: 'Preview', icon: '👁️', app: 'preview' },
      { name: 'TextEdit', icon: '📄', app: 'textedit' },
      { name: 'Activity', icon: '📊', app: 'activity' },
      { name: 'Settings', icon: '⚙️', app: 'settings' },
      { name: 'Terminal', icon: '⬛', app: 'terminal' },
      { name: 'Trash', icon: '🗑️', app: 'trash' },
      { name: 'Hermes', icon: '🧠', app: 'hermes' },
      { name: 'OpenClaw', icon: '🦞', app: 'openclaw' },
      { name: 'Control', icon: '🛡️', app: 'agentcontrol' },
    ];

    const grid = document.getElementById('launchpad-grid');
    grid.innerHTML = apps.map(a =>
      `<div class="launchpad-item" data-app="${a.app}">
        <div class="li-icon">${a.icon}</div>
        <div class="li-label">${a.name}</div>
      </div>`
    ).join('');

    grid.querySelectorAll('.launchpad-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('launchpad-overlay').classList.add('hidden');
        Dock.launch(item.dataset.app);
      });
    });
  },

  toggle() {
    const overlay = document.getElementById('launchpad-overlay');
    overlay.classList.toggle('hidden');
  }
};
