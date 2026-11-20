import { el, fmtBytes, fmtStamp } from '../core/util.js';
import { FS } from '../core/fsapi.js';
import { folderSVG, fileSVG, logoSVG } from '../core/icons.js';
import { kindLabel } from '../core/openwith.js';
import { launch } from '../core/launch.js';

export const GETINFO_APP = {
  id: 'getinfo',
  name: 'Get Info',
  hidden: true,
  singleton: false,
  size: { w: 320, h: 400 },
  minW: 280, minH: 260,
  mount(root, api) {
    const e = api.params.entry || { name: 'Unknown', kind: 'file', path: '' };
    api.setTitle(`${e.name} Info`);
    root.append(el('div', { class: 'gi' },
      el('div', { class: 'gi-top' },
        el('div', { class: 'v', html: e.kind === 'dir' ? folderSVG(58) : e.image ? `<img src="${FS.rawUrl(e.path)}">` : fileSVG(e) }),
        el('div', {}, el('div', { class: 'gi-name', text: e.name }), el('div', { style: { fontSize: '11.5px', color: 'var(--fg-dim)' }, text: kindLabel(e) }))),
      el('table', {},
        row('Kind', kindLabel(e)),
        row('Size', e.kind === 'dir' ? '--' : fmtBytes(e.size || 0)),
        row('Where', '/' + (e.path || 'OpenOS')),
        row('Created', e.ctime ? fmtStamp(e.ctime) : 'unknown'),
        row('Modified', e.mtime ? fmtStamp(e.mtime) : 'unknown'))));
    function row(k, v) { return el('tr', {}, el('td', { text: k }), el('td', { text: v })); }
  },
};

export const ABOUT_APP = {
  id: 'about',
  name: 'About This Mac',
  hidden: true,
  singleton: true,
  size: { w: 340, h: 430 },
  minW: 300, minH: 300,
  mount(root, api) {
    root.append(el('div', { class: 'about-win' }, el('div', { class: 'logo', html: logoSVG() })));
    fetch('/api/system').then((r) => r.json()).then((sys) => {
      root.querySelector('.about-win').append(
        el('h2', { text: 'OpenOS' }),
        el('div', { class: 'ver', text: `${sys.version} — Bench Build` }),
        el('div', { class: 'specs' },
          el('div', { text: `Display: ${innerWidth}×${innerHeight} Retina` }),
          el('div', { text: `Chip: ${sys.cpuModel.replace(/\s+/g, ' ').slice(0, 40)}` }),
          el('div', { text: `Cores: ${sys.cpus}` }),
          el('div', { text: `Memory: ${(sys.memTotal / 1073741824).toFixed(1)} GB` }),
          el('div', { text: `Kernel: ${sys.platform}` }),
          el('div', { text: `Node: ${sys.node}` }),
          el('div', { text: `Uptime: ${Math.floor(sys.serverUptime / 60)} min` }),
          el('div', { text: `Hostname: ${sys.hostname}` })),
        el('button', { class: 'os-btn primary', style: { marginTop: '10px' }, text: 'System Settings…', onclick: () => launch('settings') }));
    }).catch(() => {});
  },
};

export function showGetInfo(entry) {
  launch('getinfo', { params: { entry }, forceNew: true });
}
