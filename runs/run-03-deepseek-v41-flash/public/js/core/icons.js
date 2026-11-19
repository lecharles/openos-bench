/* OpenOS icon library — hand-drawn inline SVGs (app icons + UI glyphs).
 * App icons: 100×100 squircle style. Glyphs: 24×24 stroke currentColor. */

const SQ = (bg, content, extraDefs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${extraDefs}</defs><rect x="0" y="0" width="100" height="100" rx="24" fill="${bg}"/>${content}</svg>`;

function grad(id, stops) {
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`;
}

const APP = {
  logo: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-logo', [['0', '#6ea8fe'], ['1', '#0a5cf5']])}</defs><circle cx="50" cy="50" r="42" fill="url(#g-logo)"/><path d="M18 58 h28 a6 6 0 0 1 6 6" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/></svg>`,

  finder: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-fnd', [['0', '#1fa4f2'], ['1', '#0a6ebd']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-fnd)"/><path d="M0 24 q0 -24 24 -24 h0 v100 h0 q-24 0 -24 -24 z" fill="#eaf6ff"/><rect x="0" y="0" width="50" height="100" fill="#eaf6ff"/><rect width="100" height="100" rx="24" fill="none"/><path d="M50 24 v52" stroke="#0a6ebd" stroke-width="3" stroke-linecap="round"/><ellipse cx="27" cy="44" rx="5" ry="12" fill="#123c66"/><ellipse cx="73" cy="44" rx="5" ry="12" fill="#f4fbff"/><path d="M22 66 q14 12 28 0" fill="none" stroke="#123c66" stroke-width="4.5" stroke-linecap="round"/><path d="M50 66 q14 12 26 0" fill="none" stroke="#f4fbff" stroke-width="4.5" stroke-linecap="round"/></svg>`,

  notes: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-nts', [['0', '#ffdd44'], ['1', '#ffb320']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-nts)"/><rect x="8" y="6" width="84" height="88" rx="14" fill="#fffdf5"/><rect x="8" y="6" width="84" height="20" rx="14" fill="url(#g-nts)"/><rect x="8" y="18" width="84" height="8" fill="url(#g-nts)"/><g stroke="#d8cfc0" stroke-width="4" stroke-linecap="round"><path d="M18 40 h64"/><path d="M18 54 h64"/><path d="M18 68 h44"/><path d="M18 82 h30"/></g></svg>`,

  calendar: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-cal', [['0', '#ff5f52'], ['1', '#e2261b']])}</defs><rect width="100" height="100" rx="24" fill="#fff"/><rect width="100" height="34" rx="24" fill="url(#g-cal)"/><rect y="22" width="100" height="12" fill="url(#g-cal)"/><text x="50" y="26" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">WED</text><text x="50" y="82" font-family="Arial, sans-serif" font-size="42" font-weight="600" fill="#2b2b2e" text-anchor="middle">18</text></svg>`,

  weather: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-wx', [['0', '#3fa4fb'], ['1', '#1361d8']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-wx)"/><circle cx="38" cy="38" r="17" fill="#ffd54f"/><circle cx="38" cy="38" r="21" fill="#ffd54f" opacity=".35"/><g fill="#fff"><circle cx="46" cy="62" r="14"/><circle cx="62" cy="58" r="11"/><circle cx="34" cy="66" r="10"/><rect x="34" y="58" width="30" height="18" rx="8"/></g></svg>`,

  calculator: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-clc', [['0', '#4c4c50'], ['1', '#26262a']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-clc)"/><rect x="10" y="10" width="80" height="18" rx="6" fill="#1a1a1d"/><g fill="#dcdce0"><rect x="12" y="34" width="15" height="15" rx="4"/><rect x="30" y="34" width="15" height="15" rx="4"/><rect x="48" y="34" width="15" height="15" rx="4"/><rect x="12" y="52" width="15" height="15" rx="4"/><rect x="30" y="52" width="15" height="15" rx="4"/><rect x="48" y="52" width="15" height="15" rx="4"/><rect x="12" y="70" width="15" height="15" rx="4"/><rect x="30" y="70" width="15" height="15" rx="4"/><rect x="48" y="70" width="15" height="15" rx="4"/></g><g fill="#ff9500"><rect x="66" y="34" width="15" height="15" rx="4"/><rect x="66" y="52" width="15" height="15" rx="4"/><rect x="66" y="70" width="15" height="15" rx="4"/></g></svg>`,

  preview: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-prv', [['0', '#f2f4f8'], ['1', '#d3d8e2']])}${grad('g-prv2', [['0', '#67c2f5'], ['1', '#3a8ed6']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-prv)"/><rect x="14" y="16" width="62" height="48" rx="8" fill="url(#g-prv2)"/><circle cx="34" cy="32" r="7" fill="#ffe27a"/><path d="M14 52 l16 -14 12 11 10 -9 24 20 v3 q0 2 -2 2 h-58 q-2 0 -2 -2 z" fill="#7ed08a"/><path d="M14 54 l16 -12 12 10 10 -8 24 18 v0 q0 2 -2 2 h-58 q-2 0 -2 -2 z" fill="#4faf63"/><g stroke="#3a4b66" stroke-width="5" fill="none"><circle cx="62" cy="66" r="17"/><path d="M74 78 l12 12" stroke-linecap="round"/></g></svg>`,

  trash: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-trs', [['0', '#bfc4cf'], ['1', '#7e8492']])}</defs><path d="M28 30 h44 l-6 62 q-1 6 -7 6 h-18 q-6 0 -7 -6 z" fill="url(#g-trs)" opacity=".9"/><g stroke="#5c6070" stroke-width="3" stroke-linecap="round"><path d="M38 38 l4 46"/><path d="M50 38 l0 46"/><path d="M62 38 l-4 46"/></g><path d="M22 30 q0 -5 5 -5 h46 q5 0 5 5 v0 q0 3 -3 3 h-50 q-3 0 -3 -3 z" fill="#9aa0ad"/><rect x="41" y="18" width="18" height="6" rx="3" fill="#9aa0ad"/><g stroke="#6b7180" stroke-width="4" stroke-linecap="round"><path d="M20 26 h60"/></g></svg>`,

  trashFull: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-trf', [['0', '#bfc4cf'], ['1', '#7e8492']])}</defs><path d="M28 30 h44 l-6 62 q-1 6 -7 6 h-18 q-6 0 -7 -6 z" fill="url(#g-trf)" opacity=".92"/><g stroke="#5c6070" stroke-width="3" stroke-linecap="round"><path d="M38 38 l4 46"/><path d="M50 38 l0 46"/><path d="M62 38 l-4 46"/></g><path d="M22 30 q0 -5 5 -5 h46 q5 0 5 5 v0 q0 3 -3 3 h-50 q-3 0 -3 -3 z" fill="#9aa0ad"/><rect x="41" y="18" width="18" height="6" rx="3" fill="#9aa0ad"/><path d="M34 8 l10 4 -6 8 12 2 -4 -10 10 -2 -12 -4 4 8 z" fill="#fff" stroke="#c9c9c9" stroke-width="1.5"/><circle cx="52" cy="12" r="7" fill="#f3f3f3" stroke="#c9c9c9" stroke-width="1.5"/></svg>`,

  settings: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-set', [['0', '#9aa5b5'], ['1', '#5d6879']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-set)"/><g transform="translate(50 50)"><g fill="#e9edf4">${[0, 45, 90, 135].map((a) => `<g transform="rotate(${a})"><rect x="-5" y="-46" width="10" height="16" rx="4"/><rect x="-5" y="30" width="10" height="16" rx="4"/><rect x="-46" y="-5" width="16" height="10" rx="4"/></g>`).join('')}</g><circle r="31" fill="#e9edf4"/><circle r="14" fill="#6b7686"/></g></svg>`,

  clock: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-ckl', [['0', '#ffffff'], ['1', '#e4e7ec']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-ckl)"/><circle cx="50" cy="50" r="38" fill="#fff" stroke="#c4c9d4" stroke-width="2"/><g stroke="#22262e" stroke-width="3.4" stroke-linecap="round">${[0, 90, 180, 270].map((a) => `<path d="M50 16 v7" transform="rotate(${a} 50 50)"/>`).join('')}${[45, 135, 225, 315].map((a) => `<path d="M50 20 v5" transform="rotate(${a} 50 50)"/>`).join('')}</g><path d="M50 50 L50 28" stroke="#22262e" stroke-width="4.6" stroke-linecap="round"/><path d="M50 50 L68 58" stroke="#22262e" stroke-width="4.6" stroke-linecap="round"/><path d="M50 50 L40 72" stroke="#ff3b30" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="50" r="3.4" fill="#22262e"/></svg>`,

  contacts: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-ctc', [['0', '#f7f2e8'], ['1', '#e3d9c8']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-ctc)"/><rect x="0" y="0" width="26" height="100" fill="#b0603a"/><rect x="6" y="10" width="10" height="16" rx="3" fill="#8a4a2c"/><rect x="6" y="34" width="10" height="16" rx="3" fill="#8a4a2c"/><rect x="6" y="58" width="10" height="16" rx="3" fill="#8a4a2c"/><circle cx="62" cy="42" r="15" fill="#b0603a"/><path d="M38 84 q2 -24 24 -24 q22 0 24 24 z" fill="#b0603a"/></svg>`,

  music: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-mus', [['0', '#fa5c74'], ['1', '#f5336e']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-mus)"/><g fill="#fff"><path d="M46 70 v-32 l24 -6 v30" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="70" r="9"/><circle cx="64" cy="62" r="9"/></g></svg>`,

  mail: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-ml', [['0', '#1fb6fc'], ['1', '#1170f5']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-ml)"/><rect x="16" y="28" width="68" height="46" rx="7" fill="#fff"/><path d="M18 32 l32 25 32 -25" fill="none" stroke="#1170f5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  terminal: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-trm', [['0', '#3a3a3f'], ['1', '#17171a']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-trm)"/><rect width="100" height="18" rx="24" fill="#48484e"/><rect y="12" width="100" height="6" fill="#48484e"/><text x="18" y="58" font-family="monospace" font-size="26" font-weight="700" fill="#7ee787">&gt;_</text></svg>`,

  photos: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#fff"/><g transform="translate(50 50)" opacity=".92">${['#ffd233', '#ff8f3f', '#ff5c69', '#ff4fa0', '#e865f0', '#8f6cf5', '#4f9bf5', '#37cbb0'].map((c, i) => `<ellipse cx="0" cy="-19" rx="10.5" ry="19" fill="${c}" transform="rotate(${i * 45})"/>`).join('')}</g><circle cx="50" cy="50" r="8" fill="#fff" opacity=".9"/></svg>`,

  textedit: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-ted', [['0', '#ffffff'], ['1', '#eceef2']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-ted)"/><g stroke="#c3c7d2" stroke-width="5" stroke-linecap="round"><path d="M16 26 h50"/><path d="M16 44 h50"/><path d="M16 62 h34"/><path d="M16 80 h24"/></g><g transform="rotate(42 66 62)"><rect x="58" y="30" width="14" height="52" rx="2" fill="#f5b93c"/><path d="M58 82 l7 10 7 -10 z" fill="#5c5f6b"/><rect x="58" y="24" width="14" height="8" rx="2" fill="#e06c5f"/></g></svg>`,

  about: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-abt', [['0', '#6ea8fe'], ['1', '#0a5cf5']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-abt)"/><path d="M18 58 h28 a6 6 0 0 1 6 6" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/></svg>`,

  folder: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-fld', [['0', '#54b5f7'], ['1', '#2a8be8']])}${grad('g-fld2', [['0', '#6ec3f9'], ['1', '#3f9def']])}</defs><path d="M8 28 q0 -8 8 -8 h22 l8 9 h38 q8 0 8 8 v6 h-84 z" fill="url(#g-fld2)"/><rect x="8" y="36" width="84" height="46" rx="8" fill="url(#g-fld)"/></svg>`,

  fileText: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 8 h44 l16 16 v68 q0 6 -6 6 h-54 q-6 0 -6 -6 z" fill="#fff" stroke="#c4c8d2" stroke-width="2"/><path d="M64 8 l16 16 h-16 z" fill="#e8eaf0"/><g stroke="#b4b8c4" stroke-width="4.5" stroke-linecap="round"><path d="M30 44 h40"/><path d="M30 58 h40"/><path d="M30 72 h26"/></g></svg>`,

  fileImage: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-fim', [['0', '#6ec9f5'], ['1', '#3795e8']])}</defs><path d="M20 8 h44 l16 16 v68 q0 6 -6 6 h-54 q-6 0 -6 -6 z" fill="#fff" stroke="#c4c8d2" stroke-width="2"/><path d="M64 8 l16 16 h-16 z" fill="#e8eaf0"/><rect x="28" y="42" width="44" height="30" rx="4" fill="url(#g-fim)"/><circle cx="40" cy="52" r="4.5" fill="#ffe27a"/><path d="M28 66 l10 -8 8 6 10 -9 16 13 v0 q0 4 -4 4 h-36 q-4 0 -4 -4 z" fill="#57c06a"/></svg>`,

  fileGeneric: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 8 h44 l16 16 v68 q0 6 -6 6 h-54 q-6 0 -6 -6 z" fill="#fff" stroke="#c4c8d2" stroke-width="2"/><path d="M64 8 l16 16 h-16 z" fill="#e8eaf0"/></svg>`,

  launchpad: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad('g-lp', [['0', '#f5f6fa'], ['1', '#d5d8e0']])}</defs><rect width="100" height="100" rx="24" fill="url(#g-lp)"/><g>${['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#ff8787'].map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    return `<circle cx="${34 + col * 16}" cy="${34 + row * 16}" r="6.5" fill="${c}"/>`;
  }).join('')}</g></svg>`,
};

const GLYPH_STROKE = (d, w = 1.8) => `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

const GLYPHS = {
  search: (v) => GLYPH_STROKE(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3 L20 20"/>`),
  wifi: (v) => GLYPH_STROKE(`<path d="M2.5 9.5 a14.5 14.5 0 0 1 19 0"/><path d="M5.5 13 a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16.5 a4.5 4.5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor" stroke="none"/>`),
  battery: (v) => `<g fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="8" width="17.5" height="9" rx="2.6"/><path d="M21.5 11 v3"/></g><rect x="3.6" y="9.6" width="10" height="5.8" rx="1.2" fill="currentColor"/>`,
  cc: (v) => `<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3.5" width="8.5" height="6" rx="3"/><rect x="12.5" y="14.5" width="8.5" height="6" rx="3"/></g><circle cx="6.8" cy="6.5" r="1.5" fill="currentColor"/><circle cx="17.2" cy="17.5" r="1.5" fill="currentColor"/>`,
  moon: (v) => `<path d="M20.2 14.2 A8.5 8.5 0 1 1 9.8 3.8 A7 7 0 0 0 20.2 14.2 z" fill="currentColor"/>`,
  sun: (v) => GLYPH_STROKE(`<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/>`),
  speaker: (v) => `<path d="M4 9.2 v5.6 h3.4 L12 18.6 V5.4 L7.4 9.2 z" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 9.5 a4 4 0 0 1 0 5"/><path d="M17.5 7.2 a7.4 7.4 0 0 1 0 9.6"/></g>`,
  chevronL: (v) => GLYPH_STROKE(`<path d="M14.5 5.5 L8 12 l6.5 6.5"/>`, 2),
  chevronR: (v) => GLYPH_STROKE(`<path d="M9.5 5.5 L16 12 l-6.5 6.5"/>`, 2),
  chevronD: (v) => GLYPH_STROKE(`<path d="M5.5 9.5 L12 16 l6.5 -6.5"/>`, 2),
  close: (v) => GLYPH_STROKE(`<path d="M6 6 L18 18 M18 6 L6 18"/>`, 2.2),
  plus: (v) => GLYPH_STROKE(`<path d="M12 5 v14 M5 12 h14"/>`, 2),
  minus: (v) => GLYPH_STROKE(`<path d="M5 12 h14"/>`, 2.2),
  check: (v) => GLYPH_STROKE(`<path d="M4.5 12.5 L9.5 17.5 L19.5 7"/>`, 2.2),
  gearS: (v) => GLYPH_STROKE(`<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.1 5.1l1.9 1.9M17 17l1.9 1.9M18.9 5.1L17 7M7 17l-1.9 1.9"/>`),
  grid: (v) => `<g fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></g>`,
  list: (v) => GLYPH_STROKE(`<path d="M4 6.5 h16 M4 12 h16 M4 17.5 h16"/>`, 2),
  play: (v) => `<path d="M7 4.8 L19 12 L7 19.2 z" fill="currentColor"/>`,
  pause: (v) => `<g fill="currentColor"><rect x="6" y="4.5" width="4.4" height="15" rx="1.4"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4"/></g>`,
  prev: (v) => `<g fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1.2"/><path d="M19 5.5 L9 12 L19 18.5 z"/></g>`,
  next: (v) => `<g fill="currentColor"><rect x="16.4" y="5" width="2.6" height="14" rx="1.2"/><path d="M5 5.5 L15 12 L5 18.5 z"/></g>`,
  reply: (v) => GLYPH_STROKE(`<path d="M9 5 L3.5 10.5 9 16"/><path d="M3.5 10.5 h10 a7 7 0 0 1 7 7 v2"/>`),
  compose: (v) => GLYPH_STROKE(`<path d="M4 20 l1 -4.5 L16.5 4 a2.1 2.1 0 0 1 3 0 l0.5 0.5 a2.1 2.1 0 0 1 0 3 L8 19 z"/><path d="M14.5 6 L18 9.5"/>`),
  archive: (v) => GLYPH_STROKE(`<rect x="3.5" y="5" width="17" height="5.5" rx="1.5"/><path d="M5.5 10.5 v7 q0 1.5 1.5 1.5 h10 q1.5 0 1.5 -1.5 v-7"/><path d="M10 14 h4"/>`),
  trashS: (v) => GLYPH_STROKE(`<path d="M4.5 6.5 h15"/><path d="M7 6.5 l1 12.5 q0 1.5 1.5 1.5 h5 q1.5 0 1.5 -1.5 l1 -12.5"/><path d="M9.5 6.5 v-2 q0 -1.5 1.5 -1.5 h2 q1.5 0 1.5 1.5 v2"/>`),
  folderS: (v) => GLYPH_STROKE(`<path d="M3.5 7 q0 -1.5 1.5 -1.5 h4.5 l2 2.5 h8 q1.5 0 1.5 1.5 v8 q0 1.5 -1.5 1.5 h-14.5 q-1.5 0 -1.5 -1.5 z"/>`),
  docS: (v) => GLYPH_STROKE(`<path d="M6 3.5 h8 l4 4 v13 h-12 z"/><path d="M14 3.5 v4 h4"/>`),
  imageS: (v) => GLYPH_STROKE(`<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4.5 17 l5 -5 4 3.5 3 -2.5 4 4"/>`),
  star: (v) => `<path d="M12 3.5 l2.6 5.3 5.9 .9 -4.2 4.1 1 5.8 -5.3 -2.8 -5.3 2.8 1 -5.8 -4.2 -4.1 5.9 -.9 z" fill="currentColor"/>`,
  ellipsis: (v) => `<g fill="currentColor"><circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/></g>`,
  arrowL: (v) => GLYPH_STROKE(`<path d="M19 12 H5"/><path d="M10.5 6.5 L5 12 l5.5 5.5"/>`),
  arrowR: (v) => GLYPH_STROKE(`<path d="M5 12 h14"/><path d="M13.5 6.5 L19 12 l-5.5 5.5"/>`),
  homeS: (v) => GLYPH_STROKE(`<path d="M4 11 L12 4 l8 7"/><path d="M6.5 9.5 v9.5 h11 V9.5"/>`),
  lock: (v) => GLYPH_STROKE(`<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8 10.5 v-3 q0 -4 4 -4 q4 0 4 4 v3"/>`),
  power: (v) => GLYPH_STROKE(`<path d="M12 3.5 v8"/><path d="M6.8 6.8 a7.5 7.5 0 1 0 10.4 0"/>`),
  restart: (v) => GLYPH_STROKE(`<path d="M4.5 12 a7.5 7.5 0 1 1 2.2 5.3"/><path d="M4.5 13.5 v3.8 h3.8"/>`),
  arrowD: (v) => GLYPH_STROKE(`<path d="M12 4 v11"/><path d="M7 11 l5 5 5 -5"/><path d="M5 19.5 h14"/>`),
  clockS: (v) => GLYPH_STROKE(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7 v5.2 l3.4 2"/>`),
  infoS: (v) => GLYPH_STROKE(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11 v5"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/>`),
  displayS: (v) => GLYPH_STROKE(`<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M9 20 h6 M12 16.5 V20"/>`),
  dndS: (v) => `<path d="M12 3.5 a8.5 8.5 0 1 0 8.5 8.5 a8.5 8.5 0 0 0 -8.5 -8.5 z" fill="currentColor"/><path d="M8 12 h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  person: (v) => GLYPH_STROKE(`<circle cx="12" cy="8" r="4"/><path d="M4.5 20 q1.5 -6.5 7.5 -6.5 q6 0 7.5 6.5"/>`),
  docNew: (v) => GLYPH_STROKE(`<path d="M6 3.5 h8 l4 4 v13 h-12 z"/><path d="M14 3.5 v4 h4"/><path d="M15 13.5 h6 M18 10.5 v6"/>`),
  zoomIn: (v) => GLYPH_STROKE(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3 L20 20 M7.5 10.5 h6 M10.5 7.5 v6"/>`),
  zoomOut: (v) => GLYPH_STROKE(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3 L20 20 M7.5 10.5 h6"/>`),
  fit: (v) => GLYPH_STROKE(`<path d="M4 8 V4 h4 M16 4 h4 v4 M20 16 v4 h-4 M8 20 H4 v-4"/>`, 1.7),
  rotate: (v) => GLYPH_STROKE(`<path d="M6 6 a7 7 0 1 1 -1 8"/><path d="M6 2.5 V6 h3.5"/>`),
  sidebarT: (v) => GLYPH_STROKE(`<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5 v15"/>`),
  send: (v) => GLYPH_STROKE(`<path d="M20 3.5 L3.5 10.5 l6 3 2.5 6.5 z"/><path d="M20 3.5 L11.5 13.5"/>`),
  shuffle: (v) => GLYPH_STROKE(`<path d="M3.5 6.5 h3 q8 0 9 9 q.6 3 4.5 3 h.5"/><path d="M3.5 17.5 h3 q5 0 7.5 -6"/><path d="M17 4 l3 2.5 -3 2.5 M17 15 l3 2.5 -3 2.5"/>`),
  logoGlyph: (v) => `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.2"/><path d="M8 14.5 h4.6 a1.6 1.6 0 0 1 1.6 1.6"/></g>`,
};

export function icon(name, size) {
  const dim = size ? ` width="${size}" height="${size}"` : '';
  if (APP[name]) return APP[name]().replace('<svg ', `<svg${dim} `);
  const g = GLYPHS[name] || GLYPHS.logoGlyph;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${dim}>${g()}</svg>`;
}

export function iconForEntry(entry) {
  if (entry.isDir || entry.kind === 'folder') return 'folder';
  if (entry.kind === 'image') return 'fileImage';
  if (entry.kind === 'text') return 'fileText';
  return 'fileGeneric';
}
