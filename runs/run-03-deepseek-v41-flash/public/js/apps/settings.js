/* Settings — Appearance / Wallpaper / Dock / About, all persisted server-side. */
import { icon } from '../core/icons.js';
import { settings } from '../core/state.js';
import { WALLPAPERS } from '../core/wallpapers.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';

const ACCENTS = [['blue', '#0071e3'], ['purple', '#8944ab'], ['pink', '#f7418f'], ['red', '#e0453a'], ['orange', '#e08a00'], ['yellow', '#d8a200'], ['green', '#34a52f'], ['graphite', '#8c8c8e']];

export function mountSettings(win, payload) {
  let pane = payload.pane || 'appearance';
  win.__settingsState = { get pane() { return pane; } };

  win.body.innerHTML = `
    <div class="settings-root">
      <div class="sidebar settings-sidebar">
        <div class="sidebar-group">
          <div class="sidebar-item" data-pane="appearance" role="button">${icon('sun', 15)}<span>Appearance</span></div>
          <div class="sidebar-item" data-pane="wallpaper">${icon('imageS', 15)}<span>Wallpaper</span></div>
          <div class="sidebar-item" data-pane="dock">${icon('displayS', 15)}<span>Desktop &amp; Dock</span></div>
          <div class="sidebar-item" data-pane="datetime">${icon('clockS', 15)}<span>Date &amp; Time</span></div>
          <div class="sidebar-item" data-pane="network">${icon('wifi', 15)}<span>Network</span></div>
        </div>
        <div class="sidebar-group">
          <div class="sidebar-item" data-pane="about">${icon('infoS', 15)}<span>About</span></div>
        </div>
      </div>
      <div class="settings-main" id="${win.id}-main"></div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  for (const it of win.body.querySelectorAll('.sidebar-item')) {
    it.addEventListener('click', () => { pane = it.dataset.pane; render(); win.save(); });
  }

  function render() {
    for (const it of win.body.querySelectorAll('.sidebar-item')) it.classList.toggle('selected', it.dataset.pane === pane);
    const main = $(`#${win.id}-main`);
    if (pane === 'appearance') renderAppearance(main);
    else if (pane === 'wallpaper') renderWallpaper(main);
    else if (pane === 'dock') renderDock(main);
    else if (pane === 'about') renderAbout(main);
    else renderSimple(main);
    win.setTitle('System Settings');
  }

  function renderAppearance(main) {
    main.innerHTML = `
      <h2>Appearance</h2>
      <div class="settings-group">
        <div class="theme-cards" id="${win.id}-themes">
          ${['light', 'auto', 'dark'].map((t) => `
            <div class="theme-card ${settings.data.theme === t ? 'selected' : ''}" data-theme="${t}">
              <div class="tc-preview" style="background:${t === 'dark' ? '#1c1c1e' : t === 'auto' ? 'linear-gradient(90deg,#e8e8ec 50%,#1c1c1e 50%)' : '#e8e8ec'}">
                <div class="tc-menubar" style="background:${t === 'dark' ? 'rgba(60,60,64,.85)' : 'rgba(255,255,255,.75)'}"></div>
                <div class="tc-window" style="background:${t === 'dark' ? '#2c2c30' : '#fff'};left:${t === 'dark' ? '26px' : '16px'}"></div>
              </div>
              <div class="tc-name">${t[0].toUpperCase() + t.slice(1)}</div>
            </div>`).join('')}
        </div>
      </div>
      <h2 style="margin-top:4px">Accent colour</h2>
      <div class="settings-group">
        <div class="accent-dots" id="${win.id}-accents">
          ${ACCENTS.map(([id, c]) => `<div class="accent-dot ${settings.data.accent === id ? 'selected' : ''}" data-accent="${id}" style="background:${c}" role="button" aria-label="${id}"></div>`).join('')}
        </div>
      </div>
      <h2 style="margin-top:4px">Theme</h2>
      <div class="settings-group">
        <div class="settings-row"><div class="sr-label">Show scroll bars automatically</div><div class="sr-value">On</div></div>
        <div class="settings-row"><div class="sr-label">Prefer tint when supported</div><div class="sr-value">Off</div></div>
      </div>`;
    for (const card of main.querySelectorAll('[data-theme]')) {
      card.addEventListener('click', () => { settings.set({ theme: card.dataset.theme }); render(); });
    }
    for (const dot of main.querySelectorAll('[data-accent]')) {
      dot.addEventListener('click', () => { settings.set({ accent: dot.dataset.accent }); render(); });
    }
  }

  function renderWallpaper(main) {
    main.innerHTML = `
      <h2>Wallpaper</h2>
      <div class="settings-group">
        <div class="wall-grid" id="${win.id}-walls">
          ${Object.entries(WALLPAPERS).map(([id, w]) => `
            <div class="wall-card ${settings.data.wallpaper === id ? 'selected' : ''}" data-wall="${id}" role="button" aria-label="${escapeHTML(w.name)}">
              <div style="position:absolute;inset:0;background:${w.css}"></div>
              <div class="wc-name">${escapeHTML(w.name)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--text-2)">Click a wallpaper to apply it. Your choice persists across reloads.</div>`;
    for (const card of main.querySelectorAll('[data-wall]')) {
      card.addEventListener('click', () => { settings.set({ wallpaper: card.dataset.wall }); render(); toast({ title: 'Wallpaper changed', body: WALLPAPERS[card.dataset.wall].name, app: 'settings' }); });
    }
  }

  function renderDock(main) {
    main.innerHTML = `
      <h2>Desktop &amp; Dock</h2>
      <div class="settings-group">
        <div class="settings-row">
          <div class="sr-label">Dock size</div>
          <input type="range" id="${win.id}-dsize" min="40" max="68" step="2" value="${settings.data.dockSize}" style="width:200px" aria-label="Dock size">
          <div class="sr-value" id="${win.id}-dsize-v">${settings.data.dockSize}px</div>
        </div>
        <div class="settings-row">
          <div class="sr-label">Magnification</div>
          <input type="range" id="${win.id}-dmag" min="0" max="1" step="0.05" value="${settings.data.dockMagnify}" style="width:200px" aria-label="Magnification">
          <div class="sr-value" id="${win.id}-dmag-v">${Math.round(settings.data.dockMagnify * 100)}%</div>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-row"><div class="sr-label">Automatically hide the Dock</div><div class="sr-value">Off</div></div>
        <div class="settings-row"><div class="sr-label">Animate opening applications</div><div class="sr-value">On</div></div>
      </div>`;
    main.querySelector(`#${win.id}-dsize`).addEventListener('input', (e) => {
      settings.setDebounced({ dockSize: Number(e.target.value) });
      main.querySelector(`#${win.id}-dsize-v`).textContent = e.target.value + 'px';
    });
    main.querySelector(`#${win.id}-dmag`).addEventListener('input', (e) => {
      settings.setDebounced({ dockMagnify: Number(e.target.value) });
      main.querySelector(`#${win.id}-dmag-v`).textContent = Math.round(e.target.value * 100) + '%';
    });
  }

  function renderAbout(main) {
    main.innerHTML = `
      <div class="about-hero">
        ${icon('logo', 90)}
        <div class="ah-name">OpenOS</div>
        <div class="ah-sub">Version 1.0 (OpenOS Bench)</div>
        <div class="ah-specs">
          Chip — <b>GLM-5.3</b><br>
          Memory — <b>Overnight Session</b><br>
          Serial — <b>GLM-VPS-001</b><br>
          <span style="font-size:11.5px">Hand-built in one sitting with vanilla JavaScript.</span>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-row"><div class="sr-label">Apps installed</div><div class="sr-value">15</div></div>
        <div class="settings-row"><div class="sr-label">Persistence</div><div class="sr-value">Server-side JSON</div></div>
        <div class="settings-row"><div class="sr-label">Build stack</div><div class="sr-value">Express + Socket.IO</div></div>
      </div>`;
  }

  function renderSimple(main) {
    const info = {
      datetime: ['Date & Time', ['Timezone: Automatic', '24-hour time: Off', 'Show date in menu bar: On']],
      network: ['Network', ['Wi-Fi: Connected (OpenOS-5G)', 'IP: 10.0.1.42', 'Firewall: On']],
    }[pane];
    main.innerHTML = `
      <h2>${info[0]}</h2>
      <div class="settings-group">
        ${info[1].map((l) => `<div class="settings-row"><div class="sr-label">${l.split(':')[0]}</div><div class="sr-value">${l.split(':')[1] || ''}</div></div>`).join('')}
      </div>
      <div style="font-size:12.5px;color:var(--text-2)">This pane is presentational in the bench build.</div>`;
  }

  render();
}

export function serializeSettings(win) {
  return { pane: win.__settingsState?.pane ?? 'appearance' };
}
