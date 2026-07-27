// Terminal app
window.AppTerminal = {
  cwd: '/root', // default cwd; each window keeps its own copy in render()

  render(container) {
    let cwd = this.cwd;

    container.innerHTML = `
      <div class="app-terminal-output" id="terminal-output">
        <div style="color:#888;">KiMi Terminal — type 'help' for commands</div>
        <div style="color:#888;">Current directory: ${AppUtils.escapeHtml(cwd)}</div>
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
          output.innerHTML += `\n${AppUtils.escapeHtml(cwd)}`;
          output.scrollTop = output.scrollHeight;
          return;
        }
        if (cmd === 'cd' || cmd.startsWith('cd ')) {
          const target = cmd === 'cd' ? '' : cmd.slice(3).trim();
          if (target === '' || target === '~') {
            cwd = '/root';
          } else if (target === '..') {
            const parts = cwd.split('/').filter(Boolean);
            parts.pop();
            cwd = '/' + parts.join('/');
            if (cwd === '') cwd = '/';
          } else if (target.startsWith('/')) {
            cwd = target.replace(/\/+/g, '/');
          } else {
            cwd = (cwd.replace(/\/+$/, '') + '/' + target).replace(/\/+/g, '/');
          }
          output.innerHTML += `\n<span style="color:#888;">→ ${AppUtils.escapeHtml(cwd)}</span>`;
          output.scrollTop = output.scrollHeight;
          return;
        }

        output.innerHTML += `\n<span style="color:#fff;">$ ${AppUtils.escapeHtml(cmd)}</span>`;

        try {
          const resp = await fetch('/api/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd, cwd: cwd })
          });
          const data = await resp.json();
          if (!resp.ok) {
            output.innerHTML += '\n<span style="color:#ff5f57;">' + AppUtils.escapeHtml(data.error || ('HTTP ' + resp.status)) + '</span>';
          } else {
            if (data.stdout && data.stdout.trim()) {
              output.innerHTML += '\n' + AppUtils.escapeHtml(data.stdout.trimEnd());
            }
            if (data.stderr && data.stderr.trim()) {
              output.innerHTML += '\n<span style="color:#ff5f57;">' + AppUtils.escapeHtml(data.stderr.trimEnd()) + '</span>';
            }
            if (data.exitCode && data.exitCode !== 0) {
              output.innerHTML += '\n<span style="color:#ff5f57;">[exit: ' + data.exitCode + ']</span>';
            }
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
