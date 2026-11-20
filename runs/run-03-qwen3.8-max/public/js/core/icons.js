/* Procedural SVG icon set — every app icon drawn by hand, macOS-style squircle. */
let uc = 0;
const nid = () => `i${++uc}`;

function svgWrap(inner, extraDefs = '') {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${extraDefs ? `<defs>${extraDefs}</defs>` : ''}${inner}</svg>`;
}
function grad(id, c1, c2, angle = 'y') {
  const coords = angle === 'x' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
  return `<linearGradient id="${id}" ${coords}><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
}
const sq = (fill) => `<rect width="64" height="64" rx="14.2" fill="${fill}"/>`;

const APP_ICONS = {
  finder() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <path d="M32 8v48" stroke="rgba(0,40,110,.35)" stroke-width="1.6"/>
       <path d="M14 12c0 0 6-2 18-2v44c-12 0-18-2-18-2z" fill="rgba(255,255,255,.16)"/>
       <ellipse cx="23" cy="27" rx="2.6" ry="5" fill="#08265c"/>
       <ellipse cx="41" cy="27" rx="2.6" ry="5" fill="#08265c"/>
       <path d="M18 40c4 6 10 8 14 8s10-2 14-8" stroke="#08265c" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      grad(g, '#7ac9ff', '#0a62e8'));
  },
  notes() {
    return svgWrap(
      `<rect width="64" height="64" rx="14.2" fill="#fff"/>
       <path d="M0 14.2A14.2 14.2 0 0 1 14.2 0h35.6A14.2 14.2 0 0 1 64 14.2V22H0z" fill="#ffd60a"/>
       <path d="M0 22h64v3H0z" fill="rgba(0,0,0,.07)"/>
       <g stroke="#c7c7cc" stroke-width="2.6" stroke-linecap="round">
         <path d="M13 34h38M13 42h38M13 50h26"/></g>`);
  },
  calendar() {
    const d = new Date();
    const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
    return svgWrap(
      `<rect width="64" height="64" rx="14.2" fill="#fff"/>
       <path d="M0 14.2A14.2 14.2 0 0 1 14.2 0h35.6A14.2 14.2 0 0 1 64 14.2V16H0z" fill="#ff3b30"/>
       <text x="32" y="12.6" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="8.6" font-weight="700" fill="#fff" letter-spacing="1">${dow}</text>
       <text x="32" y="49" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="30" font-weight="300" fill="#1c1c1e">${d.getDate()}</text>`);
  },
  weather() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <circle cx="26" cy="25" r="11" fill="#ffd60a"/>
       <g fill="#fff">
         <circle cx="27" cy="40" r="8.5"/><circle cx="37" cy="37" r="10.5"/><circle cx="46" cy="41" r="7.5"/>
         <rect x="24" y="39" width="26" height="9.6" rx="4.8"/></g>`,
      grad(g, '#59b7ff', '#0a5ad4'));
  },
  calculator() {
    return svgWrap(
      `${sq('#2a2a2e')}
       <rect x="11" y="9" width="42" height="12" rx="3" fill="#3f3f44"/>
       <text x="49" y="18.6" text-anchor="end" font-family="Helvetica,Arial" font-size="9.5" fill="#e8e8ea">1,024</text>
       <g fill="#59595e">
         <rect x="11" y="25" width="9" height="8" rx="2"/><rect x="22.5" y="25" width="9" height="8" rx="2"/><rect x="34" y="25" width="9" height="8" rx="2"/>
         <rect x="11" y="35.5" width="9" height="8" rx="2"/><rect x="22.5" y="35.5" width="9" height="8" rx="2"/><rect x="34" y="35.5" width="9" height="8" rx="2"/>
         <rect x="11" y="46" width="9" height="8" rx="2"/><rect x="22.5" y="46" width="9" height="8" rx="2"/><rect x="34" y="46" width="9" height="8" rx="2"/></g>
       <g fill="#ff9f0a">
         <rect x="45.5" y="25" width="7.5" height="8" rx="2"/><rect x="45.5" y="35.5" width="7.5" height="8" rx="2"/><rect x="45.5" y="46" width="7.5" height="8" rx="2"/></g>`);
  },
  photos() {
    const petals = [];
    const cols = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de'];
    for (let i = 0; i < 8; i++) {
      petals.push(`<ellipse cx="32" cy="19.5" rx="7.4" ry="12.6" fill="${cols[i]}" opacity=".92" transform="rotate(${i * 45} 32 32)"/>`);
    }
    return svgWrap(`${sq('#fff')}${petals.join('')}<circle cx="32" cy="32" r="5.5" fill="#fff" opacity=".85"/>`);
  },
  music() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <path d="M41 13.5 25.5 17v24.2a7 7 0 1 0 3 5.8V24.6l12.5-2.9v13.6a7 7 0 1 0 3 5.8V13.5z" fill="#fff" transform="translate(0,-1)"/>`,
      grad(g, '#fb5c74', '#f3142f'));
  },
  mail() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <rect x="10" y="17" width="44" height="30" rx="5" fill="#fff"/>
       <path d="M11.5 19.5 32 35l20.5-15.5" stroke="#1d7bf0" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`,
      grad(g, '#39a1ff', '#0a58d0'));
  },
  terminal() {
    return svgWrap(
      `${sq('#161619')}
       <rect x="7" y="10" width="50" height="44" rx="6" fill="#0c0c0e"/>
       <rect x="7" y="10" width="50" height="7" rx="3.5" fill="#2c2c30"/>
       <circle cx="12" cy="13.5" r="1.5" fill="#ff5f57"/><circle cx="17" cy="13.5" r="1.5" fill="#febc2e"/><circle cx="22" cy="13.5" r="1.5" fill="#28c840"/>
       <path d="M13 26l7 6-7 6" stroke="#30d158" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M25 38h13" stroke="#30d158" stroke-width="3" stroke-linecap="round"/>`);
  },
  preview() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <rect x="12" y="14" width="40" height="30" rx="4" fill="#fff"/>
       <path d="M12 38l11-11 9 9 7-7 13 12v-1a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#34c759"/>
       <circle cx="41" cy="23" r="4" fill="#ffd60a"/>
       <circle cx="38" cy="42" r="9.5" fill="none" stroke="#fff" stroke-width="3.4"/>
       <path d="M45 49l8 8" stroke="#fff" stroke-width="4.4" stroke-linecap="round"/>`,
      grad(g, '#9d7bfa', '#5b34d8'));
  },
  textedit() {
    return svgWrap(
      `${sq('#f7f7fa')}
       <path d="M14 8h26l10 10v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff" stroke="#d5d5da" stroke-width="1"/>
       <path d="M40 8l10 10h-10z" fill="#e2e2e8"/>
       <g stroke="#a9a9b2" stroke-width="2.2" stroke-linecap="round"><path d="M18 26h20M18 33h28M18 40h28M18 47h16"/></g>
       <path d="M46.5 30.5l7 7-16 16-9 2.5 2.5-9z" fill="#0a84ff" stroke="#0a62c8" stroke-width="1.4" stroke-linejoin="round"/>
       <path d="M44.5 32.5l7 7" stroke="#fff" stroke-width="1.6"/>`);
  },
  settings() {
    const teeth = [];
    for (let i = 0; i < 8; i++) teeth.push(`<rect x="28.6" y="7" width="6.8" height="12" rx="3" fill="url(#${'g'})" transform="rotate(${i * 45} 32 32)"/>`);
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <g fill="#e9e9ee">
         ${Array.from({ length: 8 }, (_, i) => `<rect x="28.7" y="8" width="6.6" height="13" rx="3.2" transform="rotate(${i * 45} 32 32)"/>`).join('')}
         <circle cx="32" cy="32" r="14.5"/>
       </g>
       <circle cx="32" cy="32" r="6.6" fill="#48484e"/>`,
      grad(g, '#8e8e93', '#48484e'));
  },
  clock() {
    const ticks = [];
    for (let i = 0; i < 12; i++) ticks.push(`<rect x="31.1" y="6.5" width="1.8" height="${i % 3 === 0 ? 5 : 3}" rx=".9" fill="#1c1c1e" transform="rotate(${i * 30} 32 32)"/>`);
    return svgWrap(
      `${sq('#fff')}
       <circle cx="32" cy="32" r="27.5" fill="none" stroke="#1c1c1e" stroke-width="2"/>
       ${ticks.join('')}
       <path d="M32 32 32 15.5" stroke="#1c1c1e" stroke-width="3.4" stroke-linecap="round"/>
       <path d="M32 32 43 38" stroke="#1c1c1e" stroke-width="3.4" stroke-linecap="round"/>
       <path d="M32 34.5 24 43" stroke="#ff9500" stroke-width="1.8" stroke-linecap="round"/>
       <circle cx="32" cy="32" r="2.4" fill="#ff9500"/>`);
  },
  contacts() {
    return svgWrap(
      `${sq('#f2f2f5')}
       <rect x="8" y="6" width="48" height="52" rx="6" fill="#fff" stroke="#e0e0e5"/>
       <circle cx="27" cy="26" r="8.5" fill="#8e8e93"/>
       <path d="M14 46c1.5-8.5 7-12 13-12s11.5 3.5 13 12z" fill="#8e8e93"/>
       <g stroke="#d8d8de" stroke-width="2.4" stroke-linecap="round"><path d="M44 22h10M44 29h10M44 36h7"/></g>`);
  },
  trash(opts = {}) {
    const full = opts.full;
    return svgWrap(
      `${sq('rgba(120,120,128,0.18)')}
       ${full ? '<path d="M20 18c2-4 6-6 12-6s10 2 12 6l-2 6H22z" fill="#e8e8ea" stroke="#b9b9c0"/>' : ''}
       <path d="M17 22h30l-3 30a5 5 0 0 1-5 4.5H25a5 5 0 0 1-5-4.5z" fill="#d9d9de" stroke="#a9a9b2" stroke-width="1.2"/>
       <g stroke="#a9a9b2" stroke-width="1.6"><path d="M26 27v24M32 27v24M38 27v24"/></g>
       <rect x="14" y="18" width="36" height="5.5" rx="2.7" fill="#c9c9d0" stroke="#a9a9b2" stroke-width="1.2"/>
       <rect x="26" y="14" width="12" height="4.5" rx="2.2" fill="#c9c9d0" stroke="#a9a9b2" stroke-width="1.2"/>`);
  },
  spotlight() {
    const g = nid();
    return svgWrap(
      `${sq(`url(#${g})`)}
       <circle cx="28" cy="28" r="12" fill="none" stroke="#fff" stroke-width="4"/>
       <path d="M37 37l12 12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
      grad(g, '#7a7a85', '#3a3a42'));
  },
};

export function appIconSVG(id, opts) {
  const fn = APP_ICONS[id] || APP_ICONS.settings;
  return fn(opts || {});
}

export function logoSVG(cls = '') {
  const g = nid();
  return `<svg class="${cls}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".5" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>
    <circle cx="60" cy="60" r="34" fill="none" stroke="url(#${g})" stroke-width="7"/>
    <circle cx="60" cy="60" r="16" fill="url(#${g})"/>
    <path d="M60 12v18M60 90v18M12 60h18M90 60h18" stroke="url(#${g})" stroke-width="7" stroke-linecap="round"/></svg>`;
}

export function folderSVG(size = 56) {
  const g = nid();
  return `<svg viewBox="0 0 64 52" width="${size}" height="${size * 52 / 64}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#2f8bf5"/></linearGradient></defs>
    <path d="M3 10a5 5 0 0 1 5-5h14l5 6h29a5 5 0 0 1 5 5v4H3z" fill="#4aa0f8"/>
    <path d="M3 14h58v30a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" fill="url(#${g})"/>
    <path d="M3 14h58v3H3z" fill="rgba(255,255,255,.35)"/></svg>`;
}

const FILE_BADGE = { txt: '#8e8e93', md: '#8e8e93', csv: '#34c759', json: '#ff9f0a', m3u: '#ff375f', pdf: '#ff3b30', log: '#8e8e93' };
export function fileSVG(entry) {
  const ext = (entry.ext || (entry.name || '').split('.').pop() || '').toLowerCase();
  const badge = FILE_BADGE[ext] || '#0a84ff';
  const lines = ext === 'csv' || ext === 'json' ? 5 : 4;
  return `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4a4 4 0 0 1 4-4h22l12 12v42a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#fff" stroke="#d0d0d6"/>
    <path d="M32 0l12 12H32z" fill="#e4e4ea"/>
    <g stroke="#c2c2ca" stroke-width="2" stroke-linecap="round">${Array.from({ length: lines }, (_, i) => `<path d="M13 ${24 + i * 6}h${i === lines - 1 ? 14 : 22}"/>`).join('')}</g>
    <rect x="26" y="42" width="18" height="12" rx="3" fill="${badge}"/>
    <text x="35" y="51" text-anchor="middle" font-family="Helvetica,Arial" font-size="7.4" font-weight="700" fill="#fff">${(ext || 'file').slice(0, 4).toUpperCase()}</text></svg>`;
}

export function wxIconSVG(kind) {
  const sun = `<circle cx="12" cy="12" r="5.2" fill="#ffd60a"/>`;
  const rays = Array.from({ length: 8 }, (_, i) => `<path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" stroke="#ffd60a" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  const cloud = (fill = '#fff') => `<g fill="${fill}"><circle cx="9.5" cy="14.5" r="3.4"/><circle cx="13.6" cy="13" r="4.2"/><circle cx="17" cy="15" r="3"/><rect x="8.6" y="14.6" width="10.6" height="3.8" rx="1.9"/></g>`;
  switch (kind) {
    case 'clear': return `<svg viewBox="0 0 24 24">${rays}${sun}</svg>`;
    case 'partly': return `<svg viewBox="0 0 24 24"><g transform="translate(4,-3) scale(.82)">${rays}${sun}</g>${cloud()}</svg>`;
    case 'cloud': return `<svg viewBox="0 0 24 24">${cloud('#e8e8ef')}${cloud('#fff').replace('translate', 'x')}</svg>`;
    case 'rain': return `<svg viewBox="0 0 24 24">${cloud('#dfe4ee')}<g stroke="#5ac8fa" stroke-width="1.7" stroke-linecap="round"><path d="M10 20l-1 2.6M14 20l-1 2.6M18 20l-1 2.6"/></g></svg>`;
    case 'storm': return `<svg viewBox="0 0 24 24">${cloud('#c9cede')}<path d="M13 18l-3 4h3l-1.6 3.4" stroke="#ffd60a" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg>`;
    default: return `<svg viewBox="0 0 24 24">${sun}</svg>`;
  }
}

export const trashFull = (full) => appIconSVG('trash', { full });
