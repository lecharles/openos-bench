// OpenClaw agent app
const AppOpenClaw = {
  history: [],
  tasks: [],
  streaming: false,
  _agentInfo: { provider: '—', model: '—' },

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
          </div>
        </div>
      </div>
    `;

    this._setupChat(container);
    this._checkHealth(container);
    this._renderTasks(container);
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

  _renderTasks(container) {
    const el = container.querySelector('#openclaw-tasks');
    if (!el) return;
    if (this.tasks.length === 0) {
      el.innerHTML = '<div style="font-size:var(--text-caption);color:var(--content-text-tertiary);">No active tasks</div>';
      return;
    }
    el.innerHTML = this.tasks.map(t => `
      <div style="padding:6px 0;border-bottom:0.5px solid var(--separator);font-size:12px;">
        <div style="font-weight:var(--weight-medium);">${AppUtils.escapeHtml(t.name)}</div>
        <div style="color:var(--content-text-tertiary);font-size:10px;">${AppUtils.escapeHtml(t.status)}</div>
      </div>
    `).join('');
  },

  _setupChat(container) {
    const input = container.querySelector('#openclaw-input');
    const send = container.querySelector('#openclaw-send');
    const messages = container.querySelector('#openclaw-messages');

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

    container.querySelector('#openclaw-clear').addEventListener('click', () => {
      this.history = [];
      messages.innerHTML = this._renderMessages();
    });

    container.querySelector('#openclaw-reconnect').addEventListener('click', () => {
      this._checkHealth(container);
    });

    container.querySelector('#openclaw-logs').addEventListener('click', async () => {
      try {
        const resp = await fetch('/api/agent/openclaw/status');
        if (resp.ok) {
          const data = await resp.json();
          const logsEl = container.querySelector('#openclaw-history-list');
          if (logsEl) {
            logsEl.innerHTML = `<pre style="font-size:10px;white-space:pre-wrap;">${AppUtils.escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
          }
        }
      } catch {
        const logsEl = container.querySelector('#openclaw-history-list');
        if (logsEl) logsEl.innerHTML = '<div style="font-size:var(--text-caption);color:var(--color-red);">Unavailable</div>';
      }
    });
  },

  async _sendToAgent(text, container) {
    const messages = container.querySelector('#openclaw-messages');

    try {
      const resp = await fetch('/api/agent/openclaw/chat', {
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
      const mockResponses = [
        'Task accepted. I will process this and report back.',
        'Analyzing the request. Let me check the available resources.',
        "I've queued this task. Estimated completion: 2 minutes.",
        'Interesting. Let me run some diagnostics and get back to you.',
      ];
      this.history.push({ role: 'assistant', content: mockResponses[Math.floor(Math.random() * mockResponses.length)] });
    }

    messages.innerHTML = this._renderMessages();
    messages.scrollTop = messages.scrollHeight;
    this.streaming = false;
    const send = container.querySelector('#openclaw-send');
    if (send) { send.disabled = false; send.textContent = 'Send'; }
  },

  async _checkHealth(container) {
    const status = container.querySelector('#openclaw-status');
    const providerEl = container.querySelector('#openclaw-provider');
    if (!status) return;

    try {
      const resp = await fetch('/api/agent/openclaw/health');
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
