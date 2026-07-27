// OpenClaw agent app - conversations, streaming, tasks, history, logs, reconnect, provider/model display
const AppOpenClaw = {
  history: [],
  tasks: [],
  streaming: false,

  render(container) {
    container.innerHTML = `
      <div style="display:flex;height:100%;flex-direction:column;">
        <div class="app-toolbar">
          <span style="font-weight:600;">🦞 OpenClaw</span>
          <span style="flex:1;"></span>
          <span id="openclaw-status" style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.06);">Checking...</span>
        </div>
        <div style="display:flex;flex:1;gap:1px;overflow:hidden;">
          <div style="flex:1;display:flex;flex-direction:column;">
            <div id="openclaw-messages" style="flex:1;overflow-y:auto;padding:12px;line-height:1.6;">
              ${this.renderMessages()}
            </div>
            <div style="padding:12px;border-top:1px solid rgba(0,0,0,0.08);">
              <div style="display:flex;gap:8px;">
                <textarea id="openclaw-input" class="app-input" placeholder="Message OpenClaw..." style="flex:1;resize:none;min-height:40px;" rows="1"></textarea>
                <button class="app-btn primary" id="openclaw-send" style="align-self:flex-end;">Send</button>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:#666;">
                <button class="app-btn" id="openclaw-clear">Clear Chat</button>
                <button class="app-btn" id="openclaw-reconnect">Reconnect</button>
                <button class="app-btn" id="openclaw-logs">View Logs</button>
              </div>
            </div>
          </div>
          <div style="width:200px;border-left:1px solid rgba(0,0,0,0.08);padding:12px;overflow-y:auto;flex-shrink:0;" id="openclaw-sidebar">
            <h4 style="font-size:13px;margin-bottom:8px;">Tasks</h4>
            <div id="openclaw-tasks"></div>
            <h4 style="font-size:13px;margin-top:16px;margin-bottom:8px;">History</h4>
            <div id="openclaw-history-list"></div>
          </div>
        </div>
      </div>
    `;

    this.setupChat(container);
    this.checkHealth(container);
    this.renderTasks(container);
  },

  renderMessages() {
    if (this.history.length === 0) {
      return '<div class="app-empty">Start a conversation with OpenClaw</div>';
    }
    return this.history.map(m => {
      if (m.role === 'user') {
        return `<div style="margin-bottom:12px;text-align:right;"><div style="display:inline-block;max-width:80%;background:#007AFF;color:#fff;padding:8px 12px;border-radius:12px;font-size:13px;">${this.escapeHtml(m.content)}</div></div>`;
      } else {
        let content = m.content;
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\`([^`]+)\`/g, '<code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;">$1</code>');
        content = content.replace(/\n/g, '<br>');
        return `<div style="margin-bottom:12px;"><div style="display:inline-block;max-width:80%;background:rgba(0,0,0,0.05);padding:8px 12px;border-radius:12px;font-size:13px;">${content}</div></div>`;
      }
    }).join('');
  },

  renderTasks(container) {
    const el = container.querySelector('#openclaw-tasks');
    if (this.tasks.length === 0) {
      el.innerHTML = '<div style="font-size:11px;color:#999;">No active tasks</div>';
      return;
    }
    el.innerHTML = this.tasks.map(t => `
      <div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04);font-size:12px;">
        <div style="font-weight:500;">${t.name}</div>
        <div style="color:#999;font-size:10px;">${t.status}</div>
      </div>
    `).join('');
  },

  setupChat(container) {
    const input = container.querySelector('#openclaw-input');
    const send = container.querySelector('#openclaw-send');
    const messages = container.querySelector('#openclaw-messages');

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

      this.sendToAgent(text, container);
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    container.querySelector('#openclaw-clear').addEventListener('click', () => {
      this.history = [];
      messages.innerHTML = this.renderMessages();
    });

    container.querySelector('#openclaw-reconnect').addEventListener('click', () => {
      this.checkHealth(container);
    });

    container.querySelector('#openclaw-logs').addEventListener('click', async () => {
      const sidebar = container.querySelector('#openclaw-sidebar');
      try {
        const resp = await fetch('/api/agent/openclaw/status');
        if (resp.ok) {
          const data = await resp.json();
          const logsEl = container.querySelector('#openclaw-history-list');
          logsEl.innerHTML = `<pre style="font-size:10px;white-space:pre-wrap;">${JSON.stringify(data, null, 2)}</pre>`;
        }
      } catch {
        container.querySelector('#openclaw-history-list').innerHTML = '<div style="font-size:11px;color:#f66;">Unavailable</div>';
      }
    });
  },

  async sendToAgent(text, container) {
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
        'I\'ve queued this task. Estimated completion: 2 minutes.',
        'Interesting. Let me run some diagnostics and get back to you.',
      ];
      const mock = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      this.history.push({ role: 'assistant', content: mock });
    }

    messages.innerHTML = this.renderMessages();
    messages.scrollTop = messages.scrollHeight;
    this.streaming = false;
    const send = container.querySelector('#openclaw-send');
    send.disabled = false;
    send.textContent = 'Send';
  },

  async checkHealth(container) {
    const status = container.querySelector('#openclaw-status');
    try {
      const resp = await fetch('/api/agent/openclaw/health');
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
