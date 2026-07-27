// App Registry — centralized app metadata and shared utilities
const AppRegistry = {
  apps: {
    finder:     { name: 'Finder',           icon: '📁', title: 'Finder' },
    calendar:   { name: 'Calendar',         icon: '📅', title: 'Calendar' },
    notes:      { name: 'Notes',            icon: '📝', title: 'Notes' },
    clock:      { name: 'Clock',            icon: '🕐', title: 'Clock' },
    calculator: { name: 'Calculator',       icon: '🔢', title: 'Calculator' },
    weather:    { name: 'Weather',          icon: '🌤️', title: 'Weather' },
    mail:       { name: 'Mail',             icon: '📧', title: 'Mail' },
    messages:   { name: 'Messages',         icon: '💬', title: 'Messages' },
    contacts:   { name: 'Contacts',         icon: '👤', title: 'Contacts' },
    photos:     { name: 'Photos',           icon: '🖼️', title: 'Photos' },
    music:      { name: 'Music',            icon: '🎵', title: 'Music' },
    reminders:  { name: 'Reminders',        icon: '✅', title: 'Reminders' },
    preview:    { name: 'Preview',          icon: '👁️', title: 'Preview' },
    textedit:   { name: 'Text Editor',      icon: '📄', title: 'TextEdit' },
    activity:   { name: 'Activity Monitor', icon: '📊', title: 'Activity Monitor' },
    settings:   { name: 'System Settings',  icon: '⚙️', title: 'System Settings' },
    terminal:   { name: 'Terminal',         icon: '⬛', title: 'Terminal' },
    trash:      { name: 'Trash',            icon: '🗑️', title: 'Trash' },
    hermes:     { name: 'Hermes',           icon: '🧠', title: 'Hermes' },
    openclaw:   { name: 'OpenClaw',         icon: '🦞', title: 'OpenClaw' },
    agentcontrol:{ name: 'Agent Control',   icon: '🛡️', title: 'Agent Control' },
  },

  get(id) {
    return this.apps[id] || { name: id, icon: '📦', title: id };
  },

  getTitle(id) {
    return (this.apps[id] || {}).title || id;
  },

  all() {
    return Object.entries(this.apps).map(([id, meta]) => ({ id, ...meta }));
  }
};

// Shared app utilities
const AppUtils = {
  // HTML escape to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  // Simple markdown-like rendering
  renderMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  // Fetch helpers
  async apiGet(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },

  async apiPost(path, data) {
    const resp = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },

  // Debounce helper
  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Format file size
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  },

  // Get file icon by extension
  getFileIcon(name) {
    const ext = (name || '').split('.').pop().toLowerCase();
    const map = {
      txt: '📄', md: '📝', json: '📋', js: '📜', py: '🐍', html: '🌐', css: '🎨',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
      mp3: '🎵', wav: '🎵', mp4: '🎬', pdf: '📕', zip: '📦', tar: '📦', gz: '📦',
      sh: '⚙️', yml: '⚙️', yaml: '⚙️', toml: '⚙️', lock: '🔒', conf: '⚙️',
      cfg: '⚙️', ini: '⚙️', xml: '📋', log: '📄', env: '📄'
    };
    return map[ext] || '📄';
  },

  // Check if file extension is text-editable
  isTextFile(name) {
    const textExts = ['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'yml', 'yaml',
      'toml', 'sh', 'xml', 'log', 'env', 'cfg', 'ini', 'conf', 'ts', 'jsx', 'tsx',
      'sql', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'php', 'swift', 'kt'];
    const ext = (name || '').split('.').pop().toLowerCase();
    return textExts.includes(ext) || !ext;
  }
};
