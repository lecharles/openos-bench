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
        // Opening is idempotent: a second chord while open just refocuses the
        // field (real Spotlight never closes on a repeated summon).
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

    const q = query.toLowerCase().replace(/\s+/g, '');
    const score = (name) => {
      const n = name.toLowerCase();
      if (n === q) return 1000;
      if (n.startsWith(q)) return 500 - n.length;
      const idx = n.indexOf(q);
      if (idx >= 0) return 300 - idx * 2 - n.length;
      // Subsequence fuzzy match: "nts" -> "Notes"
      let qi = 0, gaps = 0;
      for (let i = 0; i < n.length && qi < q.length; i++) {
        if (n[i] === q[qi]) qi++;
        else if (qi > 0) gaps++;
      }
      return qi === q.length ? 120 - gaps - n.length : -1;
    };
    this.results = AppRegistry.all()
      .map(a => ({ app: a, score: score(a.name) }))
      .filter(r => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.app);
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
