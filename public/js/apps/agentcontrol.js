// Agent Control app - health, status, restart, diagnostics
const AppAgentControl = {
  agents: [
    { id: 'hermes', name: 'Hermes', icon: '🧠', port: 8400 },
    { id: 'openclaw', name: 'OpenClaw', icon: '🦞', port: 8401 },
  ],

  render(container) {
    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;font-size:16px;">🛡️ Agent Control</span>
        <span style="flex:1;"></span>
        <button class="app-btn" id="ac-refresh">🔄 Refresh All</button>
      </div>
      <div id="ac-agents">
        ${this.agents.map(a => `
          <div class="ac-agent-card" data-agent="${a.id}" style="background:rgba(0,0,0,0.03);border-radius:10px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
              <span style="font-size:32px;">${a.icon}</span>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:15px;">${a.name}</div>
                <div style="font-size:11px;color:#666;">Port: ${a.port}</div>
              </div>
              <span class="ac-status" style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,0.06);">Checking...</span>
            </div>
            <div class="ac-details" style="font-size:12px;color:#666;margin-bottom:12px;"></div>
            <div style="display:flex;gap:8px;">
              <button class="app-btn ac-health" data-agent="${a.id}">Health Check</button>
              <button class="app-btn ac-status-btn" data-agent="${a.id}">Status</button>
              <button class="app-btn ac-restart" data-agent="${a.id}">Restart</button>
              <button class="app-btn ac-diag" data-agent="${a.id}">Diagnostics</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="ac-log" style="margin-top:12px;background:rgba(0,0,0,0.03);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:11px;display:none;">
        <div style="font-weight:600;margin-bottom:8px;">Diagnostic Log</div>
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
        const statusEl = container.querySelector(`.ac-agent-card[data-agent="${agent}"] .ac-status`);
        const detailsEl = container.querySelector(`.ac-agent-card[data-agent="${agent}"] .ac-details`);
        try {
          const resp = await fetch(`/api/agent/${agent}/health`);
          const data = await resp.json();
          statusEl.textContent = 'Healthy';
          statusEl.style.background = 'rgba(40,200,64,0.15)';
          statusEl.style.color = '#28c840';
          detailsEl.textContent = JSON.stringify(data);
        } catch {
          statusEl.textContent = 'Unreachable';
          statusEl.style.background = 'rgba(255,95,87,0.15)';
          statusEl.style.color = '#ff5f57';
          detailsEl.textContent = 'Agent is not responding';
        }
      });
    });

    container.querySelectorAll('.ac-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const detailsEl = container.querySelector(`.ac-agent-card[data-agent="${agent}"] .ac-details`);
        try {
          const resp = await fetch(`/api/agent/${agent}/status`);
          const data = await resp.json();
          detailsEl.textContent = JSON.stringify(data, null, 2);
        } catch {
          detailsEl.textContent = 'Status unavailable';
        }
      });
    });

    container.querySelectorAll('.ac-restart').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const statusEl = container.querySelector(`.ac-agent-card[data-agent="${agent}"] .ac-status`);
        if (!confirm(`Restart ${agent} agent?`)) return;
        statusEl.textContent = 'Restarting...';
        statusEl.style.background = 'rgba(254,188,46,0.15)';
        statusEl.style.color = '#febc2e';
        try {
          await fetch(`/api/agent/${agent}/restart`, { method: 'POST' });
          setTimeout(() => this.refreshAll(container), 2000);
        } catch {
          statusEl.textContent = 'Restart failed';
          statusEl.style.background = 'rgba(255,95,87,0.15)';
          statusEl.style.color = '#ff5f57';
        }
      });
    });

    container.querySelectorAll('.ac-diag').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = btn.dataset.agent;
        const log = container.querySelector('#ac-log');
        const logContent = container.querySelector('#ac-log-content');
        log.style.display = 'block';
        logContent.innerHTML = `Running diagnostics for ${agent}...\n`;

        // Collect diagnostics
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
      const statusEl = container.querySelector(`.ac-agent-card[data-agent="${agent.id}"] .ac-status`);
      try {
        const resp = await fetch(`/api/agent/${agent.id}/health`);
        if (resp.ok) {
          statusEl.textContent = 'Healthy';
          statusEl.style.background = 'rgba(40,200,64,0.15)';
          statusEl.style.color = '#28c840';
        } else {
          statusEl.textContent = 'Unhealthy';
          statusEl.style.background = 'rgba(255,149,0,0.15)';
          statusEl.style.color = '#ff9500';
        }
      } catch {
        statusEl.textContent = 'Offline';
        statusEl.style.background = 'rgba(255,95,87,0.15)';
        statusEl.style.color = '#ff5f57';
      }
    }
  }
};
