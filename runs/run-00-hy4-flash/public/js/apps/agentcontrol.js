// Agent Control app
window.AppAgentControl = {
  agents: [
    { id: 'hermes', name: 'Hermes', icon: '🧠', port: 8400 },
    { id: 'openclaw', name: 'OpenClaw', icon: '🦞', port: 8401 },
  ],

  render(container) {
    container.innerHTML = `
      <div class="app-toolbar">
        <span class="app-toolbar-title" style="font-size:var(--text-subheadline);">🛡️ Agent Control</span>
        <span class="app-spacer"></span>
        <button class="app-btn" id="ac-refresh">🔄 Refresh All</button>
      </div>
      <div id="ac-agents" style="padding:var(--space-3);">
        ${this.agents.map(a => `
          <div class="ac-agent-card" data-agent="${a.id}">
            <div class="ac-agent-header">
              <span class="ac-agent-icon">${a.icon}</span>
              <div class="ac-agent-info">
                <div class="ac-agent-name">${AppUtils.escapeHtml(a.name)}</div>
                <div class="ac-agent-port">Port: ${a.port}</div>
              </div>
              <span class="ac-agent-status app-status offline">Checking...</span>
            </div>
            <div class="ac-agent-details"></div>
            <div class="ac-agent-actions">
              <button class="app-btn ac-health" data-agent="${a.id}">Health Check</button>
              <button class="app-btn ac-status-btn" data-agent="${a.id}">Status</button>
              <button class="app-btn ac-restart" data-agent="${a.id}">Restart</button>
              <button class="app-btn ac-diag" data-agent="${a.id}">Diagnostics</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="ac-log" id="ac-log" style="display:none;">
        <div style="font-weight:var(--weight-semibold);margin-bottom:var(--space-2);">Diagnostic Log</div>
        <div id="ac-log-content"></div>
      </div>
    `;

    this.setupListeners(container);
    this.refreshAll(container);
  },

  setupListeners(container) {
    container.querySelector('#ac-refresh').addEventListener('click', () => this.refreshAll(container));

    container.querySelectorAll('.ac-health').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const card = container.querySelector(`.ac-agent-card[data-agent="${agent}"]`);
        const statusEl = card?.querySelector('.ac-agent-status');
        const detailsEl = card?.querySelector('.ac-agent-details');
        try {
          const resp = await fetch(`/api/agent/${agent}/health`);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const data = await resp.json();
          if (statusEl) { statusEl.textContent = 'Healthy'; statusEl.className = 'ac-agent-status app-status online'; }
          if (detailsEl) detailsEl.textContent = JSON.stringify(data);
        } catch {
          if (statusEl) { statusEl.textContent = 'Unreachable'; statusEl.className = 'ac-agent-status app-status offline'; }
          if (detailsEl) detailsEl.textContent = 'Agent is not responding';
        }
      });
    });

    container.querySelectorAll('.ac-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const card = container.querySelector(`.ac-agent-card[data-agent="${agent}"]`);
        const detailsEl = card?.querySelector('.ac-agent-details');
        try {
          const resp = await fetch(`/api/agent/${agent}/status`);
          const data = await resp.json();
          if (detailsEl) detailsEl.textContent = JSON.stringify(data, null, 2);
        } catch {
          if (detailsEl) detailsEl.textContent = 'Status unavailable';
        }
      });
    });

    container.querySelectorAll('.ac-restart').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const card = container.querySelector(`.ac-agent-card[data-agent="${agent}"]`);
        const statusEl = card?.querySelector('.ac-agent-status');
        if (!confirm(`Restart ${agent} agent?`)) return;
        if (statusEl) { statusEl.style.color = ''; statusEl.textContent = 'Restarting...'; statusEl.className = 'ac-agent-status app-status offline'; statusEl.style.color = '#febc2e'; }
        try {
          const resp = await fetch(`/api/agent/${agent}/restart`, { method: 'POST' });
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          setTimeout(() => this.refreshAll(container), 2000);
        } catch {
          if (statusEl) { statusEl.style.color = ''; statusEl.textContent = 'Restart failed'; statusEl.className = 'ac-agent-status app-status offline'; statusEl.style.color = '#ff3b30'; }
        }
      });
    });

    container.querySelectorAll('.ac-diag').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const log = container.querySelector('#ac-log');
        const logContent = container.querySelector('#ac-log-content');
        log.style.display = 'block';
        log.style.whiteSpace = 'pre-wrap';
        logContent.innerHTML = `Running diagnostics for ${agent}...\n`;

        const results = [];
        const addResult = (label, success, detail) => {
          const icon = success ? '✅' : '❌';
          results.push(`${icon} ${label}: ${detail}`);
          logContent.innerHTML = results.join('\n');
        };

        try {
          const healthResp = await fetch(`/api/agent/${agent}/health`);
          addResult('Health endpoint', healthResp.ok, healthResp.ok ? 'OK' : `HTTP ${healthResp.status}`);
        } catch (e) {
          addResult('Health endpoint', false, e.message);
        }

        try {
          const statusResp = await fetch(`/api/agent/${agent}/status`);
          addResult('Status endpoint', statusResp.ok, statusResp.ok ? 'OK' : `HTTP ${statusResp.status}`);
        } catch (e) {
          addResult('Status endpoint', false, e.message);
        }

        addResult('Timestamp', true, new Date().toISOString());
        addResult('Agent ID', true, agent);
      });
    });
  },

  async refreshAll(container) {
    for (const agent of this.agents) {
      const card = container.querySelector(`.ac-agent-card[data-agent="${agent.id}"]`);
      const statusEl = card?.querySelector('.ac-agent-status');
      if (!statusEl) continue;
      try {
        const resp = await fetch(`/api/agent/${agent.id}/health`);
        if (resp.ok) {
          statusEl.textContent = 'Healthy';
          statusEl.className = 'ac-agent-status app-status online';
        } else {
          statusEl.textContent = 'Unhealthy';
          statusEl.className = 'ac-agent-status app-status offline';
          statusEl.style.color = '#ff9500';
        }
      } catch {
        statusEl.textContent = 'Offline';
        statusEl.className = 'ac-agent-status app-status offline';
      }
    }
  }
};
