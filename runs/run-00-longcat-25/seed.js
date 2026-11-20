'use strict';
// Seed the virtual home with real, writable content on first boot.
// Includes generated PNG artwork so Preview/Photos render genuine image bytes.
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { OS_HOME, SHARE_DIR } = require('./routes/fs');

// ---- minimal PNG encoder -------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(width, height, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (stride + 1) + 1 + x * 4;
      const [r, g, b, a] = px(x, y);
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), 255];

function makeGradient(stops, fx, fy) {
  return (x, y, w, h) => {
    const t = (x / w) * fx + (y / h) * fy;
    for (let i = 0; i < stops.length - 1; i++) {
      const [p1, c1] = stops[i];
      const [p2, c2] = stops[i + 1];
      if (t >= p1 && t <= p2) return mix(c1, c2, (t - p1) / (p2 - p1));
    }
    return stops[stops.length - 1][1];
  };
}

async function writePng(file, width, height, px) {
  await fs.writeFile(file, encodePNG(width, height, px));
}

async function seed() {
  await fs.mkdir(OS_HOME, { recursive: true });
  await fs.mkdir(SHARE_DIR, { recursive: true });

  const dirs = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Applications', 'Projects'];
  for (const d of dirs) await fs.mkdir(path.join(OS_HOME, d), { recursive: true });

  const files = {
    'README.md': '# Welcome to OpenOS\n\nThis folder is real. Finder talks to it through the backend API.\n\n' +
      'Try the four Finder views, rename a file, or move it to the Trash and put it back.\n',
    'Desktop/Read Me.txt': 'Double-click a desktop icon, or right-click the wallpaper for more options.\n',
    'Documents/Welcome.md': '# Welcome\n\nNotes, Calendar events, Contacts and Settings are persisted server-side.\n',
    'Documents/Project Notes.txt': 'OpenOS — browser desktop\n- Window manager with 8-way resize\n- Dock with magnification and genie minimize\n- Spotlight with fuzzy app search\n- Finder over a sandboxed filesystem API\n',
    'Documents/Budget.csv': 'Item,Amount\nCoffee,4.50\nLaptop,1299.00\nStationery,23.40\n',
    'Projects/Roadmap.txt': 'OpenOS roadmap\n1. Desktop shell + window manager\n2. Dock, Spotlight, Finder\n3. Fifteen working apps\n4. Server-side persistence\n',
    'Downloads/Release Notes.txt': 'OpenOS 1.0\n- First stable browser desktop\n',
  };

  for (const [rel, content] of Object.entries(files)) {
    const fp = path.join(OS_HOME, rel);
    try { await fs.access(fp); } catch { await fs.writeFile(fp, content, 'utf8'); }
  }

  // Vector artwork (always small, always renders).
  const svgs = {
    'Pictures/Gradient Art.svg': svgGradient(),
    'Pictures/Sunset.svg': svgSunset(),
    'Pictures/Ocean.svg': svgOcean(),
  };
  for (const [rel, content] of Object.entries(svgs)) {
    const fp = path.join(OS_HOME, rel);
    try { await fs.access(fp); } catch { await fs.writeFile(fp, content, 'utf8'); }
  }

  // Raster artwork, generated as genuine PNG bytes.
  const W = 800, H = 600;
  const art = {
    'Pictures/Gradient Art.png': makeGradient([
      [0, [94, 92, 230, 255]], [0.5, [255, 55, 95, 255]], [1, [255, 159, 10, 255]],
    ], 1, 1),
    'Pictures/Sunset.png': makeGradient([
      [0, [11, 29, 81, 255]], [0.55, [255, 126, 103, 255]], [1, [255, 200, 107, 255]],
    ], 0.2, 1),
    'Pictures/Ocean.png': makeGradient([
      [0, [10, 60, 120, 255]], [0.5, [20, 140, 190, 255]], [1, [120, 220, 230, 255]],
    ], 0.3, 1),
  };
  for (const [rel, fn] of Object.entries(art)) {
    const fp = path.join(OS_HOME, rel);
    try { await fs.access(fp); } catch { await writePng(fp, W, H, (x, y) => fn(x, y, W, H)); }
  }

  const shareFile = path.join(SHARE_DIR, 'welcome.txt');
  try { await fs.access(shareFile); } catch {
    await fs.writeFile(shareFile, 'Scratch space mounted at /tmp. Anything here is sandboxed too.\n', 'utf8');
  }
}

function svgGradient() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E5CE6"/><stop offset="0.5" stop-color="#FF375F"/><stop offset="1" stop-color="#FF9F0A"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><circle cx="190" cy="150" r="90" fill="#ffffff" opacity="0.18"/><circle cx="450" cy="260" r="140" fill="#ffffff" opacity="0.12"/></svg>`;
}
function svgSunset() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1D51"/><stop offset="0.55" stop-color="#FF7E67"/><stop offset="1" stop-color="#FFC86B"/></linearGradient></defs><rect width="640" height="400" fill="url(#s)"/><circle cx="450" cy="250" r="58" fill="#FFF3C4" opacity="0.9"/><path d="M0 330 Q160 270 320 330 T640 320 V400 H0Z" fill="#141A3A" opacity="0.75"/></svg>`;
}
function svgOcean() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A3C78"/><stop offset="1" stop-color="#78DCE6"/></linearGradient></defs><rect width="640" height="400" fill="url(#o)"/><path d="M0 250 Q160 210 320 250 T640 240 V400 H0Z" fill="#ffffff" opacity="0.25"/><path d="M0 310 Q160 270 320 310 T640 300 V400 H0Z" fill="#ffffff" opacity="0.18"/></svg>`;
}

module.exports = { seed, encodePNG };
