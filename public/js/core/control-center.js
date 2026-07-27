// Control Center
const ControlCenter = {
  state: { wifi: true, bluetooth: true, airdrop: false, dnd: false, brightness: 80, volume: 60 },

  init() {
    const btn = document.getElementById('control-center-btn');
    const overlay = document.getElementById('control-overlay');

    btn.addEventListener('click', () => overlay.classList.toggle('hidden'));
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'control-overlay') overlay.classList.add('hidden');
    });

    overlay.querySelectorAll('.control-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.state[action] = !this.state[action];
        item.classList.toggle('active', this.state[action]);
      });
    });
  }
};
