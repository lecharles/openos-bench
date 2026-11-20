import { el } from '../core/util.js';
import { FS } from '../core/fsapi.js';
import { get, set } from '../core/state.js';
import { bus } from '../core/bus.js';

export default {
  id: 'photos',
  name: 'Photos',
  size: { w: 880, h: 620 },
  minW: 520, minH: 400,
  keywords: 'pictures images library gallery',

  mount(root, api) {
    let view = 'library';
    let files = [];
    let viewerIdx = -1;
    root.classList.add('ph');
    const side = el('aside', { class: 'ph-side' });
    const main = el('div', { class: 'ph-main' });
    root.append(side, main);

    side.append(el('div', { class: 'side-h', text: 'Library' }));
    for (const [id, label] of [['library', 'All Photos'], ['recents', 'Recents'], ['favorites', 'Favorites']]) {
      const row = el('div', { class: 'side-row', dataset: { id } }, el('span', { text: label }));
      row.addEventListener('click', () => { view = id; mark(); render(); });
      side.append(row);
    }
    const mark = () => side.querySelectorAll('.side-row').forEach((r) => r.classList.toggle('on', r.dataset.id === view));

    const favs = () => get('photos.favs', []);
    const setFavs = (f) => set('photos.favs', f, true);

    async function load() {
      files = [];
      for (const dir of ['Pictures', 'Desktop', 'Downloads']) {
        try { files.push(...(await FS.list(dir)).entries.filter((e) => e.image)); } catch {}
      }
      files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    }

    function render() {
      main.innerHTML = '';
      let shown = files;
      if (view === 'favorites') shown = files.filter((f) => favs().includes(f.name));
      if (view === 'recents') shown = files.slice(0, 6);

      if (view === 'library' && files.length) {
        const hero = files[0];
        main.append(el('div', { class: 'ph-hero' },
          el('img', { src: FS.rawUrl(hero.path) }),
          el('div', { class: 'cap' }, el('div', { class: 't', text: 'Memories' }), el('div', { class: 's', text: `${files.length} photos · synced from /Pictures` }))));
      }
      const grid = el('div', { class: 'ph-grid', 'data-testid': 'photos-grid' });
      shown.forEach((f, i) => {
        const fav = favs().includes(f.name);
        const cell = el('div', { class: 'ph-cell', dataset: { name: f.name }, 'data-testid': 'photo-cell' },
          el('img', { src: FS.rawUrl(f.path), loading: 'lazy', alt: f.name }),
          el('div', { class: 'favb' + (fav ? ' on' : ''), text: fav ? '♥' : '♡' }));
        cell.addEventListener('click', (e) => {
          if (e.target.classList.contains('favb')) {
            const f2 = favs();
            setFavs(f2.includes(f.name) ? f2.filter((x) => x !== f.name) : [...f2, f.name]);
            render();
            return;
          }
          openViewer(shown, i);
        });
        grid.append(cell);
      });
      if (!shown.length) grid.append(el('div', { class: 'empty-hint', style: { gridColumn: '1/-1' } }, view === 'favorites' ? 'No favorites yet — hover a photo and tap ♥' : 'No photos'));
      main.append(grid);
    }

    function openViewer(list, i) {
      viewerIdx = i;
      const viewer = el('div', { class: 'ph-viewer' });
      const top = el('div', { class: 'pv-top' });
      const stage = el('div', { class: 'stage' });
      const img = el('img', { 'data-testid': 'photos-viewer-img' });
      const navL = el('button', { class: 'ph-nav l', text: '‹' });
      const navR = el('button', { class: 'ph-nav r', text: '›' });
      const closeB = el('button', { class: 'os-btn', text: '✕ Close' });
      const nameEl = el('div', { style: { fontWeight: '600' } });
      const favB = el('button', { class: 'os-btn', text: '♡' });
      top.append(closeB, nameEl, el('div', { class: 'spacer' }), favB);
      stage.append(img, navL, navR);
      viewer.append(top, stage);
      main.append(viewer);
      function show() {
        const f = list[viewerIdx];
        if (!f) return;
        img.src = FS.rawUrl(f.path);
        nameEl.textContent = f.name;
        const isF = favs().includes(f.name);
        favB.textContent = isF ? '♥ Favorite' : '♡ Favorite';
        favB.onclick = () => {
          const f2 = favs();
          setFavs(isF ? f2.filter((x) => x !== f.name) : [...f2, f.name]);
          show();
        };
      }
      navL.addEventListener('click', () => { viewerIdx = (viewerIdx - 1 + list.length) % list.length; show(); });
      navR.addEventListener('click', () => { viewerIdx = (viewerIdx + 1) % list.length; show(); });
      closeB.addEventListener('click', () => viewer.remove());
      show();
    }

    const off = bus.on('fschange', async () => { await load(); render(); });
    api._off = off;
    load().then(render);
    mark();
  },
  onclose(api) { api._off && api._off(); },
};
