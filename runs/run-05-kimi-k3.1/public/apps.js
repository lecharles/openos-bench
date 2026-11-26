window.registerOpenOSApps = function (OS) {
  'use strict';
  const { $, $$, esc, icon, appIcon, uniqueId } = OS;
  const imageURL = path => `/api/fs/raw?path=${encodeURIComponent(path)}`;
  const colors = ['#7b9ac4', '#c38b9e', '#7daf94', '#c5a168', '#9a88bd', '#7aa8b4'];
  const initials = name => name.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const cleanText = value => String(value || '').replace(/\r/g, '');

  function sharedCleanup(body) { if (body._cleanup) { body._cleanup(); body._cleanup = null; } }

  /* Finder */
  async function renderFinder(body, win, options) {
    let currentPath = options.path || '/', items = [], selected = null, view = 'icons', history = [], historyIndex = -1, loadingToken = 0;
    body.innerHTML = `<div class="app-shell finder-shell"><div class="app-toolbar"><button class="toolbar-button finder-back" aria-label="Back" disabled>${icon('back')}</button><button class="toolbar-button finder-forward" aria-label="Forward" disabled>${icon('forward')}</button><button class="toolbar-button finder-new" title="New Folder">${icon('plus')}<span>New Folder</span></button><span class="spacer"></span><div class="toolbar-group"><button class="toolbar-button active" data-finder-view="icons" aria-label="Icon view">${icon('grid')}</button><button class="toolbar-button" data-finder-view="list" aria-label="List view">${icon('list')}</button></div><input class="toolbar-search finder-search" placeholder="Search" aria-label="Search files"></div><div class="app-split"><aside class="app-sidebar"><div class="sidebar-section">Favorites</div>${[['Desktop','desktop'],['Documents','folder'],['Downloads','download'],['Pictures','image'],['Music','music']].map(([name, glyph]) => `<button class="sidebar-item" data-path="/${name}">${icon(glyph === 'desktop' ? 'monitor' : glyph)}<span>${name}</span></button>`).join('')}<div class="sidebar-section">Locations</div><button class="sidebar-item" data-path="/">${icon('monitor')}<span>Macintosh HD</span></button><button class="sidebar-item" data-path="/.Trash">${icon('trash')}<span>Trash</span></button><div class="sidebar-section">Tags</div><div class="sidebar-item">${icon('tag')}<span>Personal</span></div></aside><main class="app-main"><div class="finder-pathbar"></div><div class="finder-files" tabindex="0"></div></main></div><footer class="status-bar finder-status">Loading…</footer></div>`;
    const files = $('.finder-files', body), pathbar = $('.finder-pathbar', body), status = $('.finder-status', body), search = $('.finder-search', body);
    const setView = next => { view = next; $$('[data-finder-view]', body).forEach(b => b.classList.toggle('active', b.dataset.finderView === next)); paint(); };
    let displayName = currentPath === '/' ? 'Macintosh HD' : currentPath === '/.Trash' ? 'Trash' : currentPath.split('/').pop();
    function paint() {
      const visible = items;
      if (view === 'icons') {
        files.className = 'finder-files file-grid';
        files.innerHTML = visible.length ? visible.map(item => `<div class="file-item ${selected === item.path ? 'selected' : ''}" data-path="${esc(item.path)}" data-kind="${OS.isImage(item) ? 'image' : item.isDirectory ? 'folder' : 'file'}" tabindex="0">${OS.isImage(item) ? `<img class="file-thumbnail" src="${imageURL(item.path)}" alt="">` : `<span class="file-item-icon">${icon(OS.fileIcon(item))}</span>`}<span class="file-item-name">${esc(item.name)}</span></div>`).join('') : '<div class="finder-empty">This folder is empty.</div>';
      } else {
        files.className = 'finder-files file-list';
        files.innerHTML = `<div class="file-list-header"><span>Name</span><span>Date Modified</span><span>Size</span><span>Kind</span></div>` + (visible.length ? visible.map(item => `<div class="file-list-row file-item ${selected === item.path ? 'selected' : ''}" data-path="${esc(item.path)}" data-kind="${item.isDirectory ? 'folder' : 'file'}" tabindex="0"><span class="file-name-cell">${icon(OS.fileIcon(item))}<span>${esc(item.name)}</span></span><span class="muted">${OS.formatDate(item.modified, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span class="muted">${item.isDirectory ? '—' : OS.formatSize(item.size)}</span><span class="muted">${esc(item.isDirectory ? 'Folder' : item.kind)}</span></div>`).join('') : '<div class="finder-empty">This folder is empty.</div>');
      }
      status.textContent = `${visible.length} item${visible.length === 1 ? '' : 's'}${selected ? ` · “${selected.split('/').pop()}” selected` : ''}`;
    }
    function paintPath() {
      const parts = currentPath.split('/').filter(Boolean);
      pathbar.innerHTML = `<button data-crumb="/">${icon('monitor')} Macintosh HD</button>` + parts.map((part, index) => `${icon('chevron')}<button data-crumb="/${parts.slice(0, index + 1).join('/')}">${esc(part === '.Trash' ? 'Trash' : part)}</button>`).join('');
      $$('.sidebar-item[data-path]', body).forEach(button => button.classList.toggle('active', button.dataset.path === currentPath));
      OS.setWindowTitle('finder', displayName);
    }
    async function load(path, addHistory = true) {
      const token = ++loadingToken;
      try {
        status.textContent = 'Loading…';
        const data = await OS.api(`/api/fs/list?path=${encodeURIComponent(path)}`);
        if (token !== loadingToken) return;
        currentPath = data.path; items = data.items; selected = null;
        displayName = currentPath === '/' ? 'Macintosh HD' : currentPath === '/.Trash' ? 'Trash' : currentPath.split('/').pop();
        if (addHistory) { history = history.slice(0, historyIndex + 1); history.push(currentPath); historyIndex = history.length - 1; }
        $('.finder-back', body).disabled = historyIndex <= 0; $('.finder-forward', body).disabled = historyIndex >= history.length - 1;
        paintPath(); paint(); search.value = '';
      } catch (error) { OS.toast('Finder', error.message); status.textContent = error.message; }
    }
    body._openPath = async (path, makeFolder = false) => { await load(path || '/'); if (makeFolder) await newFolder(); };
    async function newFolder() { const name = await OS.prompt('New Folder', 'untitled folder', `Create a folder in ${displayName}.`); if (!name) return; try { await OS.api('/api/fs/mkdir', { method: 'POST', body: { path: currentPath, name } }); await load(currentPath, false); } catch (e) { OS.toast('Finder', e.message); } }
    function itemFromElement(el) { return items.find(item => item.path === el?.dataset.path); }
    function selectItem(el) { selected = el?.dataset.path || null; paint(); const item = itemFromElement(el); if (item) OS.setWindowTitle('finder', `${item.name} — ${displayName}`); }
    files.addEventListener('click', event => { const el = event.target.closest('.file-item'); if (el) selectItem(el); else { selected = null; paint(); } });
    files.addEventListener('dblclick', event => { const item = itemFromElement(event.target.closest('.file-item')); if (!item) return; item.isDirectory ? load(item.path) : OS.openFile(item); });
    files.addEventListener('keydown', event => {
      const item = itemFromElement(event.target.closest('.file-item'));
      if (event.key === 'Enter' && item) { event.preventDefault(); item.isDirectory ? load(item.path) : OS.openFile(item); }
      if ((event.key === 'Backspace' || event.key === 'Delete') && item && (event.metaKey || event.ctrlKey || event.key === 'Delete')) { event.preventDefault(); trashItem(item); }
    });
    files.addEventListener('contextmenu', event => {
      event.preventDefault(); event.stopPropagation(); const el = event.target.closest('.file-item'), item = itemFromElement(el); if (el) selectItem(el);
      if (!item) return OS.showContext([{ label: 'New Folder', action: 'new', handler: newFolder }, { label: 'Refresh', action: 'refresh', handler: () => load(currentPath, false) }], event.clientX, event.clientY);
      const trash = currentPath === '/.Trash';
      OS.showContext([{ label: 'Open', action: 'open', handler: () => item.isDirectory ? load(item.path) : OS.openFile(item) }, { separator: true }, ...(trash ? [{ label: 'Put Back', action: 'restore', handler: () => restoreItem(item) }, { label: 'Delete Immediately…', action: 'delete', handler: () => deleteItem(item) }] : [{ label: 'Rename', action: 'rename', handler: () => renameItem(item) }, { label: 'Get Info', action: 'info', handler: () => itemInfo(item) }, { separator: true }, { label: 'Move to Trash', action: 'trash', handler: () => trashItem(item) }])], event.clientX, event.clientY);
    });
    async function renameItem(item) { const name = await OS.prompt('Rename item', item.name); if (!name || name === item.name) return; try { await OS.api('/api/fs/rename', { method: 'POST', body: { path: item.path, newName: name } }); await load(currentPath, false); OS.toast('Finder', `Renamed to “${name}”.`); } catch (e) { OS.toast('Finder', e.message); } }
    async function trashItem(item) { if (!await OS.confirm('Move to Trash?', `“${item.name}” will be moved to the Trash.`, 'Move to Trash', true)) return; try { await OS.api('/api/fs/trash', { method: 'POST', body: { path: item.path } }); await load(currentPath, false); OS.toast('Finder', `“${item.name}” moved to Trash.`); } catch (e) { OS.toast('Finder', e.message); } }
    async function restoreItem(item) { try { const result = await OS.api('/api/fs/restore', { method: 'POST', body: { path: item.path } }); await load(currentPath, false); OS.toast('Trash', `Restored to ${result.restoredPath}`); } catch (e) { OS.toast('Trash', e.message); } }
    async function deleteItem(item) { if (!await OS.confirm('Delete Immediately?', `“${item.name}” will be deleted permanently. This cannot be undone.`, 'Delete', true)) return; try { await OS.api(`/api/fs/trash?path=${encodeURIComponent(item.path)}`, { method: 'DELETE' }); await load(currentPath, false); } catch (e) { OS.toast('Trash', e.message); } }
    function itemInfo(item) { OS.confirm(item.name, `${item.isDirectory ? 'Folder' : item.kind}\nLocation: ${item.path}\nSize: ${item.isDirectory ? '—' : OS.formatSize(item.size)}\nModified: ${OS.formatDate(item.modified, { dateStyle: 'medium' })}`, 'Done'); }
    $('.finder-new', body).addEventListener('click', newFolder);
    $$('[data-finder-view]', body).forEach(button => button.addEventListener('click', () => setView(button.dataset.finderView)));
    $$('.sidebar-item[data-path]', body).forEach(button => button.addEventListener('click', () => load(button.dataset.path)));
    pathbar.addEventListener('click', event => { const button = event.target.closest('[data-crumb]'); if (button) load(button.dataset.crumb); });
    $('.finder-back', body).addEventListener('click', () => { if (historyIndex > 0) { historyIndex--; load(history[historyIndex], false); $('.finder-back', body).disabled = historyIndex <= 0; $('.finder-forward', body).disabled = false; } });
    $('.finder-forward', body).addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex++; load(history[historyIndex], false); $('.finder-forward', body).disabled = historyIndex >= history.length - 1; $('.finder-back', body).disabled = false; } });
    let searchTimer;
    search.addEventListener('input', () => { clearTimeout(searchTimer); const query = search.value.trim(); if (!query) return load(currentPath, false); searchTimer = setTimeout(async () => { try { const data = await OS.api(`/api/fs/search?q=${encodeURIComponent(query)}`); items = data.items; selected = null; pathbar.innerHTML = `<span>Search: “${esc(query)}”</span>`; paint(); } catch (e) { OS.toast('Finder', e.message); } }, 250); });
    await load(currentPath); if (options.newFolder) await newFolder();
  }

  /* Trash */
  async function renderTrash(body) {
    body.innerHTML = `<div class="app-shell finder-shell"><div class="app-toolbar"><strong style="font-size:12px">Trash</strong><span class="spacer"></span><button class="toolbar-button trash-restore-all">${icon('restore')} Restore selected</button><button class="toolbar-button danger-button trash-empty">Empty Trash…</button></div><div class="trash-banner">Items in the Trash are kept on the server until you empty it.</div><div class="app-main"><div class="file-grid trash-files"></div></div><footer class="status-bar trash-status"></footer></div>`;
    let items = [], selected = null;
    async function refresh() {
      try { const data = await OS.api('/api/fs/trash'); items = data.items; selected = null; paint(); }
      catch (e) { $('.trash-status', body).textContent = e.message; }
    }
    function paint() {
      $('.trash-files', body).innerHTML = items.length ? items.map(item => `<div class="file-item ${selected === item.path ? 'selected' : ''}" data-path="${esc(item.path)}" data-kind="${item.isDirectory ? 'folder' : 'file'}"><span class="file-item-icon">${icon(OS.fileIcon(item))}</span><span class="file-item-name">${esc(item.name)}</span></div>`).join('') : `<div class="empty-state" style="grid-column:1/-1">${icon('trash')}<h3>Trash is Empty</h3><p>Items you move to the Trash will appear here.</p></div>`;
      $('.trash-status', body).textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    }
    $('.trash-files', body).addEventListener('click', e => { selected = e.target.closest('.file-item')?.dataset.path || null; paint(); });
    $('.trash-files', body).addEventListener('dblclick', e => { const item = items.find(i => i.path === e.target.closest('.file-item')?.dataset.path); if (item) OS.confirm(item.name, `Originally from: ${item.originalPath || 'Unknown'}\nDeleted: ${item.deletedAt ? OS.formatDate(item.deletedAt) : 'Unknown'}`, 'Done'); });
    $('.trash-restore-all', body).addEventListener('click', async () => { const item = items.find(i => i.path === selected); if (!item) return OS.toast('Trash', 'Select an item to put back.'); try { const result = await OS.api('/api/fs/restore', { method: 'POST', body: { path: item.path } }); OS.toast('Trash', `Restored to ${result.restoredPath}`); refresh(); } catch (e) { OS.toast('Trash', e.message); } });
    $('.trash-empty', body).addEventListener('click', async () => { if (!items.length) return; if (!await OS.confirm('Empty Trash?', 'Are you sure you want to permanently erase the items in the Trash? This cannot be undone.', 'Empty Trash', true)) return; try { await OS.api('/api/fs/trash', { method: 'DELETE' }); refresh(); OS.toast('Trash', 'Trash is empty.'); } catch (e) { OS.toast('Trash', e.message); } });
    body._refresh = refresh; await refresh();
  }

  /* Notes */
  async function renderNotes(body, win, options) {
    if (!OS.state.notes.length) OS.state.notes.push({ id: uniqueId(), title: 'New Note', body: '', updatedAt: new Date().toISOString() });
    let selectedId = OS.state.notes[0].id, filter = '', saveDebounce;
    body.innerHTML = `<div class="app-shell"><div class="app-toolbar"><button class="toolbar-button notes-new">${icon('compose')} New Note</button><button class="toolbar-button notes-delete danger-button">${icon('trash')}</button><span class="spacer"></span><span style="font-size:10px;color:var(--muted)" class="notes-save-state">Saved on server</span></div><div class="notes-layout"><section class="notes-list-pane"><input class="notes-search" placeholder="Search all notes" aria-label="Search notes"><div class="notes-list"></div></section><section class="note-editor-pane"><div class="note-date"></div><textarea class="note-editor" placeholder="Start writing…" aria-label="Note editor"></textarea></section></div></div>`;
    const list = $('.notes-list', body), editor = $('.note-editor', body);
    const selectedNote = () => OS.state.notes.find(note => note.id === selectedId);
    function paintList() {
      const notes = OS.state.notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(filter.toLowerCase())).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      list.innerHTML = notes.map(note => `<div class="note-list-item ${note.id === selectedId ? 'active' : ''}" data-id="${note.id}"><strong>${esc(note.title || 'New Note')}</strong><p><time>${OS.formatDate(note.updatedAt, { month: 'short', day: 'numeric' })}</time>${esc(note.body.split('\n').find((line, i) => i > 0 && line.trim()) || 'No additional text')}</p></div>`).join('') || '<div class="empty-state" style="padding:30px 10px"><p>No matching notes.</p></div>';
    }
    function select(id) { selectedId = id; const note = selectedNote(); paintList(); if (note) { editor.value = note.body; editor.disabled = false; $('.note-date', body).textContent = OS.formatDate(note.updatedAt, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }); OS.setWindowTitle('notes', note.title || 'Notes'); } }
    function create() { const note = { id: uniqueId(), title: 'New Note', body: '', updatedAt: new Date().toISOString() }; OS.state.notes.unshift(note); select(note.id); OS.save(); editor.focus(); }
    body._newNote = create;
    list.addEventListener('click', event => { const item = event.target.closest('.note-list-item'); if (item) select(item.dataset.id); });
    $('.notes-new', body).addEventListener('click', create);
    $('.notes-delete', body).addEventListener('click', async () => { const note = selectedNote(); if (!note) return; if (!await OS.confirm('Delete Note?', `“${note.title}” will be removed from Notes.`, 'Delete', true)) return; OS.state.notes = OS.state.notes.filter(n => n.id !== selectedId); if (!OS.state.notes.length) OS.state.notes.push({ id: uniqueId(), title: 'New Note', body: '', updatedAt: new Date().toISOString() }); select(OS.state.notes[0].id); OS.save(); });
    $('.notes-search', body).addEventListener('input', event => { filter = event.target.value; paintList(); });
    editor.addEventListener('input', () => {
      const note = selectedNote(); if (!note) return; note.body = editor.value; note.title = editor.value.split('\n')[0].trim().slice(0, 60) || 'New Note'; note.updatedAt = new Date().toISOString(); OS.setWindowTitle('notes', note.title); paintList();
      $('.notes-save-state', body).textContent = 'Saving…'; clearTimeout(saveDebounce); saveDebounce = setTimeout(async () => { await OS.save(true); $('.notes-save-state', body).textContent = 'Saved on server'; }, 500);
    });
    body._cleanup = () => clearTimeout(saveDebounce);
    select(selectedId); if (options.newNote) create();
  }

  /* Calendar */
  async function renderCalendar(body) {
    let cursor = new Date(); cursor.setDate(1);
    body.innerHTML = `<div class="app-shell calendar-app"><header class="calendar-header"><h2></h2><span class="spacer"></span><button class="toolbar-button calendar-today">Today</button><div class="toolbar-group"><button class="toolbar-button calendar-prev">${icon('back')}</button><button class="toolbar-button calendar-next">${icon('forward')}</button></div><button class="primary-button calendar-add">${icon('plus')} Event</button></header><div class="calendar-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}</div><div class="calendar-grid"></div><div class="calendar-add-form" hidden></div></div>`;
    function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
    function paint() {
      const year = cursor.getFullYear(), month = cursor.getMonth(), todayKey = dateKey(new Date());
      $('.calendar-header h2', body).innerHTML = `${cursor.toLocaleDateString('en-US', { month: 'long' })} <span>${year}</span>`;
      const first = new Date(year, month, 1), start = new Date(year, month, 1 - first.getDay());
      $('.calendar-grid', body).innerHTML = Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const key = dateKey(date), events = OS.state.events.filter(e => e.date === key); return `<div class="calendar-day ${date.getMonth() !== month ? 'other-month' : ''} ${key === todayKey ? 'today' : ''}" data-date="${key}"><span class="day-number">${date.getDate()}</span><div class="calendar-events">${events.slice(0, 3).map(event => `<div class="calendar-event ${esc(event.color || 'blue')}" data-event="${esc(event.id)}" title="${esc(event.time || '')} ${esc(event.title)}">${esc(event.time || '')} ${esc(event.title)}</div>`).join('')}${events.length > 3 ? `<small>+ ${events.length - 3} more</small>` : ''}</div></div>`; }).join('');
    }
    function showForm(date = dateKey(new Date())) {
      const form = $('.calendar-add-form', body); form.innerHTML = `<h3>New Event</h3><form><div class="field"><label>Title</label><input name="title" required placeholder="Event title" autofocus></div><div class="field"><label>Date</label><input name="date" type="date" value="${date}" required></div><div class="field"><label>Time</label><input name="time" type="time" value="09:00"></div><div class="field"><label>Color</label><select name="color"><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option></select></div><div class="calendar-form-actions"><button type="button" class="secondary-button calendar-cancel">Cancel</button><button class="primary-button" type="submit">Add Event</button></div></form>`;
      form.hidden = false; $('[name=title]', form).focus();
      $('.calendar-cancel', form).addEventListener('click', () => form.hidden = true);
      $('form', form).addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); OS.state.events.push({ id: uniqueId(), title: data.get('title').trim(), date: data.get('date'), time: data.get('time'), color: data.get('color') }); OS.save(); form.hidden = true; paint(); OS.toast('Calendar', 'Event added and saved.'); });
    }
    $('.calendar-prev', body).addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); paint(); });
    $('.calendar-next', body).addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); paint(); });
    $('.calendar-today', body).addEventListener('click', () => { cursor = new Date(); cursor.setDate(1); paint(); });
    $('.calendar-add', body).addEventListener('click', () => showForm());
    $('.calendar-grid', body).addEventListener('click', event => { const eventEl = event.target.closest('.calendar-event'); if (eventEl) { const item = OS.state.events.find(e => e.id === eventEl.dataset.event); if (item) OS.confirm(item.title, `${OS.formatDate(item.date, { weekday: 'long', month: 'long', day: 'numeric' })}\n${item.time || 'All day'}\n\nDouble-click an event to delete it.`, 'Done'); return; } const day = event.target.closest('.calendar-day'); if (day) showForm(day.dataset.date); });
    $('.calendar-grid', body).addEventListener('dblclick', async event => { const el = event.target.closest('.calendar-event'); if (!el) return; const item = OS.state.events.find(e => e.id === el.dataset.event); if (item && await OS.confirm('Delete Event?', `Delete “${item.title}”?`, 'Delete', true)) { OS.state.events = OS.state.events.filter(e => e.id !== item.id); OS.save(); paint(); } });
    body._refresh = paint; paint();
  }

  /* Weather */
  function renderWeather(body) {
    const hours = [['Now','cloud','18°'],['11 AM','sun','19°'],['12 PM','sun','20°'],['1 PM','sun','21°'],['2 PM','cloud','21°'],['3 PM','cloud','20°'],['4 PM','rain','19°']];
    const days = [['Today','cloud','13°','21°'],['Friday','sun','12°','23°'],['Saturday','sun','13°','24°'],['Sunday','rain','14°','19°'],['Monday','rain','12°','18°'],['Tuesday','cloud','11°','20°']];
    body.innerHTML = `<div class="weather-app"><div class="weather-hero"><div class="weather-location">San Francisco</div><div class="weather-current-temp">18°</div><div class="weather-condition">Partly Cloudy</div><div class="weather-range">H:21° &nbsp; L:13°</div></div><section class="weather-card"><div class="weather-card-title">${icon('clock')} Hourly Forecast</div><div class="hourly-row">${hours.map(([time, glyph, temp]) => `<div class="hour"><span>${time}</span>${icon(glyph)}<strong>${temp}</strong></div>`).join('')}</div></section><section class="weather-card"><div class="weather-card-title">${icon('calendar')} 6-Day Forecast</div>${days.map(([day, glyph, low, high]) => `<div class="forecast-row"><span>${day}</span>${icon(glyph)}<span class="low">${low}</span><i class="temp-bar"></i><span class="high">${high}</span></div>`).join('')}</section><div class="weather-details"><div class="weather-detail"><small>Feels like</small><strong>17°</strong><span>A light jacket may help.</span></div><div class="weather-detail"><small>Wind</small><strong>12 <span style="font-size:12px">km/h</span></strong><span>From the west</span></div><div class="weather-detail"><small>Humidity</small><strong>72%</strong><span>Dew point 12°</span></div><div class="weather-detail"><small>UV Index</small><strong>3</strong><span>Moderate until 3 PM</span></div></div><p style="text-align:center;font-size:9px;opacity:.55;margin-bottom:18px">OpenOS Weather · Local demonstration forecast</p></div>`;
  }

  /* Calculator */
  function renderCalculator(body) {
    let display = '0', stored = null, operator = null, waiting = false;
    body.innerHTML = `<div class="calculator-app" tabindex="0"><div class="calculator-display">0</div><div class="calculator-buttons">${[['AC','utility'],['±','utility'],['%','utility'],['÷','operator'],['7',''],['8',''],['9',''],['×','operator'],['4',''],['5',''],['6',''],['−','operator'],['1',''],['2',''],['3',''],['+','operator'],['0','zero'],['.',''],['=','operator']].map(([label, cls]) => `<button class="calc-key ${cls}" data-key="${label}">${label}</button>`).join('')}</div></div>`;
    const output = $('.calculator-display', body);
    const calculate = (a, b, op) => op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b;
    function press(key) {
      if (/^\d$/.test(key)) { display = waiting || display === '0' ? key : display + key; waiting = false; }
      else if (key === '.') { if (waiting) { display = '0.'; waiting = false; } else if (!display.includes('.')) display += '.'; }
      else if (key === 'AC') { display = '0'; stored = null; operator = null; waiting = false; }
      else if (key === '±') display = String(-Number(display));
      else if (key === '%') display = String(Number(display) / 100);
      else if (['+','−','×','÷'].includes(key)) { if (operator && !waiting) display = String(calculate(Number(stored), Number(display), operator)); stored = Number(display); operator = key; waiting = true; }
      else if (key === '=') { if (operator) { display = String(calculate(Number(stored), Number(display), operator)); stored = null; operator = null; waiting = true; } }
      if (!Number.isFinite(Number(display))) { display = 'Error'; stored = null; operator = null; }
      output.textContent = display.length > 14 ? Number(display).toExponential(8) : display;
      output.style.fontSize = display.length > 10 ? '30px' : '43px';
    }
    $$('.calc-key', body).forEach(button => button.addEventListener('click', () => press(button.dataset.key)));
    $('.calculator-app', body).addEventListener('keydown', event => { const map = { '/':'÷','*':'×','-':'−','+':'+','Enter':'=','=':'=','Escape':'AC','Backspace':'AC','%':'%' }; const key = /^\d$/.test(event.key) || event.key === '.' ? event.key : map[event.key]; if (key) { event.preventDefault(); press(key); } });
  }

  /* Preview */
  async function renderPreview(body, win, options) { await previewController(body, options); }
  async function previewController(body, options) {
    let pictures = [], current = null, zoom = 1, rotation = 0;
    body.innerHTML = `<div class="app-shell"><div class="app-toolbar"><button class="toolbar-button preview-side">${icon('list')}</button><span class="preview-name" style="font-size:11px;font-weight:600">Loading…</span><span class="spacer"></span><button class="toolbar-button zoom-out">−</button><span class="zoom-label" style="font-size:10px;color:var(--muted)">100%</span><button class="toolbar-button zoom-in">+</button><button class="toolbar-button preview-rotate" title="Rotate">${icon('refresh')}</button><a class="toolbar-button preview-download" download title="Download">${icon('download')}</a></div><div class="preview-layout"><aside class="preview-sidebar"></aside><main class="preview-stage"><span style="color:#ddd">Loading image…</span></main></div></div>`;
    const stage = $('.preview-stage', body), sidebar = $('.preview-sidebar', body);
    function paintSide() { sidebar.innerHTML = pictures.map(item => `<button class="preview-thumb ${item.path === current?.path ? 'active' : ''}" data-path="${esc(item.path)}"><img src="${imageURL(item.path)}" alt=""><span>${esc(item.name)}</span></button>`).join(''); }
    function show(item) { if (!item) { stage.innerHTML = `<div class="empty-state" style="color:#ddd">${icon('image')}<p>No images found in Pictures.</p></div>`; return; } current = item; zoom = 1; rotation = 0; stage.innerHTML = `<img class="preview-image" src="${imageURL(item.path)}" alt="${esc(item.name)}">`; $('.preview-name', body).textContent = item.name; $('.preview-download', body).href = imageURL(item.path); $('.preview-download', body).download = item.name; OS.setWindowTitle('preview', item.name); paintSide(); updateTransform(); }
    function updateTransform() { const image = $('.preview-image', body); if (image) image.style.transform = `scale(${zoom}) rotate(${rotation}deg)`; $('.zoom-label', body).textContent = `${Math.round(zoom * 100)}%`; }
    $('.zoom-in', body).addEventListener('click', () => { zoom = Math.min(4, zoom + .2); updateTransform(); });
    $('.zoom-out', body).addEventListener('click', () => { zoom = Math.max(.2, zoom - .2); updateTransform(); });
    $('.preview-rotate', body).addEventListener('click', () => { rotation = (rotation + 90) % 360; updateTransform(); });
    $('.preview-side', body).addEventListener('click', () => { sidebar.hidden = !sidebar.hidden; $('.preview-layout', body).style.gridTemplateColumns = sidebar.hidden ? '0 1fr' : '150px 1fr'; });
    sidebar.addEventListener('click', event => { const item = pictures.find(i => i.path === event.target.closest('.preview-thumb')?.dataset.path); if (item) show(item); });
    body._previewOpen = async path => { const item = pictures.find(i => i.path === path) || { path, name: path.split('/').pop() }; if (!pictures.some(i => i.path === path)) pictures.unshift(item); show(item); };
    try { const data = await OS.api('/api/fs/list?path=/Pictures'); pictures = data.items.filter(OS.isImage); show(pictures.find(i => i.path === options.path) || (options.path ? { path: options.path, name: options.path.split('/').pop() } : pictures[0])); } catch (e) { stage.textContent = e.message; }
  }

  /* Photos */
  async function renderPhotos(body) {
    let photos = [], selected = null;
    OS.state.preferences.favoritePhotos = OS.state.preferences.favoritePhotos || [];
    body.innerHTML = `<div class="photos-app"><div class="app-toolbar"><div class="segmented"><button class="active">Library</button><button class="photos-favorites">Favorites</button></div><span class="spacer"></span><button class="toolbar-button photos-favorite">${icon('heart')} Favorite</button><button class="toolbar-button photos-open">Open in Preview ${icon('chevron')}</button></div><header class="photos-header"><div><h2>Library</h2><p class="photos-subtitle">Your moments, beautifully organized</p></div><span class="spacer"></span></header><div class="photo-grid"></div></div>`;
    let favoritesOnly = false;
    function visible() { return favoritesOnly ? photos.filter(p => OS.state.preferences.favoritePhotos.includes(p.path)) : photos; }
    function paint() {
      const shown = visible();
      $('.photo-grid', body).innerHTML = shown.length ? shown.map(item => `<button class="photo-card ${selected === item.path ? 'selected' : ''}" data-path="${esc(item.path)}" style="${selected === item.path ? 'outline:3px solid var(--accent)' : ''}"><img src="${imageURL(item.path)}" alt="${esc(item.name)}" loading="lazy"><span class="photo-title">${esc(item.name.replace(/\.[^.]+$/, ''))}</span>${OS.state.preferences.favoritePhotos.includes(item.path) ? `<span class="favorite-mark">${icon('heart')}</span>` : ''}</button>`).join('') : `<div class="empty-state" style="grid-column:1/-1">${icon('photos')}<h3>${favoritesOnly ? 'No Favorites Yet' : 'No Photos'}</h3><p>${favoritesOnly ? 'Select a photo and choose Favorite.' : 'Add images to the Pictures folder.'}</p></div>`;
      $('.photos-subtitle', body).textContent = `${shown.length} photographs · Stored in Pictures`;
    }
    async function refresh() { try { photos = (await OS.api('/api/fs/list?path=/Pictures')).items.filter(OS.isImage); selected = photos[0]?.path || null; paint(); } catch (e) { OS.toast('Photos', e.message); } }
    function toggleFavorite() { if (!selected) return OS.toast('Photos', 'Select a photo first.'); const favs = OS.state.preferences.favoritePhotos; OS.state.preferences.favoritePhotos = favs.includes(selected) ? favs.filter(p => p !== selected) : [...favs, selected]; OS.save(); paint(); }
    $('.photo-grid', body).addEventListener('click', event => { const card = event.target.closest('.photo-card'); if (card) { selected = card.dataset.path; paint(); } });
    $('.photo-grid', body).addEventListener('dblclick', event => { const card = event.target.closest('.photo-card'); if (card) OS.openApp('preview', { path: card.dataset.path }); });
    $('.photos-open', body).addEventListener('click', () => selected ? OS.openApp('preview', { path: selected }) : OS.toast('Photos', 'Select a photo first.'));
    $('.photos-favorite', body).addEventListener('click', toggleFavorite);
    $$('.segmented button', body).forEach(button => button.addEventListener('click', () => { favoritesOnly = button.classList.contains('photos-favorites'); $$('.segmented button', body).forEach(b => b.classList.toggle('active', b === button)); paint(); }));
    await refresh();
  }

  /* Settings */
  function renderSettings(body, win, options) {
    let section = options.section || 'appearance';
    body.innerHTML = `<div class="settings-layout"><aside class="settings-sidebar"><div class="settings-user"><span class="settings-avatar">${icon('person')}</span><div><strong>OpenOS User</strong><small>Local Account</small></div></div>${[['appearance','Appearance','sun'],['wallpaper','Wallpaper','image'],['notifications','Notifications','info'],['about','About','monitor']].map(([id, name, glyph]) => `<button class="sidebar-item" data-section="${id}">${icon(glyph)}<span>${name}</span></button>`).join('')}</aside><main class="settings-content"></main></div>`;
    const content = $('.settings-content', body);
    function paint() {
      $$('.sidebar-item[data-section]', body).forEach(button => button.classList.toggle('active', button.dataset.section === section));
      OS.setWindowTitle('settings', section === 'about' ? 'About This Mac' : section[0].toUpperCase() + section.slice(1));
      if (section === 'appearance') paintAppearance();
      if (section === 'wallpaper') paintWallpaper();
      if (section === 'notifications') paintNotifications();
      if (section === 'about') paintAbout();
    }
    function changed() { OS.applySettings(); OS.save(); paint(); }
    function paintAppearance() {
      const settings = OS.state.settings;
      content.innerHTML = `<h2>Appearance</h2><div class="settings-group"><div class="setting-row"><label><strong>Appearance</strong><small>Choose how OpenOS looks.</small></label><div class="appearance-options">${['light','dark','auto'].map(theme => `<button class="appearance-choice ${theme} ${settings.theme === theme ? 'active' : ''}" data-theme="${theme}"><div class="appearance-preview"></div>${theme[0].toUpperCase() + theme.slice(1)}</button>`).join('')}</div></div><div class="setting-row"><label><strong>Accent color</strong><small>Buttons, selection, and highlights.</small></label><div class="accent-swatches">${[['blue','#0a7cff'],['purple','#9957e8'],['pink','#e64b83'],['red','#e43f38'],['orange','#ed832e'],['green','#30a14e'],['graphite','#697078']].map(([name, color]) => `<button class="accent-swatch ${settings.accent === name ? 'active' : ''}" data-accent="${name}" style="background:${color}" aria-label="${name}"></button>`).join('')}</div></div><div class="setting-row"><label><strong>Reduce motion</strong><small>Minimize window and Dock animations.</small></label><button class="switch ${settings.reduceMotion ? 'on' : ''}" data-setting="reduceMotion" role="switch" aria-checked="${!!settings.reduceMotion}"></button></div></div><div class="settings-group"><div class="setting-row"><label><strong>Server persistence</strong><small>Appearance settings are saved automatically.</small></label><span style="color:#30a14e;font-size:11px">On</span></div></div>`;
      $$('[data-theme]', content).forEach(button => button.addEventListener('click', () => { settings.theme = button.dataset.theme; changed(); }));
      $$('[data-accent]', content).forEach(button => button.addEventListener('click', () => { settings.accent = button.dataset.accent; changed(); }));
      $('[data-setting=reduceMotion]', content).addEventListener('click', () => { settings.reduceMotion = !settings.reduceMotion; changed(); });
    }
    function paintWallpaper() {
      content.innerHTML = `<h2>Wallpaper</h2><p style="color:var(--muted);font-size:11px;margin-top:-12px;margin-bottom:20px">Select a landscape for your desktop.</p><div class="wallpaper-grid">${[['aurora','Aurora'],['sequoia','Sequoia'],['dusk','Dusk'],['monterey','Monterey'],['graphite','Graphite'],['solar','Solar']].map(([id, name]) => `<button class="wallpaper-choice ${OS.state.settings.wallpaper === id ? 'active' : ''}" data-wallpaper="${id}"><div class="wallpaper-swatch"></div><span>${name}</span></button>`).join('')}</div>`;
      $$('[data-wallpaper]', content).forEach(button => button.addEventListener('click', () => { OS.state.settings.wallpaper = button.dataset.wallpaper; changed(); OS.toast('Wallpaper', `${$('span', button).textContent} applied.`); }));
    }
    function paintNotifications() {
      const prefs = OS.state.preferences;
      content.innerHTML = `<h2>Notifications</h2><div class="settings-group"><div class="setting-row"><label><strong>Allow notifications</strong><small>Show helpful OpenOS alerts.</small></label><button class="switch ${prefs.notifications !== false ? 'on' : ''}" data-pref="notifications"></button></div><div class="setting-row"><label><strong>Show previews</strong><small>Display message previews in alerts.</small></label><button class="switch ${prefs.previews !== false ? 'on' : ''}" data-pref="previews"></button></div></div><div class="settings-group"><div class="setting-row"><label><strong>Notes</strong><small>Save confirmations and tips.</small></label><span>Alerts</span></div><div class="setting-row"><label><strong>Calendar</strong><small>Upcoming event reminders.</small></label><span>Alerts</span></div></div>`;
      $$('[data-pref]', content).forEach(button => button.addEventListener('click', () => { prefs[button.dataset.pref] = button.classList.contains('on'); OS.save(); paint(); }));
    }
    function paintAbout() { content.innerHTML = `<div class="about-mac"><div class="about-mac-icon">${icon('apple')}</div><h2>OpenOS</h2><p>Version 1.0 · Browser Desktop</p><dl class="about-specs"><dt>Processor</dt><dd>Web-native JavaScript</dd><dt>Memory</dt><dd>A little room for big ideas</dd><dt>Startup disk</dt><dd>Macintosh HD</dd><dt>Storage</dt><dd>Server-backed workspace</dd><dt>Display</dt><dd>${innerWidth} × ${innerHeight} pixels</dd></dl><button class="secondary-button about-more">More Info</button><p style="margin-top:25px">Designed with care. Built without a frontend framework.<br>© 2026 OpenOS</p></div>`; $('.about-more', content).addEventListener('click', () => OS.confirm('OpenOS', 'Fourteen built-in apps\nEight-way window resizing\nSandboxed filesystem API\nAtomic server-side persistence\nNo third-party network requests', 'Done')); }
    body._settingsSection = next => { section = next || 'appearance'; paint(); };
    $$('.sidebar-item[data-section]', body).forEach(button => button.addEventListener('click', () => { section = button.dataset.section; paint(); }));
    paint();
  }

  /* Clock */
  function renderClock(body) {
    let tab = 'world', stopwatchStart = 0, elapsed = 0, running = false;
    body.innerHTML = `<div class="clock-app"><nav class="clock-tabs"><button class="active" data-clock-tab="world">World Clock</button><button data-clock-tab="stopwatch">Stopwatch</button></nav><div class="world-clocks"></div><div class="stopwatch-wrap" hidden><div class="stopwatch-time">00:00.00</div><div class="stopwatch-controls"><button class="round-button stopwatch-reset">Reset</button><button class="round-button go stopwatch-toggle">Start</button></div></div></div>`;
    const zones = [['Cupertino','America/Los_Angeles'],['New York','America/New_York'],['London','Europe/London'],['Tokyo','Asia/Tokyo']];
    function paintWorld() {
      $('.world-clocks', body).innerHTML = zones.map(([city, zone]) => { const time = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: false }).format(new Date()); const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date()); const val = type => Number(parts.find(p => p.type === type)?.value || 0); const h = val('hour'), m = val('minute'), s = val('second'); return `<div class="world-clock"><div class="analog-clock"><i class="clock-hand" style="transform:rotate(${(h % 12 + m / 60) * 30}deg)"></i><i class="clock-hand minute" style="transform:rotate(${(m + s / 60) * 6}deg)"></i><i class="clock-hand second" style="transform:rotate(${s * 6}deg)"></i></div><div class="world-clock-info"><small>${zone.split('/')[0].replace('_',' ')}</small><strong>${city}</strong></div><time class="world-clock-time">${time}</time></div>`; }).join('');
    }
    function stopwatchText() { const total = elapsed + (running ? performance.now() - stopwatchStart : 0), minutes = Math.floor(total / 60000), seconds = Math.floor(total / 1000) % 60, hundredths = Math.floor(total / 10) % 100; return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(hundredths).padStart(2,'0')}`; }
    let lastWorldSecond = -1;
    const timer = setInterval(() => { const second = Math.floor(Date.now() / 1000); if (tab === 'world' && second !== lastWorldSecond) { lastWorldSecond = second; paintWorld(); } else if (tab === 'stopwatch' && running) $('.stopwatch-time', body).textContent = stopwatchText(); }, 31);
    $$('.clock-tabs button', body).forEach(button => button.addEventListener('click', () => { tab = button.dataset.clockTab; $$('.clock-tabs button', body).forEach(b => b.classList.toggle('active', b === button)); $('.world-clocks', body).hidden = tab !== 'world'; $('.stopwatch-wrap', body).hidden = tab !== 'stopwatch'; if (tab === 'world') paintWorld(); }));
    $('.stopwatch-toggle', body).addEventListener('click', () => { if (running) { elapsed += performance.now() - stopwatchStart; running = false; } else { stopwatchStart = performance.now(); running = true; } $('.stopwatch-toggle', body).textContent = running ? 'Stop' : 'Start'; $('.stopwatch-toggle', body).className = `round-button stopwatch-toggle ${running ? 'stop' : 'go'}`; $('.stopwatch-reset', body).textContent = running ? 'Lap' : 'Reset'; });
    $('.stopwatch-reset', body).addEventListener('click', () => { if (running) return OS.toast('Stopwatch', `Lap ${stopwatchText()}`); elapsed = 0; $('.stopwatch-time', body).textContent = '00:00.00'; });
    body._cleanup = () => clearInterval(timer); paintWorld();
  }

  /* Contacts */
  function renderContacts(body) {
    const defaults = [
      { id: 'maya', name: 'Maya Chen', company: 'Northstar Studio', email: 'maya@northstar.example', phone: '(415) 555-0138', notes: 'Product designer. Loves good coffee and clear systems.' },
      { id: 'alex', name: 'Alex Morgan', company: 'OpenOS', email: 'alex@openos.local', phone: '(415) 555-0184', notes: 'Engineering · San Francisco' },
      { id: 'sofia', name: 'Sofia Rivera', company: 'Field Notes', email: 'sofia@fieldnotes.example', phone: '(510) 555-0162', notes: 'Writer and photographer.' },
      { id: 'james', name: 'James Wilson', company: 'Independent', email: 'james@example.com', phone: '(628) 555-0119', notes: 'Met at the design systems meetup.' },
      { id: 'nina', name: 'Nina Park', company: 'Daylight Labs', email: 'nina@daylight.example', phone: '(650) 555-0197', notes: 'Research and prototyping.' }
    ];
    if (!OS.state.contacts.length) OS.state.contacts = defaults;
    let selectedId = OS.state.contacts[0]?.id, query = '', editing = false;
    body.innerHTML = `<div class="app-shell"><div class="app-toolbar"><button class="toolbar-button contacts-add">${icon('plus')} New Contact</button><span class="spacer"></span><input class="toolbar-search contacts-search" placeholder="Search" aria-label="Search contacts"></div><div class="contacts-layout"><section class="contacts-list-pane"><div class="contacts-list"></div></section><main class="contact-detail"></main></div></div>`;
    const contact = () => OS.state.contacts.find(c => c.id === selectedId);
    function paintList() { const shown = OS.state.contacts.filter(c => `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(query.toLowerCase())); $('.contacts-list', body).innerHTML = shown.map((c, index) => `<button class="contact-list-item ${c.id === selectedId ? 'active' : ''}" data-id="${c.id}"><span class="contact-avatar" style="background:${colors[index % colors.length]}">${initials(c.name)}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.company || '')}</small></span></button>`).join('') || '<div class="empty-state"><p>No contacts found.</p></div>'; }
    function paintDetail() {
      editing = false; const c = contact(), detail = $('.contact-detail', body);
      if (!c) { detail.innerHTML = `<div class="empty-state">${icon('contacts')}<p>Select a contact.</p></div>`; return; }
      detail.innerHTML = `<div class="contact-detail-top"><div class="contact-detail-avatar" style="background:${colors[OS.state.contacts.indexOf(c) % colors.length]}">${initials(c.name)}</div><h2>${esc(c.name)}</h2><p>${esc(c.company || 'Contact')}</p><div class="contact-actions"><button class="contact-action" data-contact-action="message"><span>${icon('mail')}</span>Message</button><button class="contact-action" data-contact-action="call"><span>${icon('phone')}</span>Call</button><button class="contact-action" data-contact-action="video"><span>${icon('video')}</span>Video</button><button class="contact-action" data-contact-action="edit"><span>${icon('compose')}</span>Edit</button></div></div><div class="contact-info"><div class="contact-info-row"><small>phone</small><span>${esc(c.phone || 'Not provided')}</span></div><div class="contact-info-row"><small>email</small><span>${esc(c.email || 'Not provided')}</span></div><div class="contact-info-row"><small>notes</small><span>${esc(c.notes || 'No notes')}</span></div></div>`;
      $$('[data-contact-action]', detail).forEach(button => button.addEventListener('click', () => { const action = button.dataset.contactAction; if (action === 'edit') editContact(c); else if (action === 'message') OS.openApp('mail', { compose: { to: c.email, subject: `Hello ${c.name.split(' ')[0]}` } }); else OS.toast('Contacts', `${action === 'call' ? 'Calling' : 'Starting FaceTime with'} ${c.name}…`); }));
    }
    function editContact(c, isNew = false) {
      editing = true; const detail = $('.contact-detail', body);
      detail.innerHTML = `<form class="contact-edit-form"><h2>${isNew ? 'New Contact' : 'Edit Contact'}</h2>${[['name','Name'],['company','Company'],['phone','Phone'],['email','Email'],['notes','Notes']].map(([key,label]) => `<div class="field"><label>${label}</label><input name="${key}" value="${esc(c[key] || '')}" ${key === 'name' ? 'required' : ''}></div>`).join('')}<div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="secondary-button contact-cancel">Cancel</button><button class="primary-button" type="submit">Save Contact</button></div></form>`;
      $('form', detail).addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); for (const key of ['name','company','phone','email','notes']) c[key] = data.get(key).trim(); if (isNew) { c.id = uniqueId(); OS.state.contacts.push(c); selectedId = c.id; } OS.save(); paintList(); paintDetail(); OS.toast('Contacts', 'Contact saved.'); });
      $('.contact-cancel', detail).addEventListener('click', paintDetail);
    }
    $('.contacts-list', body).addEventListener('click', event => { const button = event.target.closest('.contact-list-item'); if (button) { selectedId = button.dataset.id; paintList(); paintDetail(); } });
    $('.contacts-add', body).addEventListener('click', () => editContact({ name: '', company: '', phone: '', email: '', notes: '' }, true));
    $('.contacts-search', body).addEventListener('input', event => { query = event.target.value; paintList(); });
    paintList(); paintDetail();
  }

  /* Music */
  function renderMusic(body) {
    const tracks = [
      { title: 'Aurora', artist: 'Northern Lines', album: 'Places in Light', duration: 224, art: 'aurora', notes: [220,277.18,329.63,440] },
      { title: 'Golden Hour', artist: 'Northern Lines', album: 'Places in Light', duration: 196, art: 'golden', notes: [261.63,329.63,392,523.25] },
      { title: 'Pacific', artist: 'Coastal', album: 'Open Water', duration: 242, art: 'coast', notes: [196,246.94,293.66,392] },
      { title: 'After the Rain', artist: 'Coastal', album: 'Open Water', duration: 208, art: 'coast', notes: [174.61,220,261.63,349.23] },
      { title: 'Night Drive', artist: 'Parallel', album: 'Midnight Cities', duration: 253, art: 'midnight', notes: [164.81,207.65,246.94,329.63] },
      { title: 'First Light', artist: 'Parallel', album: 'Midnight Cities', duration: 187, art: 'aurora', notes: [246.94,311.13,369.99,493.88] }
    ];
    let index = Number(OS.state.preferences.musicTrack || 0), playing = false, progress = 0, audioCtx = null, master = null, noteTimer = null, noteStep = 0;
    body.innerHTML = `<div class="music-app"><aside class="music-sidebar"><h3>Music</h3><div class="sidebar-section">Library</div><button class="sidebar-item active">${icon('music')} Songs <span class="count">${tracks.length}</span></button><button class="sidebar-item">${icon('clock')} Recently Played</button><button class="sidebar-item">${icon('heart')} Favorites</button><div class="sidebar-section">Playlists</div><button class="sidebar-item">${icon('list')} Quiet Mornings</button><button class="sidebar-item">${icon('list')} Focus</button></aside><main class="music-main"><h2>Listen Now</h2><div class="album-hero"><div class="album-art art-aurora"></div><div class="album-info"><small>Featured album</small><h3>Places in Light</h3><p>Northern Lines · 2026</p><p>Warm synths, open spaces, and a little room to breathe.</p><button class="primary-button music-feature-play">${icon('play')} Play</button></div></div><div class="track-list">${tracks.map((track, i) => `<div class="track-row" data-track="${i}"><span class="track-number">${i + 1}</span><strong>${esc(track.title)}</strong><span class="track-artist">${esc(track.artist)}</span><span class="track-time">${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2,'0')}</span></div>`).join('')}</div></main><footer class="now-playing"><div class="now-track"><div class="album-art small art-aurora now-art"></div><div style="min-width:0"><strong class="now-title"></strong><small class="now-artist"></small></div></div><div class="player-center"><div class="player-buttons"><button class="music-prev">${icon('prev')}</button><button class="play-button music-toggle">${icon('play')}</button><button class="music-next">${icon('next')}</button></div><div class="player-progress"><i></i></div></div><div class="volume-control">${icon('volume')}<input type="range" min="0" max="100" value="18" aria-label="Volume"></div></footer></div>`;
    function note() {
      if (!playing || !audioCtx) return;
      const track = tracks[index], frequency = track.notes[noteStep++ % track.notes.length] * (noteStep % 8 === 0 ? 2 : 1);
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); osc.type = noteStep % 3 ? 'sine' : 'triangle'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(.12, audioCtx.currentTime + .08); gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + 1.3); osc.connect(gain); gain.connect(master); osc.start(); osc.stop(audioCtx.currentTime + 1.4);
    }
    function paint() { const track = tracks[index]; $('.now-title', body).textContent = track.title; $('.now-artist', body).textContent = `${track.artist} — ${track.album}`; $('.now-art', body).className = `album-art small now-art art-${track.art}`; $('.music-toggle use', body).setAttribute('href', playing ? '#i-pause' : '#i-play'); $$('.track-row', body).forEach((row, i) => { row.classList.toggle('playing', i === index); $('.track-number', row).innerHTML = i === index && playing ? icon('volume') : String(i + 1); }); }
    async function toggle() {
      playing = !playing;
      if (playing) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); master = master || audioCtx.createGain(); if (!master.numberOfOutputs) master = audioCtx.createGain(); if (!audioCtx._openosConnected) { master.connect(audioCtx.destination); audioCtx._openosConnected = true; } master.gain.value = Number($('.volume-control input', body).value) / 500; await audioCtx.resume(); note(); clearInterval(noteTimer); noteTimer = setInterval(note, 650); } catch { playing = false; OS.toast('Music', 'Audio is not available in this browser.'); } } else clearInterval(noteTimer);
      paint();
    }
    function selectTrack(i) { index = (i + tracks.length) % tracks.length; progress = 0; OS.state.preferences.musicTrack = index; OS.save(); if (playing) noteStep = 0; paint(); }
    const progressTimer = setInterval(() => { if (playing) { progress += 1; if (progress >= tracks[index].duration) selectTrack(index + 1); $('.player-progress i', body).style.width = `${progress / tracks[index].duration * 100}%`; } }, 1000);
    $('.music-toggle', body).addEventListener('click', toggle); $('.music-feature-play', body).addEventListener('click', () => { selectTrack(0); if (!playing) toggle(); });
    $('.track-list', body).addEventListener('dblclick', event => { const row = event.target.closest('.track-row'); if (row) { selectTrack(Number(row.dataset.track)); if (!playing) toggle(); } });
    $('.track-list', body).addEventListener('click', event => { const row = event.target.closest('.track-row'); if (row) selectTrack(Number(row.dataset.track)); });
    $('.music-next', body).addEventListener('click', () => selectTrack(index + 1)); $('.music-prev', body).addEventListener('click', () => selectTrack(index - 1));
    $('.volume-control input', body).addEventListener('input', event => { if (master) master.gain.value = Number(event.target.value) / 500; });
    body._cleanup = () => { clearInterval(progressTimer); clearInterval(noteTimer); if (audioCtx) audioCtx.close().catch(() => {}); }; paint();
  }

  /* Mail */
  function renderMail(body, win, options) {
    const seed = [
      { id:'m1', folder:'inbox', from:'Maya Chen', email:'maya@northstar.example', subject:'Design review notes', preview:'The latest direction feels wonderfully calm. I left a few thoughts on spacing and motion…', body:'Hi,\n\nThe latest direction feels wonderfully calm. I left a few thoughts on spacing and motion in our shared document. The new wallpaper is a favorite.\n\nCould we walk through the window interactions tomorrow at 10?\n\nBest,\nMaya', date:'9:42 AM' },
      { id:'m2', folder:'inbox', from:'OpenOS Team', email:'hello@openos.local', subject:'Welcome to your new desktop', preview:'Everything you need is already here. Press Command-Space to get started…', body:'Welcome to OpenOS.\n\nEverything you need is already here. Press Command-Space to open Spotlight, find an app, and press Return.\n\nYour files, notes, events, settings, and windows are saved on the server. We hope you feel at home.', date:'8:15 AM' },
      { id:'m3', folder:'inbox', from:'Alex Morgan', email:'alex@openos.local', subject:'A small idea for Friday', preview:'What if we took the scenic route and worked from the coast this Friday?', body:'Hey,\n\nWhat if we took the scenic route and worked from the coast this Friday? The forecast looks clear, and the studio has excellent coffee.\n\nAlex', date:'Yesterday' },
      { id:'m4', folder:'inbox', from:'Calendar', email:'calendar@openos.local', subject:'Reminder: Design review', preview:'Design review is tomorrow at 10:00 AM.', body:'Design review\nTomorrow at 10:00 AM\n\nBring the latest prototype and any open questions.', date:'Yesterday' },
      { id:'m5', folder:'archive', from:'Sofia Rivera', email:'sofia@fieldnotes.example', subject:'Photographs from Point Reyes', preview:'A few frames from our weekend walk. The light was unreal.', body:'Hi!\n\nA few frames from our weekend walk. The light was unreal. You can find the full set in the Pictures folder.\n\nSofia', date:'Nov 21' },
      { id:'m6', folder:'archive', from:'Northstar Studio', email:'studio@northstar.example', subject:'November studio digest', preview:'Notes on making digital spaces feel more human.', body:'This month: notes on making digital spaces feel more human, a field guide to calm software, and three typefaces we keep coming back to.', date:'Nov 18' }
    ];
    OS.state.preferences.mailSent = OS.state.preferences.mailSent || [];
    OS.state.preferences.mailRead = OS.state.preferences.mailRead || [];
    let messages = [...seed, ...OS.state.preferences.mailSent], folder = 'inbox', selectedId = null;
    body.innerHTML = `<div class="mail-app"><aside class="mail-mailboxes"><button class="primary-button mail-compose-button" style="width:100%;margin-bottom:15px">${icon('compose')} New Message</button>${[['inbox','Inbox','mail'],['sent','Sent','send'],['archive','Archive','folder']].map(([id,name,glyph]) => `<button class="sidebar-item ${id === folder ? 'active' : ''}" data-folder="${id}">${icon(glyph)} ${name}${id === 'inbox' ? '<span class="badge" style="margin-left:auto">3</span>' : ''}</button>`).join('')}</aside><section class="mail-list-pane"><div class="app-toolbar"><input class="toolbar-search mail-search" placeholder="Search mail" style="width:100%"></div><div class="mail-list"></div></section><main class="mail-message"><div class="empty-state">${icon('mail')}<h3>No Message Selected</h3><p>Choose a message to read it here.</p></div></main></div>`;
    function visibleMessages() { const query = $('.mail-search', body)?.value.toLowerCase() || ''; return messages.filter(m => m.folder === folder && `${m.from} ${m.subject} ${m.preview}`.toLowerCase().includes(query)); }
    function paintList() { const shown = visibleMessages(); $('.mail-list', body).innerHTML = shown.map(m => `<button class="mail-list-item ${m.id === selectedId ? 'active' : ''} ${!OS.state.preferences.mailRead.includes(m.id) && m.folder === 'inbox' ? 'unread' : ''}" data-id="${m.id}" style="width:100%;text-align:left"><time>${esc(m.date)}</time><strong>${esc(m.from)}</strong><h4>${esc(m.subject)}</h4><p>${esc(m.preview)}</p></button>`).join('') || '<div class="empty-state" style="padding-top:45px"><p>No messages in this mailbox.</p></div>'; }
    function select(id) { const m = messages.find(item => item.id === id); if (!m) return; selectedId = id; if (!OS.state.preferences.mailRead.includes(id)) { OS.state.preferences.mailRead.push(id); OS.save(); } paintList(); $('.mail-message', body).innerHTML = `<header class="mail-message-header"><h2>${esc(m.subject)}</h2><div class="mail-sender"><span class="contact-avatar" style="background:${colors[m.from.length % colors.length]}">${initials(m.from)}</span><div><strong>${esc(m.from)} &lt;${esc(m.email)}&gt;</strong><small>To: OpenOS User · ${esc(m.date)}</small></div></div></header><article class="mail-message-body">${esc(m.body).replace(/\n/g,'<br>')}</article>`; }
    function compose(prefill = {}) {
      if ($('.mail-compose', body)) return;
      const form = document.createElement('form'); form.className = 'mail-compose'; form.innerHTML = `<header class="compose-header">New Message<button type="button" class="toolbar-button compose-close">${icon('close')}</button></header><div class="compose-fields"><input name="to" placeholder="To" value="${esc(prefill.to || '')}" required><input name="subject" placeholder="Subject" value="${esc(prefill.subject || '')}" required></div><textarea class="compose-body" name="body" placeholder="Write a message…" required></textarea><footer class="compose-footer"><button class="primary-button" type="submit">${icon('send')} Send</button></footer>`;
      body.append(form); $('[name=to]', form).focus();
      $('.compose-close', form).addEventListener('click', () => form.remove());
      form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form), sent = { id: uniqueId(), folder:'sent', from:'OpenOS User', email:'me@openos.local', subject:data.get('subject'), preview:String(data.get('body')).slice(0,100), body:data.get('body'), to:data.get('to'), date:'Now' }; OS.state.preferences.mailSent.push(sent); messages.push(sent); OS.save(); form.remove(); folder = 'sent'; $$('.mail-mailboxes .sidebar-item', body).forEach(b => b.classList.toggle('active', b.dataset.folder === folder)); selectedId = sent.id; paintList(); select(sent.id); OS.toast('Mail', `Message sent to ${sent.to}.`); });
    }
    body._mailCompose = compose;
    $('.mail-compose-button', body).addEventListener('click', () => compose());
    $$('.mail-mailboxes [data-folder]', body).forEach(button => button.addEventListener('click', () => { folder = button.dataset.folder; selectedId = null; $$('.mail-mailboxes [data-folder]', body).forEach(b => b.classList.toggle('active', b === button)); paintList(); }));
    $('.mail-list', body).addEventListener('click', event => { const item = event.target.closest('.mail-list-item'); if (item) select(item.dataset.id); });
    $('.mail-search', body).addEventListener('input', paintList);
    paintList(); const first = visibleMessages()[0]; if (first) select(first.id); if (options.compose) compose(options.compose);
  }

  /* Terminal */
  function renderTerminal(body) {
    let cwd = '/', history = [], historyIndex = 0, busy = false;
    body.innerHTML = `<div class="terminal-app"><div class="terminal-output" aria-live="polite"></div><form class="terminal-input-row"><span class="terminal-prompt">openos:~ %</span><input class="terminal-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal command"></form></div>`;
    const output = $('.terminal-output', body), input = $('.terminal-input', body);
    function print(text = '', cls = '') { const line = document.createElement('div'); line.className = `terminal-line ${cls}`; line.textContent = text; output.append(line); output.scrollTop = output.scrollHeight; }
    function resolve(arg = '.') { let base = arg.startsWith('/') ? [] : cwd.split('/').filter(Boolean); for (const part of arg.split('/')) { if (!part || part === '.') continue; if (part === '..') base.pop(); else base.push(part); } return '/' + base.join('/'); }
    function parse(command) { return command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(s => s.replace(/^['"]|['"]$/g,'')) || []; }
    async function execute(command) {
      const [cmd, ...args] = parse(command), arg = args.join(' ');
      if (!cmd) return;
      try {
        switch (cmd) {
          case 'help': print('OpenOS Shell — sandboxed commands\n\n  ls [path]       list files\n  cd [path]       change folder\n  pwd             print working folder\n  cat <file>      read a text file\n  mkdir <folder>  create a folder\n  touch <file>    create an empty text file\n  rm <path>       move an item to Trash\n  open <app>      open an OpenOS app\n  echo <text>     print text\n  date            show the current date\n  history         show command history\n  whoami          print current user\n  uname           print system name\n  clear           clear the terminal\n  about           about this shell'); break;
          case 'pwd': print(cwd); break;
          case 'ls': { const target = resolve(args[0] || cwd), data = await OS.api(`/api/fs/list?path=${encodeURIComponent(target)}`); data.items.forEach(item => print(`${item.isDirectory ? 'drwxr-xr-x' : '-rw-r--r--'}  ${String(item.size).padStart(8)}  ${item.name}${item.isDirectory ? '/' : ''}`)); if (!data.items.length) print('(empty folder)', 'muted'); break; }
          case 'cd': { const target = resolve(args[0] || '/'); const data = await OS.api(`/api/fs/list?path=${encodeURIComponent(target)}`); cwd = data.path; break; }
          case 'cat': { if (!args[0]) return print('usage: cat <file>', 'error'); const data = await OS.api(`/api/fs/file?path=${encodeURIComponent(resolve(args[0]))}`); print(data.content); break; }
          case 'mkdir': { if (!args[0]) return print('usage: mkdir <folder>', 'error'); const target = resolve(args[0]); await OS.api('/api/fs/mkdir', { method:'POST', body:{ path:target } }); print(`Created ${target}`, 'success'); break; }
          case 'touch': { if (!args[0]) return print('usage: touch <file>', 'error'); const target = resolve(args[0]); await OS.api('/api/fs/write', { method:'POST', body:{ path:target, content:'' } }); print(`Created ${target}`, 'success'); break; }
          case 'rm': { if (!args[0]) return print('usage: rm <path>  (moves to Trash)', 'error'); const target = resolve(args[0]); await OS.api('/api/fs/trash', { method:'POST', body:{ path:target } }); print(`Moved ${target} to Trash`, 'success'); break; }
          case 'echo': print(arg); break;
          case 'date': print(new Date().toString()); break;
          case 'whoami': print('openos'); break;
          case 'uname': print('OpenOS 1.0 browser x86_64'); break;
          case 'history': history.forEach((line, i) => print(`${String(i + 1).padStart(4)}  ${line}`)); break;
          case 'clear': output.innerHTML = ''; break;
          case 'about': print('OpenOS Shell 1.0\nA safe, browser-side command interpreter. No host shell access.'); break;
          case 'open': { const name = args.join(' ').toLowerCase(), app = [...OS.apps.values()].find(a => a.id === name || a.name.toLowerCase() === name || a.name.toLowerCase().includes(name)); if (!app) return print(`open: application not found: ${arg}`, 'error'); OS.openApp(app.id); print(`Opening ${app.name}…`, 'success'); break; }
          default: print(`openos: command not found: ${cmd}\nType “help” for available commands.`, 'error');
        }
      } catch (e) { print(e.message, 'error'); }
    }
    print('Last login: ' + new Date().toLocaleString() + ' on ttys001', 'muted'); print('Welcome to OpenOS Shell. Type “help” to get started.\n');
    $('.terminal-input-row', body).addEventListener('submit', async event => { event.preventDefault(); if (busy) return; const command = input.value; input.value = ''; print(`${cwd === '/' ? '~' : cwd} % ${command}`); if (command.trim()) { history.push(command); historyIndex = history.length; } busy = true; await execute(command.trim()); busy = false; $('.terminal-prompt', body).textContent = `openos:${cwd === '/' ? '~' : cwd} %`; input.focus(); });
    input.addEventListener('keydown', event => { if (event.key === 'ArrowUp') { event.preventDefault(); historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex] || ''; } if (event.key === 'ArrowDown') { event.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = history[historyIndex] || ''; } if (event.key === 'l' && event.ctrlKey) { event.preventDefault(); output.innerHTML = ''; } });
    $('.terminal-app', body).addEventListener('click', () => { if (!getSelection().toString()) input.focus(); }); setTimeout(() => input.focus(), 100);
  }

  /* TextEdit */
  async function renderTextEdit(body, win, options) {
    let filePath = null, dirty = false;
    body.innerHTML = `<div class="textedit-app"><div class="app-toolbar"><button class="toolbar-button textedit-new">${icon('plus')} New</button><button class="toolbar-button textedit-open">Open…</button><button class="primary-button textedit-save">Save</button><span class="spacer"></span><input class="textedit-filename" value="Untitled.txt" aria-label="Document name"></div><div class="textedit-toolbar"><button class="format-button" data-format="bold" title="Bold"><b>B</b></button><button class="format-button" data-format="italic" title="Italic"><i>I</i></button><button class="format-button" data-format="underline" title="Underline"><u>U</u></button><span style="width:8px"></span><button class="format-button" data-format="insertUnorderedList" title="Bulleted list">• List</button><select class="toolbar-button textedit-size" aria-label="Font size"><option value="3">13 pt</option><option value="4">16 pt</option><option value="5">20 pt</option></select></div><div class="textedit-document-wrap"><div class="textedit-document" contenteditable="true" role="textbox" aria-label="Text document" spellcheck="true"></div></div><footer class="textedit-status"><span class="textedit-save-status">New document</span><span class="textedit-word-count">0 words</span></footer></div>`;
    const editor = $('.textedit-document', body), filename = $('.textedit-filename', body);
    function status() { const text = editor.innerText.trim(); $('.textedit-word-count', body).textContent = `${text ? text.split(/\s+/).length : 0} words`; $('.textedit-save-status', body).textContent = dirty ? 'Edited — not saved' : filePath ? `Saved to ${filePath}` : 'New document'; $('.textedit-save-status', body).classList.toggle('textedit-unsaved', dirty); OS.setWindowTitle('textedit', `${dirty ? '● ' : ''}${filename.value || 'Untitled.txt'}`); }
    function markDirty() { dirty = true; status(); }
    async function open(path) { try { const data = await OS.api(`/api/fs/file?path=${encodeURIComponent(path)}`); filePath = data.path; filename.value = data.name; editor.innerText = data.content; dirty = false; status(); } catch (e) { OS.toast('TextEdit', e.message); } }
    async function save() {
      let name = filename.value.trim() || 'Untitled.txt'; if (!/\.[a-z0-9]+$/i.test(name)) name += '.txt';
      if (!filePath) { const entered = await OS.prompt('Save document as', name, 'The document will be saved in Documents.'); if (!entered) return; name = entered; filePath = `/Documents/${name}`; }
      else filePath = `${filePath.split('/').slice(0,-1).join('/')}/${name}`;
      try { await OS.api('/api/fs/write', { method:'POST', body:{ path:filePath, content:editor.innerText } }); filename.value = name; dirty = false; status(); OS.toast('TextEdit', `Saved “${name}” to ${filePath.split('/').slice(0,-1).join('/')}.`); } catch (e) { OS.toast('TextEdit', e.message); }
    }
    body._textOpen = open;
    editor.addEventListener('input', markDirty); filename.addEventListener('input', markDirty);
    $('.textedit-save', body).addEventListener('click', save);
    $('.textedit-new', body).addEventListener('click', () => { filePath = null; filename.value = 'Untitled.txt'; editor.innerHTML = ''; dirty = false; status(); editor.focus(); });
    $('.textedit-open', body).addEventListener('click', async () => { const path = await OS.prompt('Open document', filePath || '/Documents/Welcome.txt', 'Enter a path inside Macintosh HD.'); if (path) open(path); });
    $$('[data-format]', body).forEach(button => button.addEventListener('click', () => { editor.focus(); document.execCommand(button.dataset.format, false); markDirty(); }));
    $('.textedit-size', body).addEventListener('change', event => { editor.focus(); document.execCommand('fontSize', false, event.target.value); markDirty(); });
    body.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); } });
    if (options.path) await open(options.path); else status();
  }

  const definitions = [
    ['finder', 'Finder', 'Browse files and folders on Macintosh HD.', 860, 560, renderFinder, async (body, win, options) => { if (options.path && body._openPath) await body._openPath(options.path, options.newFolder); }],
    ['trash', 'Trash', 'Restore or permanently delete items.', 650, 440, renderTrash, async body => body._refresh?.()],
    ['notes', 'Notes', 'Your thoughts, saved automatically.', 790, 520, renderNotes, (body, win, options) => { if (options.newNote) body._newNote?.(); }],
    ['calendar', 'Calendar', 'Month view and server-persisted events.', 880, 610, renderCalendar],
    ['weather', 'Weather', 'A calm local forecast for San Francisco.', 500, 650, renderWeather],
    ['calculator', 'Calculator', 'A familiar four-function calculator.', 320, 440, renderCalculator],
    ['preview', 'Preview', 'View real images from your workspace.', 850, 570, renderPreview, async (body, win, options) => { if (options.path) await body._previewOpen?.(options.path); }],
    ['settings', 'System Settings', 'Appearance, wallpaper, and system details.', 780, 580, renderSettings, (body, win, options) => body._settingsSection?.(options.section)],
    ['clock', 'Clock', 'World clocks and a precise stopwatch.', 580, 470, renderClock],
    ['contacts', 'Contacts', 'People, details, and quick actions.', 760, 520, renderContacts],
    ['music', 'Music', 'A small generative listening room.', 800, 580, renderMusic],
    ['mail', 'Mail', 'A tidy demonstration mailbox.', 930, 570, renderMail, (body, win, options) => { if (options.compose) body._mailCompose?.(options.compose); }],
    ['photos', 'Photos', 'Your server-side picture library.', 820, 560, renderPhotos],
    ['terminal', 'Terminal', 'A safe, sandboxed OpenOS shell.', 700, 450, renderTerminal],
    ['textedit', 'TextEdit', 'Create, format, and save text documents.', 780, 570, renderTextEdit, async (body, win, options) => { if (options.path) await body._textOpen?.(options.path); }]
  ];
  const minSizes = { calculator: [290, 400], weather: [360, 460], terminal: [420, 280], notes: [550, 350], calendar: [580, 440], mail: [650, 400], settings: [600, 420], music: [590, 430], contacts: [540, 380] };
  for (const [id, name, description, width, height, render, reopen] of definitions) {
    OS.register(id, { name, description, width, height, minWidth: minSizes[id]?.[0] || 350, minHeight: minSizes[id]?.[1] || 260, render, reopen, cleanup: sharedCleanup });
  }
};
