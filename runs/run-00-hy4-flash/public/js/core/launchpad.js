// Launchpad - app grid overlay with keyboard support
const Launchpad = {
  init() {
    // Trigger via F4 or Escape to dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape') {
        const overlay = document.getElementById('launchpad-overlay');
        if (!overlay.classList.contains('hidden')) {
          overlay.classList.add('hidden');
        }
      }
    });

    const overlay = document.getElementById('launchpad-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });

    this.buildGrid();
  },

  buildGrid() {
    const apps = AppRegistry.all();
    const grid = document.getElementById('launchpad-grid');
    grid.innerHTML = apps.map(a =>
      `<div class="launchpad-item" data-app="${a.id}">
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
