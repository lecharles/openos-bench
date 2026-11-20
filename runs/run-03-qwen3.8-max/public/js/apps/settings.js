import { el } from '../core/util.js';
import { settings } from '../core/state.js';
import { applySettings } from '../core/apply.js';
import { beep } from '../core/audio.js';

const WALLPAPERS = [
  ['sonoma', 'Sonoma'], ['bigsur', 'Big Sur'], ['ventura', 'Ventura'],
  ['sunrise', 'Sunrise'], ['ocean', 'Ocean'], ['forest', 'Forest'], ['graphite', 'Graphite'],
];
const ACCENTS = [
  ['#0a84ff', 'Blue'], ['#bf5af2', 'Purple'], ['#ff375f', 'Pink'], ['#ff453a', 'Red'],
  ['#ff9f0a', 'Orange'], ['#ffd60a', 'Yellow'], ['#30d158', 'Green'], ['#64d2ff', 'Graphite'],
];

export default {
  id: 'settings',
  name: 'System Settings',
  size: { w: 760, h: 560 },
  minW: 560, minH: 400,
  keywords: 'preferences theme wallpaper appearance dark light accent',

  mount(root, api) {
    root.classList.add('set');
    const side = el('aside', { class: 'set-side' });
    const body = el('div', { class: 'set-body' });
    root.append(side, body);

    const SECTIONS = [
      ['appearance', 'Appearance', '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="#0a84ff" stroke-width="2"/><path d="M10 3a7 7 0 0 1 0 14z" fill="#0a84ff"/></svg>'],
      ['dock', 'Desktop & Dock', '<svg viewBox="0 0 20 20"><rect x="2" y="11" width="16" height="6" rx="2" fill="#8e8e93"/><rect x="4" y="7" width="3" height="3" rx=".8" fill="#0a84ff"/><rect x="8.5" y="7" width="3" height="3" rx=".8" fill="#30d158"/><rect x="13" y="7" width="3" height="3" rx=".8" fill="#ff9f0a"/></svg>'],
      ['display', 'Displays', '<svg viewBox="0 0 20 20"><rect x="2" y="3.5" width="16" height="10" rx="1.6" fill="#64d2ff"/><rect x="8" y="14.5" width="4" height="2" fill="#8e8e93"/></svg>'],
      ['sound', 'Sound', '<svg viewBox="0 0 20 20"><path d="M4 8v4h3l4 3.5v-11L7 8z" fill="#ff375f"/><path d="M13.5 7.5a4 4 0 0 1 0 5" stroke="#ff375f" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'],
      ['about', 'About', '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#8e8e93" stroke-width="1.8"/><path d="M10 9v5" stroke="#8e8e93" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.4" r="1.1" fill="#8e8e93"/></svg>'],
    ];
    let section = 'appearance';
    for (const [id, label, ic] of SECTIONS) {
      const row = el('div', { class: 'side-row', dataset: { id } }, el('span', { html: ic, style: { width: '17px', height: '17px', display: 'flex' } }), el('span', { text: label }));
      row.addEventListener('click', () => { section = id; mark(); renderBody(); });
      side.append(row);
    }
    const mark = () => side.querySelectorAll('.side-row').forEach((r) => r.classList.toggle('on', r.dataset.id === section));

    function renderBody() {
      body.innerHTML = '';
      if (section === 'appearance') body.append(appearancePane());
      if (section === 'dock') body.append(dockPane());
      if (section === 'display') body.append(displayPane());
      if (section === 'sound') body.append(soundPane());
      if (section === 'about') body.append(aboutPane());
      mark();
    }

    function seg(key, options) {
      const wrap = el('div', { class: 'os-seg' });
      for (const [val, label] of options) {
        const b = el('button', { class: settings.get(key) === val ? 'on' : '', text: label });
        b.addEventListener('click', () => { settings.set(key, val, true); applySettings(); renderBody(); });
        wrap.append(b);
      }
      return wrap;
    }
    function row(lab, ...rest) { return el('div', { class: 'set-row' }, el('div', { class: 'lab', text: lab }), ...rest); }
    function sec(...rows) { const s = el('div', { class: 'set-sec' }); rows.forEach((r) => s.append(r)); return s; }
    function sw(key, after) {
      const s = el('div', { class: 'os-switch' + (settings.get(key) ? ' on' : '') });
      s.addEventListener('click', () => { settings.set(key, !settings.get(key), true); s.classList.toggle('on'); applySettings(); after && after(); });
      return s;
    }
    function slider(key, min, max, step, after) {
      const s = el('input', { class: 'os-slider', type: 'range', min, max, step, value: settings.get(key), style: { flex: '1' } });
      s.addEventListener('input', () => { settings.set(key, parseFloat(s.value)); applySettings(); after && after(); });
      s.addEventListener('change', () => settings.set(key, parseFloat(s.value), true));
      return s;
    }

    function appearancePane() {
      const frag = el('div', {});
      frag.append(el('h2', { text: 'Appearance' }));
      frag.append(sec(
        row('Theme', seg('theme', [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']])),
        row('Accent', el('div', { class: 'accent-row' }, ACCENTS.map(([c, name]) => {
          const d = el('div', { class: 'accent-dot' + (settings.get('accent') === c ? ' on' : ''), title: name, style: { background: c } });
          d.addEventListener('click', () => { settings.set('accent', c, true); applySettings(); renderBody(); });
          return d;
        }))),
      ));
      const wpGrid = el('div', { class: 'wp-grid' });
      for (const [id, name] of WALLPAPERS) {
        const t = el('div', { class: 'wp-thumb' + (settings.get('wallpaper') === id ? ' on' : ''), dataset: { wp: id }, title: name }, el('div', { class: 'nm', text: name }));
        t.addEventListener('click', () => { settings.set('wallpaper', id, true); applySettings(); renderBody(); });
        wpGrid.append(t);
      }
      frag.append(el('h2', { text: 'Wallpaper', style: { fontSize: '15px' } }), wpGrid);
      return frag;
    }

    function dockPane() {
      const frag = el('div', {});
      frag.append(el('h2', { text: 'Desktop & Dock' }));
      const sizeVal = el('span', { text: `${settings.get('dockSize')}px`, style: { width: '40px', textAlign: 'right', color: 'var(--fg-dim)' } });
      frag.append(sec(
        row('Size', slider('dockSize', 40, 72, 1, () => { sizeVal.textContent = `${settings.get('dockSize')}px`; }), sizeVal),
        row('Magnification', sw('dockMagnify')),
        row('Position', seg('dockPos', [['bottom', 'Bottom']])),
      ));
      return frag;
    }

    function displayPane() {
      const frag = el('div', {});
      frag.append(el('h2', { text: 'Displays' }));
      const bVal = el('span', { text: `${Math.round(settings.get('brightness') * 100)}%`, style: { width: '44px', textAlign: 'right', color: 'var(--fg-dim)' } });
      frag.append(sec(
        row('Brightness', slider('brightness', 0.35, 1, 0.01, () => { bVal.textContent = `${Math.round(settings.get('brightness') * 100)}%`; }), bVal),
        row('Resolution', el('span', { style: { color: 'var(--fg-dim)' }, text: `Default (${innerWidth} × ${innerHeight})` })),
        row('Night Shift', sw('nightShift')),
      ));
      return frag;
    }

    function soundPane() {
      const frag = el('div', {});
      frag.append(el('h2', { text: 'Sound' }));
      const vVal = el('span', { text: `${Math.round(settings.get('volume') * 100)}%`, style: { width: '44px', textAlign: 'right', color: 'var(--fg-dim)' } });
      frag.append(sec(
        row('Volume', slider('volume', 0, 1, 0.01, () => { vVal.textContent = `${Math.round(settings.get('volume') * 100)}%`; }), vVal),
        row('Alert sound', el('button', { class: 'os-btn', text: 'Play alert', onclick: () => { beep(880, 0.14); setTimeout(() => beep(660, 0.18), 130); } })),
        row('Output', el('span', { style: { color: 'var(--fg-dim)' }, text: 'OpenOS Built-in Speakers' })),
      ));
      return frag;
    }

    function aboutPane() {
      const frag = el('div', {});
      frag.append(el('h2', { text: 'About' }));
      const box = el('div', { class: 'set-sec' });
      box.append(el('div', { class: 'set-row' }, el('div', { class: 'grow' },
        el('div', { style: { fontSize: '15px', fontWeight: '700' }, text: 'OpenOS 1.0' }),
        el('div', { style: { color: 'var(--fg-dim)', marginTop: '4px', lineHeight: '1.6' }, text: 'A macOS-class desktop for the browser. Vanilla JS + Express + socket.io, no bundler. Windows, settings and notes persist server-side; the filesystem is a sandboxed virtual root.' }))));
      frag.append(box);
      return frag;
    }

    renderBody();
  },
};
