// Activity Monitor app
window.AppActivity = {
  _timer: null,

  render(container) {
    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">Activity Monitor</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;" id="activity-table">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid rgba(0,0,0,0.08);">
              <th style="padding:8px;">Process</th>
              <th style="padding:8px;">CPU</th>
              <th style="padding:8px;">Memory</th>
              <th style="padding:8px;">Status</th>
            </tr>
          </thead>
          <tbody id="activity-body"></tbody>
        </table>
      </div>
      <div style="margin-top:12px;padding:12px;background:rgba(0,0,0,0.03);border-radius:8px;" id="activity-summary"></div>
    `;

    this.refresh(container);
    this._timer = setInterval(() => this.refresh(container), 3000);

    // Register cleanup with window manager
    const winEl = container.closest('.window');
    if (winEl && winEl._winObj) {
      winEl._winObj._cleanup = () => this.cleanup();
    }
  },

  cleanup() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  async refresh(container) {
    try {
      const resp = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'ps aux --sort=-%cpu | head -16' })
      });
      const data = await resp.json();
      const lines = data.stdout.trim().split('\n');
      const header = lines.shift();
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          user: parts[0], pid: parts[1], cpu: parts[2], mem: parts[3],
          vsz: parts[4], rss: parts[5], tty: parts[6], stat: parts[7],
          start: parts[8], time: parts[9], command: parts.slice(10).join(' ')
        };
      });

      const tbody = container.querySelector('#activity-body');
      tbody.innerHTML = processes.map(p => `
        <tr style="border-bottom:1px solid rgba(0,0,0,0.03);">
          <td style="padding:6px 8px;font-family:monospace;font-size:11px;">${AppUtils.escapeHtml(p.command.substring(0, 50))}</td>
          <td style="padding:6px 8px;">${p.cpu}%</td>
          <td style="padding:6px 8px;">${p.mem}%</td>
          <td style="padding:6px 8px;">${p.stat}</td>
        </tr>
      `).join('');

      const summary = container.querySelector('#activity-summary');
      const totalCPU = processes.reduce((s, p) => s + parseFloat(p.cpu), 0).toFixed(1);
      const totalMem = processes.reduce((s, p) => s + parseFloat(p.mem), 0).toFixed(1);
      summary.innerHTML = `<strong>Top processes:</strong> ${processes.length} shown · Total CPU: ${totalCPU}% · Total MEM: ${totalMem}%`;
    } catch {
      container.querySelector('#activity-body').innerHTML = '<tr><td colspan="4" style="padding:20px;color:#999;">Unable to fetch process data</td></tr>';
    }
  }
};
