// Preview app - file viewer
const AppPreview = {
  render(container, opts) {
    const path = opts?.path || '';
    const name = path.split('/').pop() || 'Preview';

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">${name}</span>
        <span style="flex:1;"></span>
        <span style="font-size:12px;color:#666;">${path}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;min-height:300px;flex-direction:column;">
        <div style="font-size:80px;opacity:0.3;">📄</div>
        <div style="color:#999;margin-top:12px;">Preview not available for this file type</div>
        <div style="color:#666;font-size:12px;margin-top:4px;">${path}</div>
      </div>
    `;
  }
};
