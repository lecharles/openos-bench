// Spotlight - search overlay
const Spotlight = {
  init() {
    const btn = document.getElementById('spotlight-btn');
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    const results = document.getElementById('spotlight-results');

    btn.addEventListener('click', () => this.show(overlay, input));
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        this.show(overlay, input);
      }
      if (e.key === 'Escape') overlay.classList.add('hidden');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    input.addEventListener('input', () => this.search(input.value, results));
  },

  show(overlay, input) {
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    document.getElementById('spotlight-results').innerHTML = '';
  },

  search(query, resultsEl) {
    if (!query) { resultsEl.innerHTML = ''; return; }
    const q = query.toLowerCase();
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
      { name: 'Text Editor', icon: '📄', app: 'textedit' },
      { name: 'Activity Monitor', icon: '📊', app: 'activity' },
      { name: 'System Settings', icon: '⚙️', app: 'settings' },
      { name: 'Terminal', icon: '⬛', app: 'terminal' },
      { name: 'Trash', icon: '🗑️', app: 'trash' },
      { name: 'Hermes', icon: '🧠', app: 'hermes' },
      { name: 'OpenClaw', icon: '🦞', app: 'openclaw' },
      { name: 'Agent Control', icon: '🛡️', app: 'agentcontrol' },
    ];

    const matches = apps.filter(a => a.name.toLowerCase().includes(q));
    resultsEl.innerHTML = matches.map((a, i) =>
      `<div class="spotlight-result${i === 0 ? ' selected' : ''}" data-app="${a.app}">
        <span class="sr-icon">${a.icon}</span>
        <span class="sr-name">${a.name}</span>
      </div>`
    ).join('');

    resultsEl.querySelectorAll('.spotlight-result').forEach(el => {
      el.addEventListener('click', () => {
        const app = el.dataset.app;
        document.getElementById('spotlight-overlay').classList.add('hidden');
        Dock.launch(app);
      });
    });
  }
};
