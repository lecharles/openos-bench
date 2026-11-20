import { el, esc } from '../core/util.js';
import { FS } from '../core/fsapi.js';

export default {
  id: 'preview',
  name: 'Preview',
  size: { w: 820, h: 600 },
  minW: 420, minH: 320,
  singleton: false,
  keywords: 'image picture photo view pdf',

  mount(root, api) {
    let path = api.params.path || null;
    let zoom = 1, rot = 0, fit = true;
    root.classList.add('app');
    const main = el('div', { class: 'app-main' });
    root.append(main);
    const toolbar = el('div', { class: 'app-toolbar' });
    const stage = el('div', { class: 'pv-stage fit' });
    main.append(toolbar, stage);

    const btnGallery = el('button', { class: 'os-btn', text: '⟨ Library' });
    const nameEl = el('div', { style: { fontWeight: '700', fontSize: '12.5px' } });
    const btnOut = el('button', { class: 'os-btn icon-only', text: '−', title: 'Zoom out' });
    const btnIn = el('button', { class: 'os-btn icon-only', text: '+', title: 'Zoom in' });
    const zoomEl = el('span', { style: { fontSize: '11.5px', color: 'var(--fg-dim)', width: '44px', textAlign: 'center' } });
    const btnFit = el('button', { class: 'os-btn', text: 'Fit' });
    const btnRot = el('button', { class: 'os-btn icon-only', title: 'Rotate 90°', html: '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M13 8a5 5 0 1 1-1.7-3.8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M13 2v3h-3" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    toolbar.append(btnGallery, nameEl, el('div', { class: 'spacer' }), btnOut, zoomEl, btnIn, btnFit, btnRot);

    function applyZoom() {
      const img = stage.querySelector('img');
      if (!img) return;
      stage.classList.toggle('fit', fit);
      img.style.transform = `rotate(${rot}deg) scale(${fit ? 1 : zoom})`;
      zoomEl.textContent = fit ? 'Fit' : `${Math.round(zoom * 100)}%`;
    }

    async function open(p) {
      path = p;
      api.params.path = p;
      zoom = 1; rot = 0; fit = true;
      const base = p.split('/').pop();
      nameEl.textContent = base;
      api.setTitle(base);
      stage.innerHTML = '';
      stage.classList.add('fit');
      const img = el('img', { src: FS.rawUrl(p), alt: base, 'data-testid': 'preview-img' });
      img.addEventListener('load', applyZoom);
      stage.append(img);
      applyZoom();
    }

    async function gallery() {
      path = null;
      api.params.path = null;
      nameEl.textContent = 'Image Library';
      api.setTitle('Preview');
      stage.innerHTML = '';
      stage.classList.remove('fit');
      const wrap = el('div', { class: 'pv-gallery' });
      let files = [];
      for (const dir of ['Pictures', 'Desktop', 'Downloads']) {
        try { files.push(...(await FS.list(dir)).entries.filter((e) => e.image)); } catch {}
      }
      for (const f of files) {
        const t = el('div', { class: 'pv-thumb' }, el('img', { src: FS.rawUrl(f.path), loading: 'lazy' }), el('div', { class: 'nm', text: f.name }));
        t.addEventListener('dblclick', () => open(f.path));
        t.addEventListener('click', () => open(f.path));
        wrap.append(t);
      }
      if (!files.length) wrap.append(el('div', { class: 'empty-hint', style: { gridColumn: '1/-1' } }, 'No images found'));
      stage.append(wrap);
      zoomEl.textContent = '';
    }

    btnGallery.addEventListener('click', gallery);
    btnIn.addEventListener('click', () => { fit = false; zoom = Math.min(8, zoom * 1.25); applyZoom(); });
    btnOut.addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); applyZoom(); });
    btnFit.addEventListener('click', () => { fit = !fit; applyZoom(); });
    btnRot.addEventListener('click', () => { rot = (rot + 90) % 360; applyZoom(); });
    stage.addEventListener('wheel', (e) => {
      if (!path) return;
      e.preventDefault();
      fit = false;
      zoom = Math.min(8, Math.max(0.1, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      applyZoom();
    }, { passive: false });

    api.openPath = (p) => open(p);
    if (path) open(path); else gallery();
  },

  onRelaunch(api, opts) {
    if (opts.params && opts.params.path && api.openPath) api.openPath(opts.params.path);
  },
};
