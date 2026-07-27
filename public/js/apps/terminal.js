// Terminal app
const AppTerminal = {
  history: [],
  cwd: '/root',

  render(container) {
    container.innerHTML = `
      <div id="terminal-output" style="background:#1a1a2e;color:#00ff88;font-family:'SF Mono',Monaco,monospace;font-size:12px;padding:12px;min-height:300px;max-height:100%;overflow-y:auto;border-radius:6px;white-space:pre-wrap;line-height:1.5;">
        <div style="color:#888;">KiMi Terminal — type 'help' for commands</div>
        <div style="color:#888;">Current directory: ${this.cwd}</div>
      </div>
      <div style="display:flex;margin-top:8px;gap:8px;">
        <span style="color:#00ff88;font-family:monospace;font-size:13px;padding:6px 0;">$</span>
        <input type="text" id="terminal-input" class="app-input" style="flex:1;font-family:'SF Mono',Monaco,monospace;font-size:13px;background:#1a1a2e;color:#00ff88;border-color:#333;" placeholder="Enter command..." autofocus>
      </div>
    `;

    const input = container.querySelector('#terminal-input');
    const output = container.querySelector('#terminal-output');

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (!cmd) return;
        input.value = '';

        // Handle built-in commands
        if (cmd === 'clear') {
          output.innerHTML = '';
          return;
        }
        if (cmd === 'help') {
          output.innerHTML += `\n<span style="color:#888;">Available commands: help, clear, pwd, cd &lt;dir&gt;, ls, and any shell command</span>`;
          output.scrollTop = output.scrollHeight;
          return;
        }
        if (cmd === 'pwd') {
          output.innerHTML += `\n${this.cwd}`;
          output.scrollTop = output.scrollHeight;
          return;
        }
        if (cmd.startsWith('cd ')) {
          const target = cmd.slice(3).trim();
          if (target === '..') {
            const parts = this.cwd.split('/').filter(Boolean);
            parts.pop();
            this.cwd = '/' + parts.join('/');
          } else if (target.startsWith('/')) {
            this.cwd = target;
          } else {
            this.cwd = this.cwd.replace(/\/$/, '') + '/' + target;
          }
          output.innerHTML += `\n<span style="color:#888;">→ ${this.cwd}</span>`;
          output.scrollTop = output.scrollHeight;
          return;
        }

        output.innerHTML += `\n<span style="color:#fff;">$ ${cmd}</span>`;

        try {
          const resp = await fetch('/api/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd, cwd: this.cwd })
          });
          const data = await resp.json();
          if (data.stdout) output.innerHTML += `\n${this.escapeHtml(data.stdout)}`;
          if (data.stderr) output.innerHTML += `\n<span style="color:#ff5f57;">${this.escapeHtml(data.stderr)}</span>`;
          if (data.exitCode !== 0) output.innerHTML += `\n<span style="color:#ff5f57;">[exit: ${data.exitCode}]</span>`;
        } catch (e) {
          output.innerHTML += `\n<span style="color:#ff5f57;">Error: ${e.message}</span>`;
        }

        output.scrollTop = output.scrollHeight;
      }
    });

    // Focus input when clicking anywhere
    container.addEventListener('click', () => input.focus());
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
