/* Photos — gallery over the real ~/Pictures folder. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';
import { wm } from '../core/wm.js';
import { openFile } from '../core/open.js';

const FAVORITES_KEY = 'openos-photos-favs';
function favs() { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; } }
function setFavs(list) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); }

export function mountPhotos(win, payload) {
  let photos = [];       // {name, path, url, mtime}
  let detailIdx = payload.openIdx ?? null;
  let view = payload.view || 'library';
  win.__photosState = { get view() { return view; } };

  win.body.innerHTML = `
    <div class="photos-root">
      <div class="photos-header">
        <span>${icon('photos', 20)} Photos</span>
        <span style="font-size:12.5px;color:var(--text-2)" id="${win.id}-count"></span>
        <span style="margin-left:auto"></span>
        <button class="btn secondary small" id="${win.id}-lib">Library</button>
        <button class="btn secondary small" id="${win.id}-favs">Favorites</button>
      </div>
      <div id="${win.id}-body" style="flex:1;min-height:0;position:relative"></div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  async function load() {
    try {
      const r = await api.fs.list('~/Pictures');
      const list = r.entries.filter((e) => e.kind === 'image');
      photos = await Promise.all(list.map(async (e) => ({
        name: e.name, path: `~/Pictures/${e.name}`, url: await api.fs.readDataURL(`~/Pictures/${e.name}`).catch(() => ''), mtime: e.mtime,
      })));
    } catch (e) { toast({ title: 'Photos failed to load', body: e.message, app: 'photos' }); }
    render();
  }

  function visible() {
    const f = favs();
    return view === 'favorites' ? photos.filter((p) => f.includes(p.name)) : photos;
  }

  function render() {
    $(`#${win.id}-count`).textContent = `${visible().length} items`;
    $(`#${win.id}-lib`).classList.toggle('btn', view === 'library');
    const body = $(`#${win.id}-body`);

    if (detailIdx !== null && visible()[detailIdx]) {
      const p = visible()[detailIdx];
      body.innerHTML = `
        <div class="photo-detail">
          <button class="photo-nav left" id="${win.id}-pnav" aria-label="Previous">${icon('chevronL', 16)}</button>
          <img src="${p.url}" alt="${escapeHTML(p.name)}">
          <button class="photo-nav right" id="${win.id}-nnav" aria-label="Next">${icon('chevronR', 16)}</button>
          <div class="photo-caption">${escapeHTML(p.name)}</div>
        </div>`;
      $(`#${win.id}-pnav`).addEventListener('click', () => { detailIdx = (detailIdx - 1 + visible().length) % visible().length; render(); });
      $(`#${win.id}-nnav`).addEventListener('click', () => { detailIdx = (detailIdx + 1) % visible().length; render(); });
      return;
    }

    const list = visible();
    body.innerHTML = list.length ? `
      <div class="photos-grid">
        ${list.map((p, i) => `
          <div class="photo-card" data-idx="${i}" role="button" aria-label="${escapeHTML(p.name)}">
            <img src="${p.url}" alt="${escapeHTML(p.name)}" loading="lazy">
            <div class="pc-name">${escapeHTML(p.name)}</div>
          </div>`).join('')}
      </div>` : `<div class="empty-state">${icon('photos', 56)}<div>${view === 'favorites' ? 'No favorites yet' : 'No photos found'}</div></div>`;

    for (const card of body.querySelectorAll('.photo-card')) {
      card.addEventListener('dblclick', () => { detailIdx = Number(card.dataset.idx); render(); win.save(); });
      card.addEventListener('click', () => { detailIdx = Number(card.dataset.idx); render(); win.save(); });
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const p = list[Number(card.dataset.idx)];
        import('../core/menu.js').then(({ contextMenu }) => contextMenu(e.clientX, e.clientY, [
          { label: favs().includes(p.name) ? 'Remove from Favorites' : 'Add to Favorites', action: () => toggleFav(p.name) },
          { label: 'Open in Preview', action: () => wm.open('preview', { payload: { path: p.path } }) },
          { label: 'Reveal in Finder', action: () => wm.open('finder', { payload: { path: '~/Pictures' } }) },
        ]));
      });
    }
  }

  function toggleFav(name) {
    const f = favs();
    const i = f.indexOf(name);
    if (i === -1) f.push(name); else f.splice(i, 1);
    setFavs(f);
    render();
  }

  $(`#${win.id}-lib`).addEventListener('click', () => { view = 'library'; detailIdx = null; render(); win.save(); });
  $(`#${win.id}-favs`).addEventListener('click', () => { view = 'favorites'; detailIdx = null; render(); win.save(); });

  load();
}

export function serializePhotos(win) {
  return { view: win.__photosState?.view ?? 'library' };
}
