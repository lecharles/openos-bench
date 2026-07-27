// Terminal app
const AppTerminal = {
  cwd: '/root',

  render(container) {
    container.innerHTML = `
      <div class="app-terminal-output" id="terminal-output">
        <div style="color:#888;">KiMi Terminal — type 'help' for commands</div>
        <div style="color:#888;">Current directory: ${AppUtils.escapeHtml(this.cwd)}</div>
      </div>
      <div class="app-terminal-input-row">
        <span class="app-terminal-prompt">$</span>
        <input type="text" id="terminal-input" class="app-input app-terminal-input" placeholder="Enter command..." autocomplete="off">
      </div>
    `;

    const input = container.querySelector('#terminal-input');
    const output = container.querySelector('#terminal-output');

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (!cmd) return;
        input.value = '';

        if (cmd === 'clear') { output.innerHTML = ''; return; }
        if (cmd === 'help') {
          output.innerHTML += `\n<span style="color:#888;">Available commands: help, clear, pwd, cd &lt;dir&gt;, ls, and any shell command</span>`;
          output.scrollTop = output.scrollHeight;
          return;
        }
        if (cmd === 'pwd') {
          output.innerHTML += `\n${AppUtils.escapeHtml(this.cwd)}`;
          output.scrollTop = output.scrollHeight;
          return;
        }
        if (cmd.startsWith('cd ')) {
          const target = cmd.slice(3).trim();
          if (target === '..') {
            const parts = this.cwd.split('/').filter(Boolean);
            parts.pop();
            this.cwd = '/' + parts.join('/');
            if (this.cwd === '') this.cwd = '/';
          } else if (target.startsWith('/')) {
            this.cwd = target.replace(/\/+/g, '/');
          } else {
            this.cwd = (this.cwd.replace(/\/+$/, '') + '/' + target).replace(/\/+/g, '/');
          }
          output.innerHTML += `\n<span style="color:#888;">→ ${AppUtils.escapeHtml(this.cwd)}</span>`;
          output.scrollTop = output.scrollHeight;
          return;
        }

        output.innerHTML += `\n<span style="color:#fff;">$ ${AppUtils.escapeHtml(cmd)}</span>`;

        try {
          const resp = await fetch('/api/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd, cwd: this.cwd })
          });
          const data = await resp.json();
          if (data.stdout && data.stdout.trim()) {
            output.innerHTML += '\n' + AppUtils.escapeHtml(data.stdout.trimEnd());
          }
          if (data.stderr && data.stderr.trim()) {
            output.innerHTML += '\n<span style="color:#ff5f57;">' + AppUtils.escapeHtml(data.stderr.trimEnd()) + '</span>';
          }
          if (data.exitCode && data.exitCode !== 0) {
            output.innerHTML += '\n<span style="color:#ff5f57;">[exit: ' + data.exitCode + ']</span>';
          }
        } catch (e) {
          output.innerHTML += '\n<span style="color:#ff5f57;">Error: ' + AppUtils.escapeHtml(e.message) + '</span>';
        }

        output.scrollTop = output.scrollHeight;
      }
    });

    container.addEventListener('click', () => input.focus());
  }
};
