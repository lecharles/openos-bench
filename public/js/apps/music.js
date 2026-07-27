// Music app
const AppMusic = {
  playing: false,
  currentTrack: 0,
  tracks: [
    { title: 'Ambient Morning', artist: 'Nature Sounds', duration: '3:42', emoji: '🌅' },
    { title: 'Ocean Waves', artist: 'Relaxation', duration: '5:18', emoji: '🌊' },
    { title: 'Forest Rain', artist: 'Meditation', duration: '4:05', emoji: '🌧️' },
    { title: 'City Jazz', artist: 'Night Vibes', duration: '3:28', emoji: '🎷' },
    { title: 'Electronic Dreams', artist: 'Synthwave', duration: '4:55', emoji: '🎹' },
    { title: 'Classical Piano', artist: 'Mozart', duration: '6:12', emoji: '🎼' },
    { title: 'Lo-Fi Beats', artist: 'ChillHop', duration: '3:15', emoji: '🎧' },
    { title: 'Acoustic Guitar', artist: 'Folk Tales', duration: '4:30', emoji: '🎸' },
  ],

  render(container) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;flex:1;overflow:hidden;gap:1px;">
          <div style="width:260px;border-right:1px solid rgba(0,0,0,0.08);overflow-y:auto;flex-shrink:0;" id="music-sidebar">
            <div class="app-list-item" style="font-weight:600;">📚 Library</div>
            <div class="app-list-item">🎵 Recently Added</div>
            <div class="app-list-item">❤️ Favorites</div>
            <div class="app-list-item">📻 Radio</div>
          </div>
          <div style="flex:1;overflow-y:auto;" id="music-list">
            ${this.tracks.map((t, i) => `
              <div class="app-list-item music-track" data-index="${i}" style="padding:10px 12px;">
                <span style="font-size:24px;">${t.emoji}</span>
                <div style="flex:1;">
                  <div style="font-weight:500;">${AppUtils.escapeHtml(t.title)}</div>
                  <div style="font-size:12px;color:#666;">${AppUtils.escapeHtml(t.artist)}</div>
                </div>
                <span style="font-size:12px;color:#999;">${t.duration}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(0,0,0,0.08);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;" id="music-player">
          <span style="font-size:28px;" id="music-playing-icon">🎵</span>
          <div style="flex:1;">
            <div style="font-weight:500;font-size:13px;" id="music-playing-title">Select a track</div>
            <div style="font-size:11px;color:#666;" id="music-playing-artist"></div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="app-btn" id="music-prev">⏮</button>
            <button class="app-btn primary" id="music-play">▶️</button>
            <button class="app-btn" id="music-next">⏭</button>
          </div>
        </div>
      </div>
    `;

    this.setupListeners(container);
  },

  setupListeners(container) {
    container.querySelectorAll('.music-track').forEach(el => {
      el.addEventListener('click', () => {
        this.currentTrack = parseInt(el.dataset.index);
        this.playTrack(container, this.currentTrack);
      });
    });

    container.querySelector('#music-play').addEventListener('click', () => {
      this.playing = !this.playing;
      container.querySelector('#music-play').textContent = this.playing ? '⏸️' : '▶️';
      if (this.playing) this.playTrack(container, this.currentTrack);
    });

    container.querySelector('#music-prev').addEventListener('click', () => {
      this.currentTrack = (this.currentTrack - 1 + this.tracks.length) % this.tracks.length;
      this.playTrack(container, this.currentTrack);
    });

    container.querySelector('#music-next').addEventListener('click', () => {
      this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
      this.playTrack(container, this.currentTrack);
    });
  },

  playTrack(container, index) {
    const track = this.tracks[index];
    container.querySelector('#music-playing-title').textContent = track.title;
    container.querySelector('#music-playing-artist').textContent = track.artist;
    container.querySelector('#music-playing-icon').textContent = track.emoji;
    this.playing = true;
    container.querySelector('#music-play').textContent = '⏸️';
  }
};
