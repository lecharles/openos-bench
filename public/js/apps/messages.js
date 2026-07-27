// Messages app
window.AppMessages = {
  conversations: [],
  _loaded: false,

  async render(container) {
    if (!this._loaded) {
      await this.loadConversations();
      if (this.conversations.length === 0) {
        this.seedConversations();
        await this.saveConversations();
        await this.loadConversations();
      }
      this._loaded = true;
    }

    container.innerHTML = `
      <div class="app-split">
        <div class="app-sidebar" style="width:200px;" id="msg-contacts">
          ${this.conversations.map((c, i) => `
            <div class="app-list-item msg-contact" data-index="${i}" style="padding:10px var(--space-3);">
              <span style="font-size:24px;">👤</span>
              <span style="font-weight:var(--weight-medium);">${AppUtils.escapeHtml(c.name)}</span>
            </div>
          `).join('')}
        </div>
        <div class="app-column" style="flex:1;" id="msg-chat-area">
          <div class="app-empty" id="msg-placeholder">Select a conversation</div>
          <div id="msg-chat" style="display:none;flex:1;flex-direction:column;">
            <div id="msg-messages" style="flex:1;overflow-y:auto;padding:var(--space-3);"></div>
            <div style="display:flex;gap:var(--space-2);padding:var(--space-3);border-top:0.5px solid var(--separator);">
              <input type="text" id="msg-input" class="app-input" placeholder="Message" style="flex:1;">
              <button class="app-btn primary" id="msg-send">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupListeners(container);
  },

  async loadConversations() {
    try {
      const r = await fetch('/api/messages');
      const data = await r.json();
      this.conversations = Array.isArray(data) ? data : [];
    } catch { this.conversations = []; }
  },

  async saveConversations() {
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.conversations) });
  },

  seedConversations() {
    this.conversations = [
      { id: 'alice', name: 'Alice', messages: [
        { from: 'Alice', text: "Hey, are you coming to the meeting?", time: '10:15 AM' },
        { from: 'me', text: "Yes, I'll be there!", time: '10:16 AM' },
        { from: 'Alice', text: 'Great, see you then!', time: '10:17 AM' },
      ]},
      { id: 'bob', name: 'Bob', messages: [
        { from: 'Bob', text: 'Can you review my PR?', time: 'Yesterday' },
      ]},
      { id: 'carol', name: 'Carol', messages: [
        { from: 'Carol', text: 'Lunch on Friday?', time: 'Mon' },
      ]},
      { id: 'dave', name: 'Dave', messages: [] },
      { id: 'eve', name: 'Eve', messages: [] },
    ];
  },

  setupListeners(container) {
    container.querySelectorAll('.msg-contact').forEach(el => {
      el.addEventListener('click', () => {
        this.openChat(container, parseInt(el.dataset.index));
      });
    });

    const sendBtn = container.querySelector('#msg-send');
    const input = container.querySelector('#msg-input');
    if (sendBtn && input) {
      const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        const chatArea = container.querySelector('#msg-chat');
        const convo = this.conversations[parseInt(chatArea.dataset.index)];
        if (!convo) return;
        if (!Array.isArray(convo.messages)) convo.messages = [];
        convo.messages.push({ from: 'me', text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        input.value = '';
        this.renderMessages(container, convo);
        this.saveConversations();
      };
      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
    }
  },

  openChat(container, index) {
    const convo = this.conversations[index];
    if (!convo) return;
    const placeholder = container.querySelector('#msg-placeholder');
    const chat = container.querySelector('#msg-chat');
    placeholder.style.display = 'none';
    chat.style.display = 'flex';
    chat.dataset.index = index;
    this.renderMessages(container, convo);
  },

  renderMessages(container, convo) {
    const el = container.querySelector('#msg-messages');
    const msgs = convo.messages || [];
    el.innerHTML = msgs.map(m => {
      const cls = m.from === 'me' ? 'me' : 'other';
      return `<div style="margin-bottom:var(--space-2);text-align:${m.from === 'me' ? 'right' : 'left'};">
        <div class="app-messages-bubble ${cls}">${AppUtils.escapeHtml(m.text)}</div>
        <div class="app-messages-time">${AppUtils.escapeHtml(m.time)}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }
};
