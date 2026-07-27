// Mail app
const AppMail = {
  emails: [],

  async render(container) {
    await this.loadEmails();
    if (this.emails.length === 0) this.seedEmails();

    container.innerHTML = `
      <div style="display:flex;height:100%;gap:1px;">
        <div style="width:200px;border-right:1px solid rgba(0,0,0,0.08);overflow-y:auto;flex-shrink:0;padding:8px;" id="mail-sidebar">
          <button class="app-btn primary" id="mail-compose" style="width:100%;margin-bottom:12px;">✏️ Compose</button>
          <div class="app-list-item" style="font-weight:600;">📥 Inbox</div>
          <div class="app-list-item">📤 Sent</div>
          <div class="app-list-item">📝 Drafts</div>
          <div class="app-list-item">🗑️ Trash</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:0;" id="mail-list">
          ${this.emails.map((e, i) => `
            <div class="app-list-item mail-item" data-index="${i}" style="border-bottom:1px solid rgba(0,0,0,0.04);padding:12px;">
              <div style="width:100%;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="font-weight:${e.read ? '400' : '600'};">${e.from}</span>
                  <span style="font-size:11px;color:#999;">${e.time}</span>
                </div>
                <div style="font-weight:${e.read ? '400' : '600'};">${e.subject}</div>
                <div style="font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.body}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="width:300px;border-left:1px solid rgba(0,0,0,0.08);padding:16px;overflow-y:auto;display:none;" id="mail-detail">
          <div id="mail-detail-content"></div>
        </div>
      </div>
    `;

    this.setupListeners(container);
  },

  async loadEmails() {
    try { const r = await fetch('/api/mail'); this.emails = await r.json(); } catch { this.emails = []; }
  },

  seedEmails() {
    this.emails = [
      { from: 'Alice Chen', subject: 'Meeting tomorrow', body: 'Hi, just a reminder about our meeting tomorrow at 10am.', time: '10:32 AM', read: false },
      { from: 'Bob Smith', subject: 'Project update', body: 'The latest build is ready for review. Please check the dashboard.', time: 'Yesterday', read: false },
      { from: 'GitHub', subject: '[repo] New pull request', body: 'A new PR has been opened in the kimi-browser-desktop repo.', time: 'Yesterday', read: true },
      { from: 'Carol Davis', subject: 'Lunch Friday?', body: 'Hey, want to grab lunch this Friday?', time: 'Mon', read: true },
      { from: 'Newsletter', subject: 'Weekly Digest', body: 'Top stories from this week in tech.', time: 'Sun', read: true },
    ];
    fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.emails) });
  },

  setupListeners(container) {
    container.querySelectorAll('.mail-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const email = this.emails[idx];
        email.read = true;

        const detail = container.querySelector('#mail-detail');
        const content = container.querySelector('#mail-detail-content');
        detail.style.display = 'block';
        content.innerHTML = `
          <h2 style="font-size:18px;margin-bottom:4px;">${email.subject}</h2>
          <div style="color:#666;margin-bottom:4px;">From: ${email.from}</div>
          <div style="color:#999;font-size:12px;margin-bottom:16px;">${email.time}</div>
          <hr style="border:none;border-top:1px solid rgba(0,0,0,0.08);margin-bottom:12px;">
          <div style="line-height:1.6;">${email.body}</div>
        `;
        fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.emails) });
      });
    });

    container.querySelector('#mail-compose').addEventListener('click', () => {
      const detail = container.querySelector('#mail-detail');
      const content = container.querySelector('#mail-detail-content');
      detail.style.display = 'block';
      content.innerHTML = `
        <h3>New Message</h3>
        <input class="app-input" placeholder="To:" style="width:100%;margin-bottom:8px;">
        <input class="app-input" placeholder="Subject:" style="width:100%;margin-bottom:8px;">
        <textarea class="app-input" placeholder="Message..." style="width:100%;min-height:150px;"></textarea>
        <button class="app-btn primary" style="margin-top:8px;">Send</button>
      `;
    });
  }
};
