// Messages app
const AppMessages = {
  messages: [],
  contacts: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],

  render(container) {
    if (this.messages.length === 0) this.seedMessages();

    container.innerHTML = `
      <div style="display:flex;height:100%;gap:1px;">
        <div style="width:200px;border-right:1px solid rgba(0,0,0,0.08);overflow-y:auto;flex-shrink:0;" id="msg-contacts">
          ${this.contacts.map(c => `
            <div class="app-list-item msg-contact" data-contact="${c}" style="padding:10px 12px;">
              <span style="font-size:24px;">👤</span>
              <span style="font-weight:500;">${c}</span>
            </div>
          `).join('')}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;" id="msg-chat-area">
          <div class="app-empty" id="msg-placeholder">Select a conversation</div>
          <div id="msg-chat" style="display:none;flex:1;flex-direction:column;">
            <div id="msg-messages" style="flex:1;overflow-y:auto;padding:12px;"></div>
            <div style="display:flex;gap:8px;padding:12px;border-top:1px solid rgba(0,0,0,0.08);">
              <input type="text" id="msg-input" class="app-input" placeholder="Message" style="flex:1;">
              <button class="app-btn primary" id="msg-send">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupListeners(container);
  },

  seedMessages() {
    this.messages = {
      Alice: [
        { from: 'Alice', text: 'Hey, are you coming to the meeting?', time: '10:15 AM' },
        { from: 'me', text: 'Yes, I\'ll be there!', time: '10:16 AM' },
        { from: 'Alice', text: 'Great, see you then!', time: '10:17 AM' },
      ],
      Bob: [
        { from: 'Bob', text: 'Can you review my PR?', time: 'Yesterday' },
      ],
      Carol: [
        { from: 'Carol', text: 'Lunch on Friday?', time: 'Mon' },
      ],
      Dave: [],
      Eve: [],
    };
  },

  setupListeners(container) {
    container.querySelectorAll('.msg-contact').forEach(el => {
      el.addEventListener('click', () => {
        const contact = el.dataset.contact;
        this.openChat(container, contact);
      });
    });

    const sendBtn = container.querySelector('#msg-send');
    const input = container.querySelector('#msg-input');
    if (sendBtn && input) {
      const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        const chatArea = container.querySelector('#msg-chat');
        const contact = chatArea.dataset.contact;
        if (!this.messages[contact]) this.messages[contact] = [];
        this.messages[contact].push({ from: 'me', text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        input.value = '';
        this.renderMessages(container, contact);
      };
      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
    }
  },

  openChat(container, contact) {
    const placeholder = container.querySelector('#msg-placeholder');
    const chat = container.querySelector('#msg-chat');
    placeholder.style.display = 'none';
    chat.style.display = 'flex';
    chat.dataset.contact = contact;
    this.renderMessages(container, contact);
  },

  renderMessages(container, contact) {
    const el = container.querySelector('#msg-messages');
    const msgs = this.messages[contact] || [];
    el.innerHTML = msgs.map(m => `
      <div style="margin-bottom:8px;text-align:${m.from === 'me' ? 'right' : 'left'};">
        <div style="display:inline-block;max-width:70%;padding:8px 12px;border-radius:12px;font-size:13px;
          background:${m.from === 'me' ? '#007AFF' : 'rgba(0,0,0,0.06)'};
          color:${m.from === 'me' ? '#fff' : '#1d1d1f'};">
          ${m.text}
        </div>
        <div style="font-size:10px;color:#999;margin-top:2px;">${m.time}</div>
      </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  }
};
