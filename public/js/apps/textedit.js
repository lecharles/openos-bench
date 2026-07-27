// Text Editor app
const AppTextEdit = {
  render(container, opts) {
    const content = opts?.content || '';
    let currentPath = opts?.path || '';
    const name = currentPath.split('/').pop() || 'Untitled';

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">${AppUtils.escapeHtml(name)}</span>
        <span style="flex:1;"></span>
        <span id="textedit-path" style="font-size:11px;color:#999;">${AppUtils.escapeHtml(currentPath)}</span>
        <button class="app-btn primary" id="textedit-save">Save</button>
      </div>
      <textarea id="textedit-area" style="flex:1;width:100%;font-size:13px;font-family:var(--font-mono);resize:none;border:none;padding:12px;line-height:1.6;tab-size:2;outline:none;" spellcheck="false">${AppUtils.escapeHtml(content)}</textarea>
    `;

    const textarea = container.querySelector('#textedit-area');
    const saveBtn = container.querySelector('#textedit-save');
    const pathEl = container.querySelector('#textedit-path');

    saveBtn.addEventListener('click', async () => {
      if (!currentPath) {
        const newPath = prompt('Save as:', '/root/untitled.txt');
        if (!newPath) return;
        currentPath = newPath;
        pathEl.textContent = newPath;
        if (opts) opts.path = newPath;
      }
      try {
        await fetch('/api/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentPath, content: textarea.value })
        });
        Notifications.add('TextEdit', 'File saved');
      } catch (e) {
        Notifications.add('TextEdit', 'Save failed: ' + e.message);
      }
    });

    // Ctrl+S / Cmd+S to save
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }
};
