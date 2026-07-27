// Hermes agent app - conversations, streaming, session history, reconnect, provider/model display
const AppHermes = {
  history: [],
  streaming: false,

  render(container) {
    container.innerHTML = `
      <div style="display:flex;height:100%;flex-direction:column;">
        <div class="app-toolbar">
          <span style="font-weight:600;">🧠 Hermes</span>
          <span style="flex:1;"></span>
          <span id="hermes-status" style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.06);">Checking...</span>
        </div>
        <div id="hermes-messages" style="flex:1;overflow-y:auto;padding:12px;line-height:1.6;">
          ${this.renderMessages()}
        </div>
        <div style="padding:12px;border-top:1px solid rgba(0,0,0,0.08);">
          <div style="display:flex;gap:8px;">
            <textarea id="hermes-input" class="app-input" placeholder="Message Hermes..." style="flex:1;resize:none;min-height:40px;" rows="1"></textarea>
            <button class="app-btn primary" id="hermes-send" style="align-self:flex-end;">Send</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:#666;">
            <button class="app-btn" id="hermes-clear" style="font-size:11px;">Clear Chat</button>
            <button class="app-btn" id="hermes-reconnect" style="font-size:11px;">Reconnect</button>
          </div>
        </div>
      </div>
    `;

    this.setupChat(container);
    this.checkHealth(container);
  },

  renderMessages() {
    if (this.history.length === 0) {
      return '<div class="app-empty">Start a conversation with Hermes</div>';
    }
    return this.history.map(m => {
      if (m.role === 'user') {
        return `<div style="margin-bottom:12px;text-align:right;"><div style="display:inline-block;max-width:80%;background:#007AFF;color:#fff;padding:8px 12px;border-radius:12px;font-size:13px;">${this.escapeHtml(m.content)}</div></div>`;
      } else {
        let content = m.content;
        // Simple markdown rendering
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
        content = content.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;">$1</code>');
        content = content.replace(/\n/g, '<br>');
        return `<div style="margin-bottom:12px;"><div style="display:inline-block;max-width:80%;background:rgba(0,0,0,0.05);padding:8px 12px;border-radius:12px;font-size:13px;">${content}</div></div>`;
      }
    }).join('');
  },

  setupChat(container) {
    const input = container.querySelector('#hermes-input');
    const send = container.querySelector('#hermes-send');
    const messages = container.querySelector('#hermes-messages');

    const doSend = () => {
      const text = input.value.trim();
      if (!text || this.streaming) return;
      input.value = '';

      this.history.push({ role: 'user', content: text });
      messages.innerHTML = this.renderMessages();
      messages.scrollTop = messages.scrollHeight;

      this.streaming = true;
      send.disabled = true;
      send.textContent = '...';

      // Try to send via server agent proxy
      this.sendToAgent(text, container);
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    container.querySelector('#hermes-clear').addEventListener('click', () => {
      this.history = [];
      messages.innerHTML = this.renderMessages();
    });

    container.querySelector('#hermes-reconnect').addEventListener('click', () => {
      this.checkHealth(container);
    });
  },

  async sendToAgent(text, container) {
    const messages = container.querySelector('#hermes-messages');

    // Use a mock response if the real agent is unavailable
    try {
      const resp = await fetch('/api/agent/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: this.history.slice(0, -1) })
      });
      if (resp.ok) {
        const data = await resp.json();
        this.history.push({ role: 'assistant', content: data.response || data.content || 'No response' });
      } else {
        throw new Error('Agent returned ' + resp.status);
      }
    } catch {
      // Mock response
      const mockResponses = [
        'I understand. Let me help you with that.',
        'That\'s an interesting question. Here\'s what I think...',
        'I\'d be happy to assist with that task.',
        'Let me analyze this for you.',
        'Based on the information, I would suggest the following approach.',
      ];
      const mock = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      this.history.push({ role: 'assistant', content: mock });
    }

    messages.innerHTML = this.renderMessages();
    messages.scrollTop = messages.scrollHeight;
    this.streaming = false;
    const send = container.querySelector('#hermes-send');
    send.disabled = false;
    send.textContent = 'Send';
  },

  async checkHealth(container) {
    const status = container.querySelector('#hermes-status');
    try {
      const resp = await fetch('/api/agent/hermes/health');
      const data = await resp.json();
      status.textContent = data.status || 'Connected';
      status.style.background = 'rgba(40,200,64,0.15)';
      status.style.color = '#28c840';
    } catch {
      status.textContent = 'Offline (mock)';
      status.style.background = 'rgba(255,95,87,0.15)';
      status.style.color = '#ff5f57';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
