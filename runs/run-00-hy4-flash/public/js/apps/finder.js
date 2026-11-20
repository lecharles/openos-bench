// Finder — macOS-grade file browser: Icon / List / Column / Gallery views,
// sidebar with Favorites/iCloud/Locations/Tags, path bar, status bar,
// metadata panel, inline rename, keyboard shortcuts.
window.AppFinder = {
  currentDir: '/root',
  view: 'icons',            // icons | list | columns | gallery
  sortKey: 'name',
  sortAsc: true,
  iconSize: 64,
  _back: [],
  _fwd: [],
  _entries: [],
  _free: null,
  _selected: new Set(),
  _filter: '',
  _galleryIndex: 0,
  _columnChain: [],
  _columnFile: null,
  _collapsed: {},
  _colWidths: {},
  _RECENTS: 'recents://',

  // ---------------------------------------------------------------- icons
  _svg(w, inner) {
    return `<svg viewBox="0 0 64 64" width="${w}" height="${w}" aria-hidden="true">${inner}</svg>`;
  },

  folderSVG(size = 64) {
    return this._svg(size, `
      <defs><linearGradient id="fg${size}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8FD0FB"/><stop offset="1" stop-color="#4FA8F0"/>
      </linearGradient></defs>
      <path d="M6 15a6 6 0 016-6h13l6 7h21a6 6 0 016 6v3H6v-10z" fill="#3E94DC"/>
      <path d="M6 22h52v25a6 6 0 01-6 6H12a6 6 0 01-6-6V22z" fill="url(#fg${size})"/>
    `);
  },

  fileKind(name) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','webp','svg','bmp','ico','heic'].includes(ext)) return 'image';
    if (['mp3','wav','aac','m4a','flac','ogg'].includes(ext)) return 'audio';
    if (['mp4','mov','mkv','webm','avi'].includes(ext)) return 'video';
    if (ext === 'pdf') return 'pdf';
    if (['zip','tar','gz','bz2','xz','7z','rar'].includes(ext)) return 'archive';
    if (['js','ts','jsx','tsx','py','rb','go','rs','java','c','cpp','h','sh','html','css','json','yml','yaml','toml','xml','sql','php','swift','kt','lock'].includes(ext)) return 'code';
    if (['md','txt','rtf','log','doc','docx'].includes(ext)) return 'text';
    return 'generic';
  },

  kindLabel(entry) {
    if (entry.type === 'directory') return 'Folder';
    const k = this.fileKind(entry.name);
    const ext = (entry.name.split('.').pop() || '').toUpperCase();
    return { image: `${ext} Image`, audio: `${ext} Audio`, video: `${ext} Video`, pdf: 'PDF Document',
      archive: `${ext} Archive`, code: `${ext} Source`, text: `${ext} Text`, generic: ext ? `${ext} Document` : 'Document' }[k];
  },

  fileSVG(name, size = 64) {
    const kind = this.fileKind(name);
    const accent = { image: '#5AC8FA', audio: '#AF52DE', video: '#FF2D55', pdf: '#FF3B30',
      archive: '#8E8E93', code: '#34C759', text: '#007AFF', generic: '#8E8E93' }[kind];
    const glyph = {
      image: '<circle cx="24" cy="25" r="3.4" fill="__A__"/><path d="M18 44l8-9 6 6 7-8 7 11H18z" fill="__A__"/>',
      audio: '<path d="M27 20v18.5a5 5 0 11-2.5-4.3V24l14-3v14.5a5 5 0 11-2.5-4.3V20h-9z" fill="__A__"/>',
      video: '<rect x="18" y="24" width="22" height="16" rx="3" fill="__A__"/><path d="M42 29l8-4v14l-8-4v-6z" fill="__A__"/>',
      pdf: '<text x="32" y="40" text-anchor="middle" font-size="12" font-weight="700" fill="__A__" font-family="-apple-system,sans-serif">PDF</text>',
      archive: '<rect x="27" y="18" width="10" height="4" rx="1" fill="__A__"/><rect x="27" y="24" width="10" height="4" rx="1" fill="__A__"/><rect x="27" y="30" width="10" height="4" rx="1" fill="__A__"/><rect x="29.5" y="36" width="5" height="8" rx="1" fill="__A__"/>',
      code: '<path d="M25 26l-7 6 7 6M39 26l7 6-7 6" stroke="__A__" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      text: '<path d="M22 24h20M22 30h20M22 36h13" stroke="__A__" stroke-width="2.6" stroke-linecap="round"/>',
      generic: '<path d="M22 24h20M22 31h20M22 38h13" stroke="__A__" stroke-width="2.6" stroke-linecap="round"/>',
    }[kind].replaceAll('__A__', accent);
    return this._svg(size, `
      <path d="M16 8h20l12 12v34a4 4 0 01-4 4H16a4 4 0 01-4-4V12a4 4 0 014-4z" fill="#FCFCFD" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
      <path d="M36 8l12 12H38a2 2 0 01-2-2V8z" fill="#E4E4E8" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
      ${glyph}
    `);
  },

  iconFor(entry, size = 64) {
    if (entry.type === 'directory') return this.folderSVG(size);
    return this.fileSVG(entry.name, size);
  },

  isImage(name) {
    return ['png','jpg','jpeg','gif','webp','bmp','ico'].includes((name || '').split('.').pop().toLowerCase());
  },

  rawURL(path) {
    return `/api/fs/raw?file=${encodeURIComponent(path)}`;
  },

  thumbFor(entry, fullPath, size = 64) {
    if (entry.type === 'file' && this.isImage(entry.name)) {
      return `<img class="fi-thumb" src="${this.rawURL(fullPath)}" alt="" loading="lazy" draggable="false">`;
    }
    return this.iconFor(entry, size);
  },

  fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h = d.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2,'0')} ${ampm}`;
  },

  // Small sidebar glyphs (14px, SF-Symbols-ish strokes)
  _sb(paths, color = 'var(--color-blue)') {
    return `<svg viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0;color:${color}" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  },
  _sbFill(color) {
    return `<svg viewBox="0 0 16 16" width="12" height="12" style="flex-shrink:0" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`;
  },
  _sidebarIcons() {
    return {
      airdrop: this._sb('<circle cx="8" cy="8" r="6.4"/><circle cx="8" cy="8" r="2.6"/><circle cx="8" cy="8" r="0.6" fill="currentColor"/>'),
      recents: this._sb('<circle cx="8" cy="8" r="6.4"/><path d="M8 4.6V8l2.4 1.8"/>'),
      applications: this._sb('<rect x="2" y="2" width="5.2" height="5.2" rx="1.2"/><rect x="8.8" y="2" width="5.2" height="5.2" rx="1.2"/><rect x="2" y="8.8" width="5.2" height="5.2" rx="1.2"/><rect x="8.8" y="8.8" width="5.2" height="5.2" rx="1.2"/>'),
      desktop: this._sb('<rect x="1.8" y="2.6" width="12.4" height="8.6" rx="1.4"/><path d="M6 13.4h4M8 11.2v2.2"/>'),
      documents: this._sb('<path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3"/>'),
      downloads: this._sb('<path d="M8 2v7M5 6.4L8 9.4l3-3"/><path d="M2.6 11v1.8a1.4 1.4 0 001.4 1.4h8a1.4 1.4 0 001.4-1.4V11"/>'),
      pictures: this._sb('<rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6"/><circle cx="5.6" cy="6.4" r="1.2"/><path d="M2.6 11.6l3.4-3.2 2.6 2.4 3-2.8 2 2"/>'),
      cloud: this._sb('<path d="M4.6 12.4a2.9 2.9 0 01-.5-5.7 4.1 4.1 0 018-0.4 2.7 2.7 0 01-.7 6.1H4.6z"/>', 'var(--color-teal)'),
      disk: this._sb('<rect x="1.6" y="3" width="12.8" height="10" rx="1.8"/><path d="M1.6 9.6h12.8"/><circle cx="11.6" cy="11.3" r="0.7" fill="currentColor"/>', 'var(--content-text-secondary)'),
      projects: this._sb('<path d="M2 4.4a1.6 1.6 0 011.6-1.6h3l1.6 1.8h4.6A1.6 1.6 0 0114.4 6.2v5a1.6 1.6 0 01-1.6 1.6H3.6A1.6 1.6 0 012 11.2V4.4z"/>', 'var(--color-orange)'),
      trash: this._sb('<path d="M3 4.4h10M6.4 4.4V3a1 1 0 011-1h1.2a1 1 0 011 1v1.4M4.6 4.4l.6 8.6a1.2 1.2 0 001.2 1.1h3.2a1.2 1.2 0 001.2-1.1l.6-8.6"/>', 'var(--content-text-secondary)'),
    };
  },

  // ---------------------------------------------------------------- shell
  async render(container, opts) {
    const startDir = (opts && opts.dir) || this.currentDir || '/root';
    const viewBtn = (v, label, glyph) =>
      `<button class="finder-view-btn${this.view === v ? ' active' : ''}" data-view="${v}" title="${label} (⌘${{icons:1,list:2,columns:3,gallery:4}[v]})">${glyph}</button>`;
    const seg = {
      icons: '<svg viewBox="0 0 16 16" width="14" height="14"><g fill="currentColor"><rect x="1.5" y="1.5" width="5.6" height="5.6" rx="1.2"/><rect x="8.9" y="1.5" width="5.6" height="5.6" rx="1.2"/><rect x="1.5" y="8.9" width="5.6" height="5.6" rx="1.2"/><rect x="8.9" y="8.9" width="5.6" height="5.6" rx="1.2"/></g></svg>',
      list: '<svg viewBox="0 0 16 16" width="14" height="14"><g fill="currentColor"><rect x="1.5" y="2.4" width="13" height="2" rx="1"/><rect x="1.5" y="7" width="13" height="2" rx="1"/><rect x="1.5" y="11.6" width="13" height="2" rx="1"/></g></svg>',
      columns: '<svg viewBox="0 0 16 16" width="14" height="14"><g fill="currentColor"><rect x="1.5" y="1.5" width="3.6" height="13" rx="1"/><rect x="6.2" y="1.5" width="3.6" height="13" rx="1"/><rect x="10.9" y="1.5" width="3.6" height="13" rx="1"/></g></svg>',
      gallery: '<svg viewBox="0 0 16 16" width="14" height="14"><g fill="currentColor"><rect x="1.5" y="1.5" width="13" height="8.4" rx="1.4"/><rect x="1.5" y="11.4" width="3.4" height="3.1" rx="0.8"/><rect x="6.3" y="11.4" width="3.4" height="3.1" rx="0.8"/><rect x="11.1" y="11.4" width="3.4" height="3.1" rx="0.8"/></g></svg>',
    };

    container.innerHTML = `
      <div class="finder-root">
        <div class="finder-toolbar">
          <div class="finder-nav-group">
            <button id="finder-back" class="finder-nav-btn" title="Back" disabled>
              <svg viewBox="0 0 16 16" width="13" height="13"><path d="M10.5 3L5.5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button id="finder-fwd" class="finder-nav-btn" title="Forward" disabled>
              <svg viewBox="0 0 16 16" width="13" height="13"><path d="M5.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <span id="finder-title" class="finder-title"></span>
          <span class="app-spacer"></span>
          <div class="finder-view-switch">
            ${viewBtn('icons', 'Icon View', seg.icons)}
            ${viewBtn('list', 'List View', seg.list)}
            ${viewBtn('columns', 'Column View', seg.columns)}
            ${viewBtn('gallery', 'Gallery View', seg.gallery)}
          </div>
          <div class="finder-search">
            <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.6 10.6L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <input type="text" id="finder-search-input" placeholder="Search" autocomplete="off">
          </div>
        </div>
        <div class="finder-main">
          <div class="finder-sidebar" id="finder-sidebar"></div>
          <div class="finder-content" id="finder-content" tabindex="-1"></div>
        </div>
        <div class="finder-pathbar" id="finder-pathbar"></div>
        <div class="finder-statusbar" id="finder-statusbar"></div>
      </div>
    `;

    this._bindShell(container);
    this._renderSidebar(container);
    this.navigate(container, startDir, { replace: true });
  },

  _bindShell(container) {
    container.querySelector('#finder-back').addEventListener('click', () => this.goBack(container));
    container.querySelector('#finder-fwd').addEventListener('click', () => this.goFwd(container));
    container.querySelectorAll('.finder-view-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setView(container, btn.dataset.view));
    });
    const search = container.querySelector('#finder-search-input');
    search.addEventListener('input', AppUtils.debounce(() => {
      this._filter = search.value.trim().toLowerCase();
      this.renderView(container);
    }, 180));
    search.addEventListener('keydown', (e) => e.stopPropagation());

    // Keyboard shortcuts — active while this Finder window is focused
    const winObj = container.closest('.window')?._winObj;
    const onKey = (e) => {
      if (!winObj || WindowManager.focusedWindow !== winObj) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && ['1','2','3','4'].includes(e.key)) {
        e.preventDefault();
        this.setView(container, { 1: 'icons', 2: 'list', 3: 'columns', 4: 'gallery' }[e.key]);
      } else if (mod && e.key === 'ArrowUp') {
        e.preventDefault(); this.goUp(container);
      } else if (mod && (e.key === 'ArrowDown' || e.key === 'o')) {
        e.preventDefault(); this.openSelection(container);
      } else if (mod && e.key === 'Backspace') {
        e.preventDefault(); this.trashSelection(container);
      } else if (e.key === 'Enter' && this._selected.size === 1) {
        e.preventDefault(); this.startRename(container);
      } else if (this.view === 'gallery' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        this.galleryStep(container, e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    document.addEventListener('keydown', onKey);
    if (winObj) {
      const prev = winObj._cleanup;
      winObj._cleanup = () => { document.removeEventListener('keydown', onKey); window.removeEventListener('kbd:toggle-pathbar', onTogglePb); if (prev) prev(); };
    }

    // View > Show / Hide Path Bar
    const onTogglePb = () => {
      const pb = container.querySelector('#finder-pathbar');
      if (pb) pb.classList.toggle('finder-hidden-bar');
    };
    window.addEventListener('kbd:toggle-pathbar', onTogglePb);

    // Finder root receives clicks → focus content for key events
    container.addEventListener('mousedown', () => {
      const c = container.querySelector('#finder-content');
      if (c) c.focus({ preventScroll: true });
    });
  },

  setView(container, view) {
    if (this.view === view) return;
    this.view = view;
    container.querySelectorAll('.finder-view-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === view));
    if (view === 'columns') this._buildColumnChain();
    if (view === 'gallery') this._galleryIndex = 0;
    this.renderView(container);
  },

  // ---------------------------------------------------------------- sidebar
  _sidebarData() {
    const ic = this._sidebarIcons();
    return [
      { title: 'Favorites', items: [
        { label: 'AirDrop', icon: ic.airdrop, action: 'airdrop' },
        { label: 'Recents', icon: ic.recents, dir: this._RECENTS },
        { label: 'Applications', icon: ic.applications, dir: '/root/Applications' },
        { label: 'Desktop', icon: ic.desktop, dir: '/root/Desktop' },
        { label: 'Documents', icon: ic.documents, dir: '/root/Documents' },
        { label: 'Downloads', icon: ic.downloads, dir: '/root/Downloads' },
        { label: 'Pictures', icon: ic.pictures, dir: '/root/Pictures' },
      ]},
      { title: 'iCloud', items: [
        { label: 'iCloud Drive', icon: ic.cloud, action: 'icloud' },
      ]},
      { title: 'Locations', items: [
        { label: 'Macintosh HD', icon: ic.disk, dir: '/root' },
        { label: 'OpenOS Projects', icon: ic.projects, dir: '/root/Projects' },
        { label: 'Temporary', icon: ic.disk, dir: '/tmp' },
      ]},
      { title: 'Tags', items: [
        { label: 'Red', icon: this._sbFill('#FF3B30'), action: 'tag' },
        { label: 'Orange', icon: this._sbFill('#FF9500'), action: 'tag' },
        { label: 'Yellow', icon: this._sbFill('#FFCC00'), action: 'tag' },
        { label: 'Green', icon: this._sbFill('#34C759'), action: 'tag' },
        { label: 'Blue', icon: this._sbFill('#007AFF'), action: 'tag' },
        { label: 'Purple', icon: this._sbFill('#AF52DE'), action: 'tag' },
      ]},
    ];
  },

  _renderSidebar(container) {
    const sb = container.querySelector('#finder-sidebar');
    sb.innerHTML = '';
    this._sidebarData().forEach(section => {
      const collapsed = !!this._collapsed[section.title];
      const sec = document.createElement('div');
      sec.className = 'finder-sb-section';
      sec.innerHTML = `
        <div class="finder-sb-header${collapsed ? ' collapsed' : ''}">
          <svg viewBox="0 0 16 16" width="9" height="9" class="finder-sb-chev"><path d="M5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>${section.title}</span>
        </div>
        <div class="finder-sb-items"${collapsed ? ' hidden' : ''}></div>
      `;
      sec.querySelector('.finder-sb-header').addEventListener('click', () => {
        this._collapsed[section.title] = !this._collapsed[section.title];
        this._renderSidebar(container);
      });
      const list = sec.querySelector('.finder-sb-items');
      section.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'finder-sb-item';
        if (item.dir && item.dir === this.currentDir) el.classList.add('active');
        el.innerHTML = `${item.icon}<span class="finder-sb-label">${AppUtils.escapeHtml(item.label)}</span>`;
        el.addEventListener('click', () => {
          if (item.dir) this.navigate(container, item.dir);
          else if (item.action === 'airdrop') Notifications.add('AirDrop', 'No devices found nearby');
          else if (item.action === 'icloud') Notifications.add('iCloud', 'iCloud Drive is not available in this demo');
          else if (item.action === 'tag') Notifications.add('Tags', 'Tag filtering is not available in this demo');
        });
        list.appendChild(el);
      });
      sb.appendChild(sec);
    });
  },

  // ---------------------------------------------------------------- navigation
  navigate(container, dir, opts = {}) {
    if (!opts.replace && dir !== this.currentDir) {
      this._back.push(this.currentDir);
      this._fwd = [];
    }
    this.currentDir = dir;
    this._selected.clear();
    this._columnFile = null;
    this._galleryIndex = 0;
    if (this.view === 'columns') this._buildColumnChain();
    // Persist the location so a restored Finder reopens here
    const winObj = container.closest('.window')?._winObj;
    if (winObj && winObj.opts) { winObj.opts.dir = dir; WindowManager._debouncedSave(); }
    this.loadDir(container);
  },

  goBack(container) {
    if (!this._back.length) return;
    this._fwd.push(this.currentDir);
    this.currentDir = this._back.pop();
    this._selected.clear();
    this._columnFile = null;
    if (this.view === 'columns') this._buildColumnChain();
    this.loadDir(container);
  },

  goFwd(container) {
    if (!this._fwd.length) return;
    this._back.push(this.currentDir);
    this.currentDir = this._fwd.pop();
    this._selected.clear();
    this._columnFile = null;
    if (this.view === 'columns') this._buildColumnChain();
    this.loadDir(container);
  },

  goUp(container) {
    if (this.currentDir === this._RECENTS) return;
    const parts = this.currentDir.split('/').filter(Boolean);
    if (parts.length <= 1) {
      Notifications.add('Finder', 'Cannot go above this folder (access restricted)');
      return;
    }
    parts.pop();
    this.navigate(container, '/' + parts.join('/'));
  },

  async loadDir(container) {
    const content = container.querySelector('#finder-content');
    if (!content) return;
    content.classList.add('finder-fading');
    this._updateNavButtons(container);

    try {
      let entries = [], free = this._free;
      if (this.currentDir === this._RECENTS) {
        entries = await this._loadRecents();
      } else {
        const resp = await fetch(`/api/fs?dir=${encodeURIComponent(this.currentDir)}`);
        const data = await resp.json();
        if (data.error) {
          content.classList.remove('finder-fading');
          content.innerHTML = `<div class="app-empty">${AppUtils.escapeHtml(data.error)}</div>`;
          this._updateChrome(container, 0);
          return;
        }
        entries = data.entries;
        free = data.free;
      }
      this._entries = entries;
      this._free = free;
      this.renderView(container);
    } catch (e) {
      content.classList.remove('finder-fading');
      content.innerHTML = '<div class="app-empty">Failed to load folder</div>';
    }
  },

  async _loadRecents() {
    const dirs = ['/root/Desktop', '/root/Documents', '/root/Downloads', '/root/Pictures', '/root'];
    const all = [];
    await Promise.all(dirs.map(async d => {
      try {
        const resp = await fetch(`/api/fs?dir=${encodeURIComponent(d)}`);
        const data = await resp.json();
        (data.entries || []).forEach(e => {
          if (e.type === 'file' && !e.name.startsWith('.')) all.push({ ...e, _dir: d });
        });
      } catch {}
    }));
    all.sort((a, b) => (b.mtime || '').localeCompare(a.mtime || ''));
    return all.slice(0, 40);
  },

  _updateNavButtons(container) {
    const back = container.querySelector('#finder-back');
    const fwd = container.querySelector('#finder-fwd');
    if (back) back.disabled = this._back.length === 0;
    if (fwd) fwd.disabled = this._fwd.length === 0;
  },

  _sortedFiltered() {
    let list = [...this._entries];
    if (this._filter) list = list.filter(e => e.name.toLowerCase().includes(this._filter));
    const key = this.sortKey;
    const dirMul = this.sortAsc ? 1 : -1;
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      let r = 0;
      if (key === 'size') r = (a.size || 0) - (b.size || 0);
      else if (key === 'mtime') r = (a.mtime || '').localeCompare(b.mtime || '');
      else if (key === 'kind') r = this.kindLabel(a).localeCompare(this.kindLabel(b));
      else r = a.name.localeCompare(b.name, undefined, { numeric: true });
      return r * dirMul;
    });
    return list;
  },

  _entryDir(entry) {
    return entry._dir || this.currentDir;
  },

  // ---------------------------------------------------------------- view dispatch
  renderView(container) {
    const content = container.querySelector('#finder-content');
    if (!content) return;
    const renderers = {
      icons: () => this._renderIcons(content, container),
      list: () => this._renderList(content, container),
      columns: () => this._renderColumns(content, container),
      gallery: () => this._renderGallery(content, container),
    };
    (renderers[this.view] || renderers.icons)();
    this._updateChrome(container);
    requestAnimationFrame(() => content.classList.remove('finder-fading'));
  },

  _updateChrome(container, count) {
    const n = count !== undefined ? count : this._sortedFiltered().length;
    const title = container.querySelector('#finder-title');
    if (title) {
      title.textContent = this.currentDir === this._RECENTS
        ? 'Recents'
        : (this.currentDir.split('/').filter(Boolean).pop() || 'Macintosh HD');
    }
    const sb = container.querySelector('#finder-statusbar');
    if (sb) {
      const freeStr = this._free != null ? `, ${AppUtils.formatSize(this._free)} available` : '';
      sb.innerHTML = `<span>${n} item${n === 1 ? '' : 's'}${freeStr}</span>
        <span class="finder-status-right">
          ${this.view === 'icons' ? '<input type="range" id="finder-icon-size" min="40" max="112" step="4" value="' + this.iconSize + '" title="Icon size">' : ''}
        </span>`;
      const slider = sb.querySelector('#finder-icon-size');
      if (slider) {
        slider.addEventListener('input', () => {
          this.iconSize = parseInt(slider.value, 10);
          const grid = container.querySelector('.finder-icons');
          if (grid) grid.style.setProperty('--fi-size', this.iconSize + 'px');
        });
      }
    }
    // Path bar
    const pb = container.querySelector('#finder-pathbar');
    if (pb) {
      if (this.currentDir === this._RECENTS) {
        pb.innerHTML = `<span class="finder-crumb is-current">${this._sidebarIcons().recents}<span>Recents</span></span>`;
      } else {
        const parts = this.currentDir.split('/').filter(Boolean);
        let acc = '';
        const crumbs = parts.map((p, i) => {
          acc += '/' + p;
          const path = acc;
          const label = i === 0 ? (p === 'root' ? 'Macintosh HD' : p) : p;
          const isLast = i === parts.length - 1;
          return `<span class="finder-crumb${isLast ? ' is-current' : ''}" data-path="${AppUtils.escapeHtml(path)}">
            ${i === 0 ? this._sidebarIcons().disk : this._sidebarIcons().projects}
            <span>${AppUtils.escapeHtml(label)}</span></span>`;
        });
        pb.innerHTML = crumbs.join('<span class="finder-crumb-sep">›</span>');
        pb.querySelectorAll('.finder-crumb').forEach(c => {
          c.addEventListener('click', () => this.navigate(container, c.dataset.path));
        });
      }
    }
    // Sidebar active state
    this._renderSidebar(container);
  },

  // ---------------------------------------------------------------- shared item behavior
  _bindItem(el, entry, container) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!(e.metaKey || e.ctrlKey)) this._selected.clear();
      if (this._selected.has(entry.name) && (e.metaKey || e.ctrlKey)) this._selected.delete(entry.name);
      else this._selected.add(entry.name);
      this._applySelection(container);
    });
    el.addEventListener('dblclick', () => this.openEntry(container, entry));
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this._selected.has(entry.name)) {
        this._selected.clear();
        this._selected.add(entry.name);
        this._applySelection(container);
      }
      this._showContextMenu(container, e.clientX, e.clientY, entry);
    });
  },

  _applySelection(container) {
    container.querySelectorAll('[data-entry-name]').forEach(el => {
      el.classList.toggle('selected', this._selected.has(el.dataset.entryName));
    });
    if (this.view === 'gallery') {
      const list = this._sortedFiltered();
      const first = [...this._selected][0];
      const idx = list.findIndex(e => e.name === first);
      if (idx >= 0 && idx !== this._galleryIndex) {
        this._galleryIndex = idx;
        this._renderGallery(container.querySelector('#finder-content'), container);
      }
    }
  },

  openSelection(container) {
    const name = [...this._selected][0];
    const entry = this._entries.find(e => e.name === name);
    if (entry) this.openEntry(container, entry);
  },

  openEntry(container, entry, baseDir) {
    const base = (baseDir || this._entryDir(entry)).replace(/\/+$/, '');
    if (entry.type === 'directory') {
      this.navigate(container, base + '/' + entry.name);
    } else {
      this.openFile(base + '/' + entry.name, entry.name);
    }
  },

  async openFile(path, name) {
    if (AppUtils.isTextFile(name)) {
      try {
        const resp = await fetch(`/api/fs/read?file=${encodeURIComponent(path)}`);
        const data = await resp.json();
        if (data.error) { Notifications.add('Finder', data.error); return; }
        WindowManager.open('textedit', name, { content: data.content || '', path: path });
      } catch {}
    } else {
      WindowManager.open('preview', name, { path: path });
    }
  },

  // ---------------------------------------------------------------- context menu / info / trash
  _showContextMenu(container, x, y, entry) {
    document.querySelectorAll('.finder-ctx').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'context-menu finder-ctx';
    menu.innerHTML = `
      <div class="context-item" data-a="open">Open</div>
      <div class="context-item" data-a="rename">Rename</div>
      <div class="context-item" data-a="info">Get Info</div>
      <div class="context-sep"></div>
      <div class="context-item" data-a="trash">Move to Trash</div>
    `;
    document.body.appendChild(menu);
    menu.style.left = Math.min(x, window.innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 8) + 'px';
    requestAnimationFrame(() => { menu.style.opacity = '1'; menu.style.transform = 'scale(1)'; });
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('.context-item')?.dataset.a;
      if (a === 'open') this.openEntry(container, entry);
      if (a === 'rename') this.startRename(container);
      if (a === 'info') this.showInfo(container, entry);
      if (a === 'trash') this.trashSelection(container);
      menu.remove();
    });
    const dismiss = (ev) => {
      if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', dismiss); }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 10);
  },

  showInfo(container, entry) {
    container.querySelectorAll('.finder-info-card').forEach(c => c.remove());
    const base = this._entryDir(entry).replace(/\/+$/, '');
    const full = base + '/' + entry.name;
    const card = document.createElement('div');
    card.className = 'finder-info-card';
    card.innerHTML = `
      <button class="finder-info-close" title="Close">✕</button>
      <div class="finder-info-icon">${this.thumbFor(entry, full, 64)}</div>
      <div class="finder-info-name">${AppUtils.escapeHtml(entry.name)}</div>
      <div class="finder-info-rows">
        <div><span>Kind</span><span>${this.kindLabel(entry)}</span></div>
        <div><span>Size</span><span>${entry.type === 'directory' ? '—' : AppUtils.formatSize(entry.size || 0)}</span></div>
        <div><span>Modified</span><span>${this.fmtDate(entry.mtime)}</span></div>
        <div><span>Where</span><span class="finder-info-path">${AppUtils.escapeHtml(base)}</span></div>
      </div>
    `;
    card.querySelector('.finder-info-close').addEventListener('click', () => card.remove());
    container.querySelector('.finder-root').appendChild(card);
  },

  async trashSelection(container) {
    const names = [...this._selected];
    if (!names.length) return;
    for (const name of names) {
      const entry = this._entries.find(e => e.name === name);
      if (!entry) continue;
      const base = this._entryDir(entry).replace(/\/+$/, '');
      try {
        const resp = await fetch('/api/fs/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: base + '/' + name })
        });
        const data = await resp.json();
        if (!resp.ok) { Notifications.add('Finder', data.error || 'Move to Trash failed'); continue; }
        Notifications.add('Finder', `"${name}" moved to Trash`);
      } catch (err) {
        Notifications.add('Finder', 'Move to Trash failed: ' + err.message);
      }
    }
    this._selected.clear();
    this.loadDir(container);
  },

  // ---------------------------------------------------------------- rename
  startRename(container) {
    const name = [...this._selected][0];
    if (!name || this.currentDir === this._RECENTS) return;
    const el = container.querySelector(`[data-entry-name="${CSS.escape(name)}"] .fi-label, [data-entry-name="${CSS.escape(name)}"] .fl-name`);
    if (!el) return;
    const entry = this._entries.find(e => e.name === name);
    const input = document.createElement('input');
    input.className = 'finder-rename-input';
    input.value = name;
    el.replaceWith(input);
    input.focus();
    const dot = name.lastIndexOf('.');
    input.setSelectionRange(0, entry.type === 'file' && dot > 0 ? dot : name.length);

    let done = false;
    const commit = async (save) => {
      if (done) return;
      done = true;
      const newName = input.value.trim();
      if (save && newName && newName !== name) {
        try {
          const resp = await fetch('/api/fs/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: this.currentDir.replace(/\/+$/, '') + '/' + name, newName })
          });
          const data = await resp.json();
          if (!resp.ok) Notifications.add('Finder', data.error || 'Rename failed');
        } catch { Notifications.add('Finder', 'Rename failed'); }
      }
      this.loadDir(container);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') commit(true);
      if (e.key === 'Escape') commit(false);
    });
    input.addEventListener('blur', () => commit(true));
  },

  // ---------------------------------------------------------------- Icon view
  _renderIcons(content, container) {
    const list = this._sortedFiltered();
    if (!list.length) {
      content.innerHTML = `<div class="app-empty">${this._filter ? 'No results' : 'Empty folder'}</div>`;
      return;
    }
    content.innerHTML = `<div class="finder-icons" style="--fi-size:${this.iconSize}px"></div>`;
    const grid = content.querySelector('.finder-icons');
    list.forEach(entry => {
      const base = this._entryDir(entry).replace(/\/+$/, '');
      const el = document.createElement('div');
      el.className = 'fi-item';
      el.dataset.entryName = entry.name;
      el.innerHTML = `
        <div class="fi-icon">${this.thumbFor(entry, base + '/' + entry.name, this.iconSize)}</div>
        <div class="fi-label">${AppUtils.escapeHtml(entry.name)}</div>
      `;
      this._bindItem(el, entry, container);
      grid.appendChild(el);
    });
    grid.addEventListener('click', (e) => {
      if (e.target === grid) { this._selected.clear(); this._applySelection(container); }
    });
  },

  // ---------------------------------------------------------------- List view
  _renderList(content, container) {
    const list = this._sortedFiltered();
    const th = (key, label, cls) =>
      `<span class="fl-th ${cls}${this.sortKey === key ? ' sorted' : ''}" data-sort="${key}">${label}${this.sortKey === key ? (this.sortAsc ? ' ▲' : ' ▼') : ''}</span>`;
    let html = `
      <div class="finder-listview">
        <div class="fl-header">
          ${th('name', 'Name', 'fl-name')}
          ${th('mtime', 'Date Modified', 'fl-date')}
          ${th('size', 'Size', 'fl-size')}
          ${th('kind', 'Kind', 'fl-kind')}
        </div>
        <div class="fl-body">
    `;
    list.forEach(entry => {
      html += `
        <div class="fl-row${this._selected.has(entry.name) ? ' selected' : ''}" data-entry-name="${AppUtils.escapeHtml(entry.name)}">
          <span class="fl-name"><span class="fl-icon">${this.iconFor(entry, 18)}</span><span class="fl-name-text">${AppUtils.escapeHtml(entry.name)}</span></span>
          <span class="fl-date">${this.fmtDate(entry.mtime)}</span>
          <span class="fl-size">${entry.type === 'directory' ? '—' : AppUtils.formatSize(entry.size || 0)}</span>
          <span class="fl-kind">${this.kindLabel(entry)}</span>
        </div>`;
    });
    html += '</div></div>';
    content.innerHTML = html;

    content.querySelectorAll('.fl-th').forEach(h => {
      h.addEventListener('click', () => {
        const k = h.dataset.sort;
        if (this.sortKey === k) this.sortAsc = !this.sortAsc;
        else { this.sortKey = k; this.sortAsc = true; }
        this.renderView(container);
      });
    });
    content.querySelectorAll('.fl-row').forEach(row => {
      const entry = this._entries.find(e => e.name === row.dataset.entryName);
      if (entry) this._bindItem(row, entry, container);
    });
    const body = content.querySelector('.fl-body');
    body.addEventListener('click', (e) => {
      if (e.target === body) { this._selected.clear(); this._applySelection(container); }
    });
  },

  // ---------------------------------------------------------------- Column view
  _buildColumnChain() {
    if (this.currentDir === this._RECENTS) { this._columnChain = ['/root']; return; }
    const parts = this.currentDir.split('/').filter(Boolean);
    const chain = [];
    let acc = '';
    parts.forEach(p => { acc += '/' + p; chain.push(acc); });
    this._columnChain = chain.length ? chain : ['/root'];
  },

  async _renderColumns(content, container) {
    if (!this._columnChain.length) this._buildColumnChain();
    content.innerHTML = '<div class="finder-columns"><div class="app-empty" style="padding:40px;">Loading…</div></div>';
    const wrap = content.querySelector('.finder-columns');
    wrap.innerHTML = '';

    for (let i = 0; i < this._columnChain.length; i++) {
      const dir = this._columnChain[i];
      let entries = [];
      try {
        const resp = await fetch(`/api/fs?dir=${encodeURIComponent(dir)}`);
        const data = await resp.json();
        if (!data.error) entries = data.entries;
      } catch {}
      entries = [...entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
      const col = this._makeColumn(container, entries, i);
      wrap.appendChild(col);
    }

    // Rightmost: preview of the selected file
    if (this._columnFile) {
      wrap.appendChild(this._makePreviewColumn(this._columnFile.entry, this._columnFile.path));
    }
    wrap.scrollLeft = wrap.scrollWidth;
  },

  _makeColumn(container, entries, depth) {
    const col = document.createElement('div');
    col.className = 'fcol';
    col.style.width = (this._colWidths[depth] || 200) + 'px';
    const selectedChild = this._columnChain[depth + 1]
      ? this._columnChain[depth + 1].split('/').pop()
      : (depth === this._columnChain.length - 1 && this._columnFile ? this._columnFile.entry.name : null);

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'fcol-item' + (entry.name === selectedChild ? ' selected' : '');
      item.innerHTML = `
        <span class="fcol-icon">${this.iconFor(entry, 16)}</span>
        <span class="fcol-name">${AppUtils.escapeHtml(entry.name)}</span>
        ${entry.type === 'directory' ? '<span class="fcol-arrow">›</span>' : ''}
      `;
      item.addEventListener('click', () => {
        const dir = this._columnChain[depth];
        this._columnChain = this._columnChain.slice(0, depth + 1);
        if (entry.type === 'directory') {
          this._columnChain.push(dir.replace(/\/+$/, '') + '/' + entry.name);
          this._columnFile = null;
          this.currentDir = this._columnChain[this._columnChain.length - 1];
        } else {
          this._columnFile = { entry, path: dir.replace(/\/+$/, '') + '/' + entry.name };
          this.currentDir = dir;
        }
        this._selected = new Set([entry.name]);
        this._entries = entries;
        this._updateChrome(container);
        this._renderColumns(container.querySelector('#finder-content'), container);
      });
      item.addEventListener('dblclick', () => {
        const dir = this._columnChain[depth];
        this.openEntry(container, entry, dir);
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._columnChain = this._columnChain.slice(0, depth + 1);
        this.currentDir = this._columnChain[this._columnChain.length - 1];
        this._entries = entries;
        this._selected = new Set([entry.name]);
        this._showContextMenu(container, e.clientX, e.clientY, entry);
      });
      col.appendChild(item);
    });

    // Resize handle on the column's right edge
    const grip = document.createElement('div');
    grip.className = 'fcol-grip';
    grip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = col.offsetWidth;
      const onMove = (ev) => {
        const w = Math.max(140, Math.min(420, startW + ev.clientX - startX));
        col.style.width = w + 'px';
        this._colWidths[depth] = w;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    col.appendChild(grip);
    return col;
  },

  _makePreviewColumn(entry, fullPath) {
    const col = document.createElement('div');
    col.className = 'fcol fcol-preview';
    col.innerHTML = `
      <div class="finder-meta">
        <div class="finder-meta-icon">${this.thumbFor(entry, fullPath, 96)}</div>
        <div class="finder-meta-name">${AppUtils.escapeHtml(entry.name)}</div>
        <div class="finder-meta-kind">${this.kindLabel(entry)}</div>
        <div class="finder-meta-rows">
          <div><span>Size</span><span>${AppUtils.formatSize(entry.size || 0)}</span></div>
          <div><span>Modified</span><span>${this.fmtDate(entry.mtime)}</span></div>
          <div><span>Path</span><span class="finder-info-path">${AppUtils.escapeHtml(fullPath)}</span></div>
        </div>
      </div>
    `;
    return col;
  },

  // ---------------------------------------------------------------- Gallery view
  _renderGallery(content, container) {
    const list = this._sortedFiltered();
    if (!list.length) {
      content.innerHTML = `<div class="app-empty">${this._filter ? 'No results' : 'Empty folder'}</div>`;
      return;
    }
    if (this._galleryIndex >= list.length) this._galleryIndex = 0;
    const cur = list[this._galleryIndex];
    const base = this._entryDir(cur).replace(/\/+$/, '');
    const full = base + '/' + cur.name;

    content.innerHTML = `
      <div class="finder-gallery">
        <div class="fg-main">
          <div class="fg-stage">
            <button class="fg-arrow fg-prev" title="Previous">‹</button>
            <div class="fg-preview">${this.thumbFor(cur, full, 256)}</div>
            <button class="fg-arrow fg-next" title="Next">›</button>
          </div>
          <div class="fg-meta">
            <div class="finder-meta-name">${AppUtils.escapeHtml(cur.name)}</div>
            <div class="finder-meta-kind">${this.kindLabel(cur)}</div>
            <div class="finder-meta-rows">
              <div><span>Size</span><span>${cur.type === 'directory' ? '—' : AppUtils.formatSize(cur.size || 0)}</span></div>
              <div><span>Modified</span><span>${this.fmtDate(cur.mtime)}</span></div>
              <div><span>Path</span><span class="finder-info-path">${AppUtils.escapeHtml(base)}</span></div>
            </div>
            <div class="fg-count">${this._galleryIndex + 1} of ${list.length}</div>
          </div>
        </div>
        <div class="fg-strip"></div>
      </div>
    `;

    content.querySelector('.fg-prev').addEventListener('click', () => this.galleryStep(container, -1));
    content.querySelector('.fg-next').addEventListener('click', () => this.galleryStep(container, 1));
    content.querySelector('.fg-preview').addEventListener('dblclick', () => this.openEntry(container, cur));

    const strip = content.querySelector('.fg-strip');
    list.forEach((entry, i) => {
      const b = this._entryDir(entry).replace(/\/+$/, '');
      const th = document.createElement('div');
      th.className = 'fg-thumb' + (i === this._galleryIndex ? ' selected' : '');
      th.innerHTML = this.thumbFor(entry, b + '/' + entry.name, 48);
      th.title = entry.name;
      th.addEventListener('click', () => {
        this._galleryIndex = i;
        this._selected = new Set([entry.name]);
        this._renderGallery(content, container);
      });
      th.addEventListener('dblclick', () => this.openEntry(container, entry));
      strip.appendChild(th);
    });
    const sel = strip.querySelector('.fg-thumb.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },

  galleryStep(container, delta) {
    const list = this._sortedFiltered();
    if (!list.length) return;
    this._galleryIndex = (this._galleryIndex + delta + list.length) % list.length;
    this._selected = new Set([list[this._galleryIndex].name]);
    this._renderGallery(container.querySelector('#finder-content'), container);
  },
};
