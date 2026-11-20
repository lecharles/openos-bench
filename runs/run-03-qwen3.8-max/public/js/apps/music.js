import { el, hashHue } from '../core/util.js';
import { Synth, setVolume, audioCtx } from '../core/audio.js';
import { settings } from '../core/state.js';

const TRACKS = [
  { id: 't1', title: 'Neon Harbor', artist: 'Midnight Protocol', album: 'Coastline EP', dur: 214 },
  { id: 't2', title: 'Blue Drift', artist: 'Solar Fields Unit', album: 'Aurora Tapes', dur: 187 },
  { id: 't3', title: 'Nightdrive', artist: 'Kavinsky Mode', album: 'Outrun 86', dur: 243 },
  { id: 't4', title: 'Glass Gardens', artist: 'Iva Vector', album: 'Botanica', dur: 201 },
  { id: 't5', title: 'Packet Rain', artist: 'Midnight Protocol', album: 'Coastline EP', dur: 176 },
  { id: 't6', title: 'Cupertino Sunset', artist: 'Dre Appleton', album: 'Infinite Loop', dur: 232 },
  { id: 't7', title: 'Kernel Panic Disco', artist: 'Segfault Sisters', album: 'Stack Trace', dur: 198 },
  { id: 't8', title: 'Lissajous Love', artist: 'Iva Vector', album: 'Botanica', dur: 224 },
];
const art = (t) => {
  const h = hashHue(t.id + t.title);
  return `linear-gradient(135deg, hsl(${h} 75% 58%), hsl(${(h + 60) % 360} 70% 42%))`;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default {
  id: 'music',
  name: 'Music',
  size: { w: 840, h: 560 },
  minW: 560, minH: 400,
  keywords: 'audio player songs library',

  mount(root, api) {
    let idx = -1, playing = false, pos = 0, shuffle = false, repeat = false;
    let synth = null, tickTimer = null;
    root.classList.add('mu');

    const body = el('div', { class: 'mu-body' });
    const side = el('div', { class: 'mu-side' });
    const listPane = el('div', { class: 'mu-list' });
    body.append(side, listPane);
    const player = el('div', { class: 'mu-player' });
    root.append(body, player);

    side.append(el('div', { class: 'side-h', text: 'Apple Music' }));
    for (const [label, on] of [['Listen Now', true], ['Browse', false], ['Radio', false]]) {
      side.append(el('div', { class: 'side-row' + (on ? ' on' : '') }, el('span', { text: label })));
    }
    side.append(el('div', { class: 'side-h', text: 'Library' }));
    for (const label of ['Recently Added', 'Artists', 'Albums', 'Songs']) {
      side.append(el('div', { class: 'side-row' + (label === 'Songs' ? ' on' : '') }, el('span', { text: label })));
    }

    listPane.append(el('h2', { text: 'Songs' }));
    const table = el('div', { 'data-testid': 'music-list' });
    listPane.append(table);
    TRACKS.forEach((t, i) => {
      const row = el('div', { class: 'mu-row', dataset: { id: t.id }, 'data-testid': 'music-track' },
        el('div', { class: 'idx', text: String(i + 1) }),
        el('div', { class: 'art', style: { background: art(t) } }),
        el('div', { class: 'tt', text: t.title }),
        el('div', { class: 'dim', text: `${t.artist} — ${t.album}` }),
        el('div', { class: 'dim', style: { textAlign: 'right' }, text: fmt(t.dur) }));
      row.addEventListener('dblclick', () => play(i));
      row.addEventListener('click', () => { selectRow(i); });
      table.append(row);
    });
    function selectRow(i) {
      table.querySelectorAll('.mu-row').forEach((r, j) => r.classList.toggle('playing', j === i && playing));
    }

    // player bar
    const artEl = el('div', { class: 'art', style: { background: 'var(--panel-3)' } });
    const ttEl = el('div', { class: 'tt', text: 'Not Playing' });
    const arEl = el('div', { class: 'ar', text: '—' });
    const btnPrev = el('button', { html: '<svg viewBox="0 0 16 16"><path d="M3 2h1.6v12H3zM13 2 5.5 8 13 14z"/></svg>' });
    const btnPlay = el('button', { class: 'play', html: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>' });
    const btnNext = el('button', { html: '<svg viewBox="0 0 16 16"><path d="M11.4 2H13v12h-1.6zM3 2l7.5 6L3 14z"/></svg>' });
    const posEl = el('span', { text: '0:00' });
    const bar = el('div', { class: 'bar' }, el('i', { style: { width: '0%' } }));
    const durEl = el('span', { text: '0:00' });
    const canvas = el('canvas', { width: '184', height: '60' });
    const vol = el('input', { class: 'os-slider', type: 'range', min: '0', max: '1', step: '0.01', value: String(settings.get('volume')) });
    player.append(
      el('div', { class: 'mu-np' }, artEl, el('div', { style: { minWidth: '0' } }, ttEl, arEl)),
      el('div', { class: 'mu-ctl' },
        el('div', { class: 'mu-btns' }, btnPrev, btnPlay, btnNext),
        el('div', { class: 'mu-prog' }, posEl, bar, durEl)),
      el('div', { class: 'mu-right' }, canvas, vol));

    vol.addEventListener('input', () => { settings.set('volume', parseFloat(vol.value)); setVolume(parseFloat(vol.value)); });
    vol.addEventListener('change', () => settings.set('volume', parseFloat(vol.value), true));

    function setPlayingUI() {
      btnPlay.innerHTML = playing
        ? '<svg viewBox="0 0 16 16"><path d="M3.5 2h3.4v12H3.5zM9.1 2h3.4v12H9.1z"/></svg>'
        : '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>';
    }

    function play(i) {
      idx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
      const t = TRACKS[idx];
      if (synth) synth.stop();
      synth = new Synth(hashHue(t.id) + 7, 196, 92);
      synth.start();
      playing = true; pos = 0;
      artEl.style.background = art(t);
      ttEl.textContent = t.title; arEl.textContent = t.artist;
      durEl.textContent = fmt(t.dur);
      setPlayingUI(); selectRow(idx);
    }
    function pause() {
      playing = false;
      if (synth) synth.stop();
      setPlayingUI(); selectRow(idx);
    }
    function toggle() {
      if (idx === -1) return play(0);
      if (playing) pause();
      else {
        synth = new Synth(hashHue(TRACKS[idx].id) + 7, 196, 92); synth.start();
        playing = true; setPlayingUI(); selectRow(idx);
      }
    }
    btnPlay.addEventListener('click', toggle);
    btnNext.addEventListener('click', () => play(shuffle ? Math.floor(Math.random() * TRACKS.length) : idx + 1));
    btnPrev.addEventListener('click', () => play(pos > 4 ? idx : idx - 1));
    bar.addEventListener('mousedown', (e) => {
      const r = bar.getBoundingClientRect();
      pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (idx >= 0 ? TRACKS[idx].dur : 0);
    });

    tickTimer = setInterval(() => {
      if (playing && idx >= 0) {
        pos += 0.25;
        if (pos >= TRACKS[idx].dur) {
          if (repeat) pos = 0;
          else { play(idx + 1); return; }
        }
        posEl.textContent = fmt(pos);
        bar.querySelector('i').style.width = `${(pos / TRACKS[idx].dur) * 100}%`;
      }
      // visualizer
      const ctx2 = canvas.getContext('2d');
      ctx2.clearRect(0, 0, canvas.width, canvas.height);
      if (synth && synth.analyser && playing) {
        const data = new Uint8Array(synth.analyser.frequencyBinCount);
        synth.analyser.getByteFrequencyData(data);
        const bw = canvas.width / 24;
        for (let i = 0; i < 24; i++) {
          const v = data[i + 2] / 255;
          ctx2.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0a84ff';
          ctx2.globalAlpha = 0.85;
          ctx2.fillRect(i * bw + 1, canvas.height - v * canvas.height, bw - 2, v * canvas.height);
        }
      }
    }, 250);

    api._off = () => { clearInterval(tickTimer); if (synth) synth.stop(); };
    void audioCtx;
  },
  onclose(api) { api._off && api._off(); },
};
