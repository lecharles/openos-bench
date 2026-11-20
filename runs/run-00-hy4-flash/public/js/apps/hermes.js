// Hermes agent app
window.AppHermes = {
  history: [],
  streaming: false,
  _agentInfo: { provider: '—', model: '—' },
  _streamBuf: null,

  render(container) {
    container.innerHTML = `
      <div class="app-column">
        <div class="app-toolbar">
          <span class="app-toolbar-title">🧠 Hermes</span>
          <span class="app-spacer"></span>
          <span id="hermes-provider" style="font-size:11px;color:var(--content-text-tertiary);margin-right:8px;"></span>
          <span id="hermes-status" class="app-status offline">Checking...</span>
        </div>
        <div class="app-chat" id="hermes-messages">${this._renderMessages()}</div>
        <div class="app-chat-input">
          <div class="app-chat-input-row">
            <textarea id="hermes-input" class="app-input" placeholder="Message Hermes..." rows="1"></textarea>
            <button class="app-btn primary" id="hermes-send" style="align-self:flex-end;">Send</button>
          </div>
          <div class="app-chat-actions">
            <button class="app-btn" id="hermes-clear">Clear Chat</button>
            <button class="app-btn" id="hermes-reconnect">Reconnect</button>
          </div>
        </div>
      </div>
    `;

    this._setupChat(container);
    this._setupSocket(container);
    this._checkHealth(container);
  },

  _renderMessages() {
    if (this.history.length === 0) {
      return '<div class="app-empty">Start a conversation with Hermes</div>';
    }
    return this.history.map(m => {
      const role = m.role === 'user' ? 'user' : 'agent';
      return `<div class="app-chat-bubble ${role}">${AppUtils.renderMarkdown(m.content)}</div>`;
    }).join('');
  },

  _mockReply() {
    const mockResponses = [
      'I understand. Let me help you with that.',
      "That's an interesting question. Here's what I think...",
      "I'd be happy to assist with that task.",
      'Let me analyze this for you.',
      'Based on the information, I would suggest the following approach.',
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  },

  _setupChat(container) {
    const input = container.querySelector('#hermes-input');
    const send = container.querySelector('#hermes-send');
    const messages = container.querySelector('#hermes-messages');

    const doSend = () => {
      const text = input.value.trim();
      if (!text || this.streaming) return;
      input.value = '';

      this.history.push({ role: 'user', content: text });
      messages.innerHTML = this._renderMessages();
      messages.scrollTop = messages.scrollHeight;

      this.streaming = true;
      send.disabled = true;
      send.textContent = '...';

      this._sendToAgent(text, container);
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    container.querySelector('#hermes-clear').addEventListener('click', () => {
      this.history = [];
      messages.innerHTML = this._renderMessages();
    });

    container.querySelector('#hermes-reconnect').addEventListener('click', () => {
      if (window.socket && !window.socket.connected) window.socket.connect();
      this._checkHealth(container);
    });
  },

  _setupSocket(container) {
    if (!window.socket) return;

    const onChunk = (data) => {
      if (!data || data.agent !== 'hermes' || !this._streamBuf) return;
      this._streamBuf.text += data.content || '';
      const last = this.history[this.history.length - 1];
      if (last && last.role === 'assistant') last.content = this._streamBuf.text;
      const messages = container.querySelector('#hermes-messages');
      if (messages) {
        messages.innerHTML = this._renderMessages();
        messages.scrollTop = messages.scrollHeight;
      }
    };
    const onDone = (data) => {
      if (!data || data.agent !== 'hermes' || !this._streamBuf) return;
      const last = this.history[this.history.length - 1];
      if (!last || last.role !== 'assistant') {
        this.history.push({ role: 'assistant', content: this._streamBuf.text || 'No response' });
      }
      this._streamBuf = null;
      this._endStreaming(container);
    };
    const onError = (data) => {
      if (!data || data.agent !== 'hermes' || !this._streamBuf) return;
      const last = this.history[this.history.length - 1];
      if (last && last.role === 'assistant') {
        last.content = this._mockReply();
      } else {
        this.history.push({ role: 'assistant', content: this._mockReply() });
      }
      this._streamBuf = null;
      this._endStreaming(container);
    };

    window.socket.on('agent:chunk', onChunk);
    window.socket.on('agent:done', onDone);
    window.socket.on('agent:error', onError);

    const winEl = container.closest('.window');
    if (winEl && winEl._winObj) {
      const origCleanup = winEl._winObj._cleanup;
      winEl._winObj._cleanup = () => {
        window.socket.off('agent:chunk', onChunk);
        window.socket.off('agent:done', onDone);
        window.socket.off('agent:error', onError);
        if (origCleanup) origCleanup();
      };
    }
  },

  _endStreaming(container) {
    const messages = container.querySelector('#hermes-messages');
    if (messages) {
      messages.innerHTML = this._renderMessages();
      messages.scrollTop = messages.scrollHeight;
    }
    this.streaming = false;
    const send = container.querySelector('#hermes-send');
    if (send) { send.disabled = false; send.textContent = 'Send'; }
  },

  async _sendToAgent(text, container) {
    if (window.socket && window.socket.connected) {
      this.history.push({ role: 'assistant', content: '' });
      this._streamBuf = { text: '' };
      const messages = container.querySelector('#hermes-messages');
      if (messages) {
        messages.innerHTML = this._renderMessages();
        messages.scrollTop = messages.scrollHeight;
      }
      window.socket.emit('agent:chat', {
        agent: 'hermes',
        message: text,
        history: this.history.slice(0, -2)
      });
      return;
    }

    const messages = container.querySelector('#hermes-messages');
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
      this.history.push({ role: 'assistant', content: this._mockReply() });
    }

    messages.innerHTML = this._renderMessages();
    messages.scrollTop = messages.scrollHeight;
    this.streaming = false;
    const send = container.querySelector('#hermes-send');
    if (send) { send.disabled = false; send.textContent = 'Send'; }
  },

  async _checkHealth(container) {
    const status = container.querySelector('#hermes-status');
    const providerEl = container.querySelector('#hermes-provider');
    if (!status) return;

    try {
      const resp = await fetch('/api/agent/hermes/health');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      status.textContent = data.status || 'Connected';
      status.className = 'app-status online';
      if (data.provider) this._agentInfo.provider = data.provider;
      if (data.model) this._agentInfo.model = data.model;
    } catch {
      status.textContent = 'Offline (mock)';
      status.className = 'app-status offline';
      this._agentInfo = { provider: '—', model: '—' };
    }

    if (providerEl) {
      providerEl.textContent = this._agentInfo.provider + ' / ' + this._agentInfo.model;
    }
  }
};
