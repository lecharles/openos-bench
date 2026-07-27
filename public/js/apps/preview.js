// Preview app - file viewer
window.AppPreview = {
  render(container, opts) {
    const path = opts?.path || '';
    const name = path.split('/').pop() || 'Preview';

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">${AppUtils.escapeHtml(name)}</span>
        <span style="flex:1;"></span>
        <span style="font-size:12px;color:#666;">${AppUtils.escapeHtml(path)}</span>
      </div>
      <div id="preview-body" style="flex:1;overflow:auto;display:flex;flex-direction:column;"></div>
    `;

    const body = container.querySelector('#preview-body');

    if (!path) {
      body.innerHTML = '<div class="app-empty">No file selected — open a file from Finder to preview it.</div>';
      return;
    }

    if (AppUtils.isTextFile(name)) {
      this.showText(body, path);
    } else {
      this.showPlaceholder(body, path, name);
    }
  },

  async showText(body, path) {
    body.innerHTML = '<div class="app-empty">Loading...</div>';
    try {
      const resp = await fetch(`/api/fs/read?file=${encodeURIComponent(path)}`);
      const data = await resp.json();
      if (data.error) {
        body.innerHTML = `<div class="app-empty">Error: ${AppUtils.escapeHtml(data.error)}</div>`;
        return;
      }
      const pre = document.createElement('pre');
      pre.style.cssText = 'margin:0;padding:12px;font-size:12px;font-family:var(--font-mono);line-height:1.6;white-space:pre-wrap;word-break:break-word;';
      pre.textContent = data.content || '';
      body.innerHTML = '';
      body.appendChild(pre);
    } catch {
      body.innerHTML = '<div class="app-empty">Failed to load file</div>';
    }
  },

  async showPlaceholder(body, path, name) {
    // Look up file size from the parent directory listing
    let sizeStr = '';
    try {
      const dir = path.split('/').slice(0, -1).join('/') || '/';
      const resp = await fetch(`/api/fs?dir=${encodeURIComponent(dir)}`);
      const data = await resp.json();
      const entry = (data.entries || []).find(e => e.name === name);
      if (entry && entry.size !== undefined) sizeStr = AppUtils.formatSize(entry.size);
    } catch {}

    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:300px;flex-direction:column;flex:1;">
        <div style="font-size:80px;opacity:0.5;">${AppUtils.getFileIcon(name)}</div>
        <div style="font-weight:600;margin-top:12px;">${AppUtils.escapeHtml(name)}</div>
        <div style="color:#666;font-size:12px;margin-top:4px;">${AppUtils.escapeHtml(path)}</div>
        ${sizeStr ? `<div style="color:#999;font-size:12px;margin-top:4px;">${sizeStr}</div>` : ''}
        <div style="color:#999;margin-top:12px;">Preview not available for this file type</div>
      </div>
    `;
  }
};
