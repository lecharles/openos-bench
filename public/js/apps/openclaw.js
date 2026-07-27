// OpenClaw agent app
window.AppOpenClaw = {
  history: [],
  tasks: [],
  streaming: false,
  _agentInfo: { provider: '—', model: '—' },
  _streamBuf: null,
  _tasksNote: null,

  render(container) {
    container.innerHTML = `
      <div class="app-column">
        <div class="app-toolbar">
          <span class="app-toolbar-title">🦞 OpenClaw</span>
          <span class="app-spacer"></span>
          <span id="openclaw-provider" style="font-size:11px;color:var(--content-text-tertiary);margin-right:8px;"></span>
          <span id="openclaw-status" class="app-status offline">Checking...</span>
        </div>
        <div style="display:flex;flex:1;overflow:hidden;">
          <div class="app-column" style="flex:1;">
            <div class="app-chat" id="openclaw-messages">${this._renderMessages()}</div>
            <div class="app-chat-input">
              <div class="app-chat-input-row">
                <textarea id="openclaw-input" class="app-input" placeholder="Message OpenClaw..." rows="1"></textarea>
                <button class="app-btn primary" id="openclaw-send" style="align-self:flex-end;">Send</button>
              </div>
              <div class="app-chat-actions">
                <button class="app-btn" id="openclaw-clear">Clear Chat</button>
                <button class="app-btn" id="openclaw-reconnect">Reconnect</button>
                <button class="app-btn" id="openclaw-logs">View Logs</button>
              </div>
            </div>
          </div>
          <div class="app-sidebar" id="openclaw-sidebar" style="width:200px;border-left:0.5px solid var(--separator);padding:var(--space-3);overflow-y:auto;">
            <h4 style="font-size:var(--text-body);margin-bottom:var(--space-2);">Tasks</h4>
            <div id="openclaw-tasks"></div>
            <h4 style="font-size:var(--text-body);margin-top:var(--space-4);margin-bottom:var(--space-2);">History</h4>
            <div id="openclaw-history-list"></div>
            <h4 style="font-size:var(--text-body);margin-top:var(--space-4);margin-bottom:var(--space-2);">Logs</h4>
            <div id="openclaw-logs-view"></div>
          </div>
        </div>
      </div>
    `;

    this._setupChat(container);
    this._setupSocket(container);
    this._checkHealth(container);
    this._renderTasks(container);
    this._renderHistoryPanel(container);
  },

  _renderMessages() {
    if (this.history.length === 0) {
      return '<div class="app-empty">Start a conversation with OpenClaw</div>';
    }
    return this.history.map(m => {
      const role = m.role === 'user' ? 'user' : 'agent';
      return `<div class="app-chat-bubble ${role}">${AppUtils.renderMarkdown(m.content)}</div>`;
    }).join('');
  },

  _mockReply() {
    const mockResponses = [
      'Task accepted. I will process this and report back.',
      'Analyzing the request. Let me check the available resources.',
      "I've queued this task. Estimated completion: 2 minutes.",
      'Interesting. Let me run some diagnostics and get back to you.',
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  },

  _renderTasks(container) {
    const el = container.querySelector('#openclaw-tasks');
    if (!el) return;
    if (this.tasks.length === 0) {
      el.innerHTML = `<div style="font-size:var(--text-caption);color:var(--content-text-tertiary);">${AppUtils.escapeHtml(this._tasksNote || 'No active tasks')}</div>`;
      return;
    }
    el.innerHTML = this.tasks.map(t => `
      <div style="padding:6px 0;border-bottom:0.5px solid var(--separator);font-size:12px;">
        <div style="font-weight:var(--weight-medium);">${AppUtils.escapeHtml(t.name)}</div>
        <div style="color:var(--content-text-tertiary);font-size:10px;">${AppUtils.escapeHtml(t.status)}</div>
      </div>
    `).join('');
  },

  _renderHistoryPanel(container) {
    const el = container.querySelector('#openclaw-history-list');
    if (!el) return;
    if (this.history.length === 0) {
      el.innerHTML = '<div style="font-size:var(--text-caption);color:var(--content-text-tertiary);">No history yet</div>';
      return;
    }
    el.innerHTML = this.history.map(m => {
      const excerpt = m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content;
      return `
        <div style="padding:4px 0;border-bottom:0.5px solid var(--separator);font-size:11px;">
          <span style="font-weight:var(--weight-medium);">${m.role === 'user' ? 'You' : 'OpenClaw'}</span>
          <span style="color:var(--content-text-tertiary);font-size:10px;"> ${AppUtils.escapeHtml(m.time || '')}</span>
          <div style="color:var(--content-text-secondary);">${AppUtils.escapeHtml(excerpt)}</div>
        </div>
      `;
    }).join('');
  },

  _setupChat(container) {
    const input = container.querySelector('#openclaw-input');
    const send = container.querySelector('#openclaw-send');
    const messages = container.querySelector('#openclaw-messages');

    const doSend = () => {
      const text = input.value.trim();
      if (!text || this.streaming) return;
      input.value = '';

      this.history.push({ role: 'user', content: text, time: new Date().toLocaleTimeString() });
      messages.innerHTML = this._renderMessages();
      messages.scrollTop = messages.scrollHeight;
      this._renderHistoryPanel(container);

      this.streaming = true;
      send.disabled = true;
      send.textContent = '...';

      this._sendToAgent(text, container);
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    container.querySelector('#openclaw-clear').addEventListener('click', () => {
      this.history = [];
      messages.innerHTML = this._renderMessages();
      this._renderHistoryPanel(container);
    });

    container.querySelector('#openclaw-reconnect').addEventListener('click', () => {
      if (window.socket && !window.socket.connected) window.socket.connect();
      this._checkHealth(container);
    });

    container.querySelector('#openclaw-logs').addEventListener('click', async () => {
      const logsEl = container.querySelector('#openclaw-logs-view');
      try {
        const resp = await fetch('/api/agent/openclaw/status');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (logsEl) {
          logsEl.innerHTML = `<pre style="font-size:10px;white-space:pre-wrap;">${AppUtils.escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
        }
      } catch {
        if (logsEl) logsEl.innerHTML = '<div style="font-size:var(--text-caption);color:var(--color-red);">Logs unavailable (agent offline)</div>';
      }
    });
  },

  _setupSocket(container) {
    if (!window.socket) return;

    const onChunk = (data) => {
      if (!data || data.agent !== 'openclaw' || !this._streamBuf) return;
      this._streamBuf.text += data.content || '';
      const last = this.history[this.history.length - 1];
      if (last && last.role === 'assistant') last.content = this._streamBuf.text;
      const messages = container.querySelector('#openclaw-messages');
      if (messages) {
        messages.innerHTML = this._renderMessages();
        messages.scrollTop = messages.scrollHeight;
      }
    };
    const onDone = (data) => {
      if (!data || data.agent !== 'openclaw' || !this._streamBuf) return;
      const last = this.history[this.history.length - 1];
      if (!last || last.role !== 'assistant') {
        this.history.push({ role: 'assistant', content: this._streamBuf.text || 'No response', time: new Date().toLocaleTimeString() });
      }
      this._streamBuf = null;
      this._endStreaming(container);
    };
    const onError = (data) => {
      if (!data || data.agent !== 'openclaw' || !this._streamBuf) return;
      const last = this.history[this.history.length - 1];
      if (last && last.role === 'assistant') {
        last.content = this._mockReply();
        last.time = last.time || new Date().toLocaleTimeString();
      } else {
        this.history.push({ role: 'assistant', content: this._mockReply(), time: new Date().toLocaleTimeString() });
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
    const messages = container.querySelector('#openclaw-messages');
    if (messages) {
      messages.innerHTML = this._renderMessages();
      messages.scrollTop = messages.scrollHeight;
    }
    this._renderHistoryPanel(container);
    this.streaming = false;
    const send = container.querySelector('#openclaw-send');
    if (send) { send.disabled = false; send.textContent = 'Send'; }
  },

  async _sendToAgent(text, container) {
    if (window.socket && window.socket.connected) {
      this.history.push({ role: 'assistant', content: '', time: new Date().toLocaleTimeString() });
      this._streamBuf = { text: '' };
      const messages = container.querySelector('#openclaw-messages');
      if (messages) {
        messages.innerHTML = this._renderMessages();
        messages.scrollTop = messages.scrollHeight;
      }
      window.socket.emit('agent:chat', {
        agent: 'openclaw',
        message: text,
        history: this.history.slice(0, -2)
      });
      return;
    }

    const messages = container.querySelector('#openclaw-messages');

    try {
      const resp = await fetch('/api/agent/openclaw/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: this.history.slice(0, -1) })
      });
      if (resp.ok) {
        const data = await resp.json();
        this.history.push({ role: 'assistant', content: data.response || data.content || 'No response', time: new Date().toLocaleTimeString() });
      } else {
        throw new Error('Agent returned ' + resp.status);
      }
    } catch {
      this.history.push({ role: 'assistant', content: this._mockReply(), time: new Date().toLocaleTimeString() });
    }

    messages.innerHTML = this._renderMessages();
    messages.scrollTop = messages.scrollHeight;
    this._renderHistoryPanel(container);
    this.streaming = false;
    const send = container.querySelector('#openclaw-send');
    if (send) { send.disabled = false; send.textContent = 'Send'; }
  },

  async _loadTasks(container) {
    try {
      const resp = await fetch('/api/agent/openclaw/status');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const raw = Array.isArray(data.tasks) ? data.tasks : [];
      this.tasks = raw.map(t => ({
        name: t.name || t.title || String(t.id || 'Task'),
        status: t.status || t.state || ''
      }));
      this._tasksNote = null;
    } catch {
      this.tasks = [];
      this._tasksNote = 'Agent offline — tasks unavailable';
    }
    this._renderTasks(container);
  },

  async _checkHealth(container) {
    const status = container.querySelector('#openclaw-status');
    const providerEl = container.querySelector('#openclaw-provider');
    if (!status) return;

    try {
      const resp = await fetch('/api/agent/openclaw/health');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      status.textContent = data.status || 'Connected';
      status.className = 'app-status online';
      if (data.provider) this._agentInfo.provider = data.provider;
      if (data.model) this._agentInfo.model = data.model;
      this._loadTasks(container);
    } catch {
      status.textContent = 'Offline (mock)';
      status.className = 'app-status offline';
      this._agentInfo = { provider: '—', model: '—' };
      this.tasks = [];
      this._tasksNote = 'Agent offline — tasks unavailable';
      this._renderTasks(container);
    }

    if (providerEl) {
      providerEl.textContent = this._agentInfo.provider + ' / ' + this._agentInfo.model;
    }
  }
};
