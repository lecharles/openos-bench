// Text Editor app
const AppTextEdit = {
  render(container, opts) {
    const content = opts?.content || '';
    const filePath = opts?.path || '';
    const name = filePath.split('/').pop() || 'Untitled';

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">${name}</span>
        <span style="flex:1;"></span>
        <span id="textedit-path" style="font-size:11px;color:#999;">${filePath}</span>
        <button class="app-btn primary" id="textedit-save">Save</button>
      </div>
      <textarea id="textedit-area" class="app-input" style="width:100%;height:calc(100% - 40px);font-size:13px;font-family:'SF Mono',Monaco,monospace;resize:none;border:none;padding:12px;line-height:1.6;tab-size:2;" spellcheck="false">${content}</textarea>
    `;

    const textarea = container.querySelector('#textedit-area');
    const saveBtn = container.querySelector('#textedit-save');

    saveBtn.addEventListener('click', async () => {
      if (!filePath) {
        const newPath = prompt('Save as:', '/root/untitled.txt');
        if (!newPath) return;
        container.querySelector('#textedit-path').textContent = newPath;
        // Update opts reference
        if (opts) opts.path = newPath;
      }
      const currentPath = container.querySelector('#textedit-path').textContent;
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
