// Photos app - gallery view
const AppPhotos = {
  render(container) {
    const photos = [
      { name: 'Mountain View', color: '#4A90D9', emoji: '🏔️' },
      { name: 'Sunset Beach', color: '#E8833A', emoji: '🌅' },
      { name: 'City Lights', color: '#2C3E50', emoji: '🌃' },
      { name: 'Forest Path', color: '#27AE60', emoji: '🌲' },
      { name: 'Ocean Wave', color: '#3498DB', emoji: '🌊' },
      { name: 'Desert Dunes', color: '#E67E22', emoji: '🏜️' },
      { name: 'Northern Lights', color: '#8E44AD', emoji: '🌌' },
      { name: 'Cherry Blossoms', color: '#E91E63', emoji: '🌸' },
    ];

    container.innerHTML = `
      <div class="app-toolbar">
        <span style="font-weight:600;">Photos</span>
        <span style="flex:1;"></span>
        <span style="font-size:12px;color:#666;">${photos.length} photos</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;position:relative;flex:1;overflow-y:auto;" id="photos-grid">
        ${photos.map((p, i) => `
          <div class="photo-item" data-index="${i}" style="aspect-ratio:1;background:${p.color};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;overflow:hidden;">
            <span>${p.emoji}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Create photo viewer as fixed overlay (independent of window clipping)
    const viewer = document.createElement('div');
    viewer.id = 'photo-viewer';
    viewer.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;align-items:center;justify-content:center;flex-direction:column;';
    viewer.innerHTML = `
      <div style="font-size:120px;" id="photo-viewer-img"></div>
      <div style="color:#fff;font-size:16px;margin-top:16px;" id="photo-viewer-name"></div>
      <button class="app-btn" id="photo-close" style="position:absolute;top:16px;right:16px;color:#fff;background:rgba(255,255,255,0.2);padding:8px 16px;">Close</button>
    `;
    document.body.appendChild(viewer);

    container.querySelectorAll('.photo-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        viewer.style.display = 'flex';
        viewer.querySelector('#photo-viewer-img').textContent = photos[idx].emoji;
        viewer.querySelector('#photo-viewer-name').textContent = photos[idx].name;
      });
    });

    viewer.querySelector('#photo-close').addEventListener('click', () => {
      viewer.style.display = 'none';
    });

    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) viewer.style.display = 'none';
    });

    // Cleanup viewer on window close
    const winEl = container.closest('.window');
    if (winEl && winEl._winObj) {
      const origCleanup = winEl._winObj._cleanup;
      winEl._winObj._cleanup = () => {
        if (viewer.parentNode) viewer.remove();
        if (origCleanup) origCleanup();
      };
    }
  }
};
