/* Music — library UI + simulated playback with WebAudio synth tones. */
import { icon } from '../core/icons.js';
import { bus } from '../core/bus.js';

const ALBUMS = [
  { id: 'a1', name: 'System Sounds', artist: 'OpenOS', art: 'linear-gradient(135deg,#fa5c74,#f5336e)', songs: [
    { title: 'Boot Chime', dur: 203, notes: [261.63, 329.63, 392.0, 523.25] },
    { title: 'Dock Bounce', dur: 154, notes: [349.23, 440.0, 349.23, 261.63] },
    { title: 'Spotlight Waltz', dur: 241, notes: [392.0, 493.88, 587.33, 493.88] },
    { title: 'Genie Motion', dur: 188, notes: [293.66, 369.99, 440.0, 369.99] },
  ]},
  { id: 'a2', name: 'Overnight Build', artist: 'The Sessions', art: 'linear-gradient(135deg,#4f9bf5,#1d4ed8)', songs: [
    { title: 'Compile Errors', dur: 176, notes: [220.0, 277.18, 329.63, 277.18] },
    { title: 'Green Checkmark', dur: 143, notes: [329.63, 415.30, 493.88, 415.30] },
    { title: 'Ships at Dawn', dur: 292, notes: [261.63, 392.0, 523.25, 392.0] },
  ]},
  { id: 'a3', name: 'Lo-Fi Window Focus', artist: 'Blur & Glass', art: 'linear-gradient(135deg,#37cbb0,#0e7490)', songs: [
    { title: 'Translucent Titlebar', dur: 198, notes: [293.66, 349.23, 440.0, 349.23] },
    { title: 'Rounded Corners', dur: 173, notes: [246.94, 311.13, 369.99, 311.13] },
    { title: 'Drop Shadow Lullaby', dur: 221, notes: [220.0, 293.66, 349.23, 293.66] },
  ]},
];

export function mountMusic(win, payload) {
  const state = {
    view: payload.view || 'albums',  // albums | album | songs
    albumId: payload.albumId || null,
    songIdx: 0,
    playing: false,
    t: 0, // seconds into song
    volume: 0.7,
    ctx: null, oscTimer: null,
  };
  win.__musicState = state;

  win.body.innerHTML = `
    <div class="music-root">
      <div class="music-body">
        <div class="sidebar music-sidebar">
          <div class="sidebar-group">
            <div class="sidebar-heading">Library</div>
            <div class="sidebar-item" data-view="albums">${icon('grid', 14)}<span>Albums</span></div>
            <div class="sidebar-item" data-view="songs">${icon('list', 14)}<span>Songs</span></div>
          </div>
          <div class="sidebar-group">
            <div class="sidebar-heading">Playlists</div>
            <div class="sidebar-item" data-view="pl-1">${icon('star', 14)}<span>Focus</span></div>
            <div class="sidebar-item" data-view="pl-2">${icon('star', 14)}<span>Road Trip</span></div>
          </div>
        </div>
        <div class="music-main" id="${win.id}-main"></div>
      </div>
      <div class="player-bar">
        <div class="pb-art" id="${win.id}-pb-art"></div>
        <div class="pb-meta">
          <div class="pb-title" id="${win.id}-pb-title">Not Playing</div>
          <div class="pb-artist" id="${win.id}-pb-artist">OpenOS Music</div>
        </div>
        <div class="pb-controls">
          <button class="pb-btn" id="${win.id}-prev" aria-label="Previous">${icon('prev', 16)}</button>
          <button class="pb-btn main" id="${win.id}-play" aria-label="Play or pause">${icon('play', 16)}</button>
          <button class="pb-btn" id="${win.id}-next" aria-label="Next">${icon('next', 16)}</button>
        </div>
        <div class="pb-progress">
          <span id="${win.id}-elapsed">0:00</span>
          <div class="pb-track" id="${win.id}-track"><div class="pb-fill" id="${win.id}-fill"></div><div class="pb-knob" id="${win.id}-knob"></div></div>
          <span id="${win.id}-remaining">-0:00</span>
        </div>
        <input type="range" id="${win.id}-vol" min="0" max="100" value="70" style="width:90px" aria-label="Volume">
      </div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  const currentAlbum = () => ALBUMS.find((a) => a.id === state.albumId) || ALBUMS[0];
  const currentSong = () => currentAlbum().songs[state.songIdx] || currentAlbum().songs[0];

  /* ---- WebAudio synth (created lazily after user gesture) ---- */
  function audioCtx() {
    if (!state.ctx) {
      try { state.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (state.ctx.state === 'suspended') state.ctx.resume();
    return state.ctx;
  }
  let noteIdx = 0;
  function playTone() {
    const ctx = audioCtx();
    if (!ctx || !state.playing) return;
    const song = currentSong();
    const freq = song.notes[noteIdx % song.notes.length];
    noteIdx++;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = freq; o2.frequency.value = freq * 2.001;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.16 * state.volume, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g); o2.connect(g); g.connect(ctx.destination);
    o.start(); o2.start();
    o.stop(ctx.currentTime + 0.55); o2.stop(ctx.currentTime + 0.55);
  }

  function setPlaying(p) {
    state.playing = p;
    $(`#${win.id}-play`).innerHTML = icon(p ? 'pause' : 'play', 16);
    clearInterval(state.oscTimer);
    if (p) {
      playTone();
      state.oscTimer = setInterval(() => {
        playTone();
        state.t += 0.3;
        if (state.t >= currentSong().dur) next();
        updateBar();
      }, 300);
    }
    renderMain();
  }

  function play(album, idx) {
    if (state.albumId !== album.id) { state.albumId = album.id; state.t = 0; }
    state.songIdx = idx;
    state.t = 0;
    updateMeta();
    setPlaying(true);
    win.save();
  }
  function next() { const a = currentAlbum(); state.songIdx = (state.songIdx + 1) % a.songs.length; state.t = 0; updateMeta(); }
  function prev() { if (state.t > 3) { state.t = 0; } else { const a = currentAlbum(); state.songIdx = (state.songIdx - 1 + a.songs.length) % a.songs.length; } updateMeta(); }

  function updateMeta() {
    const a = currentAlbum(), s = currentSong();
    $(`#${win.id}-pb-title`).textContent = s.title;
    $(`#${win.id}-pb-artist`).textContent = `${a.artist} — ${a.name}`;
    $(`#${win.id}-pb-art`).style.background = a.art;
    win.setTitle(`Music — ${s.title}`);
  }
  function fmtT(sec) { return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`; }
  function updateBar() {
    const s = currentSong();
    const pct = Math.min(100, (state.t / s.dur) * 100);
    $(`#${win.id}-fill`).style.width = pct + '%';
    $(`#${win.id}-knob`).style.left = pct + '%';
    $(`#${win.id}-elapsed`).textContent = fmtT(state.t);
    $(`#${win.id}-remaining`).textContent = '-' + fmtT(s.dur - state.t);
  }

  function renderMain() {
    const main = $(`#${win.id}-main`);
    for (const it of win.body.querySelectorAll('.sidebar-item')) it.classList.toggle('selected', it.dataset.view === state.view);

    if (state.view === 'albums') {
      main.innerHTML = `<h3>Albums</h3><div class="album-grid">${ALBUMS.map((a) => `
        <div class="album-card" data-album="${a.id}">
          <div class="album-art" style="background:${a.art}">${icon('play', 30)}</div>
          <div class="album-name">${a.name}</div>
          <div class="album-sub">${a.artist} · ${a.songs.length} songs</div>
        </div>`).join('')}</div>`;
      for (const card of main.querySelectorAll('[data-album]')) {
        card.addEventListener('dblclick', () => play(ALBUMS.find((a) => a.id === card.dataset.album), 0));
        card.addEventListener('click', () => { state.view = 'album'; state.albumId = card.dataset.album; renderMain(); win.save(); });
      }
    } else if (state.view === 'album' || state.view === 'pl-1' || state.view === 'pl-2') {
      const a = currentAlbum();
      const list = state.view === 'pl-1' ? [a.songs[0], a.songs[1]] : state.view === 'pl-2' ? a.songs.filter((_, i) => i % 2 === 0) : a.songs;
      main.innerHTML = `
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">
          <div class="album-art" style="width:110px;height:110px;background:${a.art}">${icon('play', 34)}</div>
          <div><h3 style="margin:0">${escapeHTML(state.view.startsWith('pl') ? { 'pl-1': 'Focus', 'pl-2': 'Road Trip' }[state.view] : a.name)}</h3>
          <div style="color:var(--text-2);font-size:13px">${a.artist} · ${list.length} songs</div></div>
        </div>
        <div class="song-list">${list.map((s) => {
          const idx = a.songs.indexOf(s);
          const playing = state.playing && state.songIdx === idx;
          return `<div class="song-row ${playing ? 'playing' : ''}" data-idx="${idx}">
            <span class="sr-index">${playing ? icon('play', 10) : idx + 1}</span>
            <span>${escapeHTML(s.title)}</span>
            <span style="color:var(--text-2)">${escapeHTML(a.artist)}</span>
            <span class="sr-index">${fmtT(s.dur)}</span>
          </div>`;
        }).join('')}</div>`;
      for (const row of main.querySelectorAll('[data-idx]')) {
        row.addEventListener('dblclick', () => play(a, Number(row.dataset.idx)));
        row.addEventListener('click', () => play(a, Number(row.dataset.idx)));
      }
    } else if (state.view === 'songs') {
      const all = ALBUMS.flatMap((a) => a.songs.map((s, i) => ({ s, a, i })));
      main.innerHTML = `<h3>Songs</h3><div class="song-list">${all.map(({ s, a, i }) => `
        <div class="song-row" data-a="${a.id}" data-i="${i}">
          <span class="sr-index">${i + 1}</span>
          <span>${escapeHTML(s.title)}</span>
          <span style="color:var(--text-2)">${escapeHTML(a.name)}</span>
          <span class="sr-index">${fmtT(s.dur)}</span>
        </div>`).join('')}</div>`;
      for (const row of main.querySelectorAll('.song-row')) {
        row.addEventListener('dblclick', () => play(ALBUMS.find((a) => a.id === row.dataset.a), Number(row.dataset.i)));
      }
    }
  }

  for (const it of win.body.querySelectorAll('.sidebar-item')) {
    it.addEventListener('click', () => { state.view = it.dataset.view; renderMain(); win.save(); });
  }

  $(`#${win.id}-play`).addEventListener('click', () => setPlaying(!state.playing));
  $(`#${win.id}-next`).addEventListener('click', () => { next(); updateBar(); });
  $(`#${win.id}-prev`).addEventListener('click', () => { prev(); updateBar(); });
  $(`#${win.id}-track`).addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    state.t = ((e.clientX - r.left) / r.width) * currentSong().dur;
    updateBar();
  });
  $(`#${win.id}-vol`).addEventListener('input', (e) => { state.volume = Number(e.target.value) / 100; });
  bus.on('os:volume', (v) => { state.volume = v; $(`#${win.id}-vol`).value = Math.round(v * 100); });

  win.onclose = () => { clearInterval(state.oscTimer); if (state.ctx) state.ctx.close(); };

  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  updateMeta();
  updateBar();
  renderMain();
}

export function serializeMusic(win) {
  const s = win.__musicState;
  return { view: s?.view, albumId: s?.albumId };
}
