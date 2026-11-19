/* Preview — renders real image files from the filesystem, zoom/rotate,
 * sidebar thumbnails of sibling images. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';

export function mountPreview(win, payload) {
  const state = {
    path: payload.path || null,
    siblings: [],
    zoom: 1,
    rot: 0,
    showThumbs: payload.showThumbs !== false,
    dataURL: null,
  };
  win.__previewState = state;

  win.body.innerHTML = `
    <div class="preview-root">
      <div class="preview-toolbar">
        <button class="ftb-btn" id="${win.id}-thumbs" aria-label="Toggle sidebar" title="Sidebar">${icon('sidebarT', 14)}</button>
        <span class="preview-zoom" id="${win.id}-zlabel" style="margin-left:6px">100%</span>
        <button class="ftb-btn" id="${win.id}-zout" aria-label="Zoom out">${icon('zoomOut', 13)}</button>
        <button class="ftb-btn" id="${win.id}-zin" aria-label="Zoom in">${icon('zoomIn', 13)}</button>
        <button class="ftb-btn" id="${win.id}-fit" aria-label="Fit to window">${icon('fit', 13)}</button>
        <button class="ftb-btn" id="${win.id}-rot" aria-label="Rotate">${icon('rotate', 13)}</button>
        <span style="margin-left:auto;font-size:12.5px;color:var(--text-2)" id="${win.id}-fname"></span>
      </div>
      <div class="preview-body">
        <div class="preview-thumbs" id="${win.id}-thumbs-panel"></div>
        <div class="preview-canvas" id="${win.id}-canvas">
          <img id="${win.id}-img" alt="Preview image">
        </div>
      </div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  async function load() {
    if (!state.path) {
      $(`#${win.id}-canvas`).innerHTML = `<div class="empty-state" style="color:#ccc">Open an image from Finder, Photos, or the Desktop</div>`;
      return;
    }
    try {
      state.dataURL = await api.fs.readDataURL(state.path);
      $(`#${win.id}-img`).src = state.dataURL;
      $(`#${win.id}-fname`).textContent = state.path.split('/').pop();
      win.setTitle(`${state.path.split('/').pop()} — Preview`);
      await loadSiblings();
      applyZoom();
    } catch (e) {
      toast({ title: 'Cannot open image', body: e.message, app: 'preview' });
    }
  }

  async function loadSiblings() {
    const dir = state.path.replace(/\/[^/]+$/, '');
    try {
      const r = await api.fs.list(dir);
      state.siblings = r.entries.filter((e) => e.kind === 'image');
    } catch { state.siblings = []; }
    const panel = $(`#${win.id}-thumbs-panel`);
    panel.innerHTML = state.siblings.map((s) => {
      const p = `${dir}/${s.name}`;
      const sel = p === state.path ? 'selected' : '';
      return `<div class="pt-thumb ${sel}" data-path="${escapeHTML(p)}" title="${escapeHTML(s.name)}"><img data-src="${escapeHTML(p)}" alt=""></div>`;
    }).join('');
    for (const t of panel.querySelectorAll('.pt-thumb')) {
      t.addEventListener('click', () => { state.path = t.dataset.path; state.zoom = 1; state.rot = 0; load(); win.save(); });
      api.fs.readDataURL(t.dataset.path).then((u) => { const img = t.querySelector('img'); if (img) img.src = u; }).catch(() => {});
    }
    panel.style.display = state.showThumbs ? '' : 'none';
  }

  function applyZoom() {
    const img = $(`#${win.id}-img`);
    img.style.transform = `scale(${state.zoom}) rotate(${state.rot}deg)`;
    $(`#${win.id}-zlabel`).textContent = Math.round(state.zoom * 100) + '%';
  }

  $(`#${win.id}-zin`).addEventListener('click', () => { state.zoom = Math.min(5, state.zoom * 1.25); applyZoom(); });
  $(`#${win.id}-zout`).addEventListener('click', () => { state.zoom = Math.max(0.1, state.zoom / 1.25); applyZoom(); });
  $(`#${win.id}-fit`).addEventListener('click', () => { state.zoom = 1; state.rot = 0; applyZoom(); });
  $(`#${win.id}-rot`).addEventListener('click', () => { state.rot = (state.rot + 90) % 360; applyZoom(); });
  $(`#${win.id}-thumbs`).addEventListener('click', () => {
    state.showThumbs = !state.showThumbs;
    $(`#${win.id}-thumbs-panel`).style.display = state.showThumbs ? '' : 'none';
    win.save();
  });

  load();
}

export function serializePreview(win) {
  const s = win.__previewState;
  return { path: s?.path, showThumbs: s?.showThumbs };
}
