// Notification Center
const Notifications = {
  list: [],

  init() {
    // Listen for overlay clicks
    document.getElementById('notification-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'notification-overlay') {
        e.target.classList.add('hidden');
      }
    });
  },

  add(title, message) {
    this.list.unshift({ title, message, time: new Date().toLocaleTimeString() });
    if (this.list.length > 50) this.list.pop();
    this.renderList();
  },

  toggle() {
    const overlay = document.getElementById('notification-overlay');
    overlay.classList.toggle('hidden');
    this.renderList();
  },

  renderList() {
    const el = document.getElementById('notification-list');
    if (this.list.length === 0) {
      el.innerHTML = '<div class="app-empty">No notifications</div>';
      return;
    }
    el.innerHTML = this.list.map(n =>
      `<div class="notification-item">
        <strong>${AppUtils.escapeHtml(n.title)}</strong>
        <div>${AppUtils.escapeHtml(n.message)}</div>
        <div class="notif-time">${n.time}</div>
      </div>`
    ).join('');
  }
};
