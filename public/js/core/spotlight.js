// Spotlight - search overlay with keyboard navigation
const Spotlight = {
  selectedIndex: -1,
  results: [],

  init() {
    const btn = document.getElementById('spotlight-btn');
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    const resultsEl = document.getElementById('spotlight-results');

    btn.addEventListener('click', () => this.show(overlay, input));

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        this.show(overlay, input);
      }
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        this.selectedIndex = -1;
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        this.selectedIndex = -1;
      }
    });

    input.addEventListener('input', () => this.search(input.value, resultsEl));

    // Keyboard navigation within results
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this.updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
          const app = this.results[this.selectedIndex].app;
          overlay.classList.add('hidden');
          this.selectedIndex = -1;
          Dock.launch(app);
        } else if (this.results.length > 0) {
          const app = this.results[0].app;
          overlay.classList.add('hidden');
          this.selectedIndex = -1;
          Dock.launch(app);
        }
      }
    });
  },

  show(overlay, input) {
    overlay.classList.remove('hidden');
    input.value = '';
    document.getElementById('spotlight-results').innerHTML = '';
    this.selectedIndex = -1;
    this.results = [];
    setTimeout(() => input.focus(), 50);
  },

  search(query, resultsEl) {
    if (!query) {
      resultsEl.innerHTML = '';
      this.results = [];
      this.selectedIndex = -1;
      return;
    }

    const q = query.toLowerCase();
    const apps = AppRegistry.all();
    this.results = apps.filter(a => a.name.toLowerCase().includes(q));
    this.selectedIndex = this.results.length > 0 ? 0 : -1;

    resultsEl.innerHTML = this.results.map((a, i) =>
      `<div class="spotlight-result${i === this.selectedIndex ? ' selected' : ''}" data-app="${a.id}">
        <span class="sr-icon">${a.icon}</span>
        <span class="sr-name">${a.name}</span>
        <span class="sr-hint">Application</span>
      </div>`
    ).join('');

    resultsEl.querySelectorAll('.spotlight-result').forEach((el, i) => {
      el.addEventListener('click', () => {
        const app = el.dataset.app;
        document.getElementById('spotlight-overlay').classList.add('hidden');
        this.selectedIndex = -1;
        Dock.launch(app);
      });
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });
    });
  },

  updateSelection() {
    const items = document.querySelectorAll('#spotlight-results .spotlight-result');
    items.forEach((item, i) => {
      if (i === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }
};
