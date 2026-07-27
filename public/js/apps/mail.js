// Mail app
window.AppMail = {
  emails: [],
  _folder: 'inbox',

  async render(container) {
    await this.loadEmails();
    if (this.emails.length === 0) {
      this.seedEmails();
      await new Promise(r => setTimeout(r, 50)); // let seed write complete
      await this.loadEmails();
    }

    container.innerHTML = `
      <div class="app-split">
        <div class="app-sidebar" style="width:200px;padding:var(--space-2);">
          <button class="app-btn primary" id="mail-compose" style="width:100%;margin-bottom:var(--space-3);">✏️ Compose</button>
          <div class="app-list-item mail-folder" data-folder="inbox" style="font-weight:var(--weight-semibold);">📥 Inbox</div>
          <div class="app-list-item mail-folder" data-folder="sent">📤 Sent</div>
          <div class="app-list-item mail-folder" data-folder="drafts">📝 Drafts</div>
          <div class="app-list-item mail-folder" data-folder="trash">🗑️ Trash</div>
        </div>
        <div class="app-list" style="flex:1;overflow-y:auto;" id="mail-list"></div>
        <div style="width:300px;border-left:0.5px solid var(--separator);padding:var(--space-4);overflow-y:auto;display:none;" id="mail-detail">
          <div id="mail-detail-content"></div>
        </div>
      </div>
    `;

    this.renderList(container);
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

  renderList(container) {
    const list = container.querySelector('#mail-list');
    if (!list) return;

    let filtered;
    if (this._folder === 'sent') {
      filtered = this.emails.map((e, i) => ({ e, i })).filter(x => x.e.folder === 'sent');
    } else if (this._folder === 'inbox') {
      filtered = this.emails.map((e, i) => ({ e, i })).filter(x => x.e.folder !== 'sent');
    } else {
      filtered = []; // Drafts / Trash have no items yet
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div class="app-empty">No messages</div>';
      return;
    }

    list.innerHTML = filtered.map(({ e, i }) => `
      <div class="app-list-item mail-item" data-index="${i}" style="border-bottom:0.5px solid var(--separator);padding:var(--space-3);">
        <div style="width:100%;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-weight:${e.read ? 'var(--weight-regular)' : 'var(--weight-semibold)'};">${AppUtils.escapeHtml(e.from)}</span>
            <span style="font-size:var(--text-caption);color:var(--content-text-tertiary);">${AppUtils.escapeHtml(e.time)}</span>
          </div>
          <div style="font-weight:${e.read ? 'var(--weight-regular)' : 'var(--weight-semibold)'};">${AppUtils.escapeHtml(e.subject)}</div>
          <div style="font-size:12px;color:var(--content-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AppUtils.escapeHtml(e.body)}</div>
        </div>
      </div>
    `).join('');

    // Per-item listeners bind here on fresh DOM
    list.querySelectorAll('.mail-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const email = this.emails[idx];
        email.read = true;

        const detail = container.querySelector('#mail-detail');
        const content = container.querySelector('#mail-detail-content');
        detail.style.display = 'block';
        content.innerHTML = `
          <h2 style="font-size:var(--text-title3);margin-bottom:var(--space-1);">${AppUtils.escapeHtml(email.subject)}</h2>
          <div style="color:var(--content-text-secondary);margin-bottom:var(--space-1);">From: ${AppUtils.escapeHtml(email.from)}</div>
          <div style="color:var(--content-text-tertiary);font-size:var(--text-caption);margin-bottom:var(--space-4);">${AppUtils.escapeHtml(email.time)}</div>
          <hr style="border:none;border-top:0.5px solid var(--separator);margin-bottom:var(--space-3);">
          <div style="line-height:1.6;">${AppUtils.escapeHtml(email.body)}</div>
        `;
        fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.emails) });
        this.renderList(container);
      });
    });
  },

  setupListeners(container) {
    container.querySelectorAll('.mail-folder').forEach(el => {
      el.addEventListener('click', () => {
        this._folder = el.dataset.folder;
        container.querySelectorAll('.mail-folder').forEach(f => {
          f.style.fontWeight = f.dataset.folder === this._folder ? 'var(--weight-semibold)' : '';
        });
        this.renderList(container);
      });
    });

    container.querySelector('#mail-compose').addEventListener('click', () => {
      const detail = container.querySelector('#mail-detail');
      const content = container.querySelector('#mail-detail-content');
      detail.style.display = 'block';
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-3);">New Message</h3>
        <input class="app-input" id="mail-to" placeholder="To:" style="width:100%;margin-bottom:var(--space-2);">
        <input class="app-input" id="mail-subject" placeholder="Subject:" style="width:100%;margin-bottom:var(--space-2);">
        <textarea class="app-input" id="mail-body" placeholder="Message..." style="width:100%;min-height:150px;"></textarea>
        <button class="app-btn primary" id="mail-send" style="margin-top:var(--space-2);">Send</button>
      `;
      content.querySelector('#mail-send').addEventListener('click', async () => {
        const to = content.querySelector('#mail-to').value.trim();
        const subject = content.querySelector('#mail-subject').value.trim();
        const body = content.querySelector('#mail-body').value;
        if (!to && !subject && !body.trim()) return;
        const message = {
          id: Date.now().toString(),
          from: 'me',
          to,
          subject,
          body,
          date: new Date().toISOString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: true,
          folder: 'sent',
        };
        this.emails.unshift(message);
        await fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.emails) });
        this._folder = 'sent';
        container.querySelectorAll('.mail-folder').forEach(f => {
          f.style.fontWeight = f.dataset.folder === 'sent' ? 'var(--weight-semibold)' : '';
        });
        this.renderList(container);
        detail.style.display = 'none';
        Notifications.add('Mail', `Message sent to ${to || 'recipient'}`);
      });
    });
  }
};
