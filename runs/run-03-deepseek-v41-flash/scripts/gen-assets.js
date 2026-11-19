'use strict';
/* OpenOS — deterministic PNG asset generator (no external deps).
 * Produces real PNG image files used by Photos / Preview / Desktop / Settings.
 * Encoding: hand-rolled PNG writer (IHDR + IDAT via zlib.deflateSync + CRC32). */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------- PNG encoding ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(w, h, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const base = y * (w * 4 + 1);
    rows[base] = 0;
    for (let x = 0; x < w; x++) {
      const px = pixelFn(x, y);
      const o = base + 1 + x * 4;
      rows[o] = px[0]; rows[o + 1] = px[1]; rows[o + 2] = px[2];
      rows[o + 3] = px.length > 3 ? px[3] : 255;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- helpers ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function vgrad(stops, t) {
  t = clamp(t, 0, 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p1, c1] = stops[i], [p2, c2] = stops[i + 1];
    if (t >= p1 && t <= p2) return mix(c1, c2, smooth((t - p1) / (p2 - p1 || 1)));
  }
  return stops[stops.length - 1][1];
}

/* ---------- scenes (1200x800) ---------- */
const W = 1200, H = 800;

function sceneSunset() {
  const sky = [[0, [26, 22, 66]], [0.42, [122, 46, 98]], [0.62, [226, 92, 78]], [0.75, [255, 158, 87]], [1, [255, 206, 140]]];
  const sunX = 620, sunY = 520, sunR = 70;
  return (x, y) => {
    let c = vgrad(sky, y / H);
    const d = Math.hypot(x - sunX, y - sunY);
    if (d < sunR * 3.2) {
      const glow = Math.max(0, 1 - d / (sunR * 3.2));
      c = mix(c, [255, 214, 150], glow * glow * 0.55);
    }
    if (d < sunR) c = mix(c, [255, 238, 190], 1 - smooth(d / sunR) * 0.25);
    if (y > 640) { // sea band + reflection
      const t = smooth((y - 640) / 160);
      c = mix(c, [30, 20, 55], t * 0.85);
      if (Math.abs(x - sunX) < 90 + Math.sin(y * 0.35) * 26 && y > 640) {
        c = mix(c, [255, 190, 120], 0.35 * (1 - t));
      }
    }
    return c;
  };
}
function sceneOcean() {
  return (x, y) => {
    const t = y / H;
    let c = vgrad([[0, [16, 93, 173]], [0.45, [42, 148, 216]], [0.55, [125, 200, 232]], [0.58, [230, 244, 250]], [0.62, [38, 118, 187]], [1, [10, 52, 105]]], t);
    const wave = Math.sin(x * 0.02 + y * 0.11) * Math.sin(x * 0.005 - y * 0.03);
    if (t > 0.62) c = mix(c, [255, 255, 255], Math.max(0, wave - 0.82) * 0.9);
    if (t > 0.55 && t < 0.58) c = mix(c, [255, 255, 255], 0.4);
    return c;
  };
}
function sceneAurora() {
  return (x, y) => {
    let c = vgrad([[0, [4, 8, 22]], [0.5, [8, 15, 40]], [1, [2, 6, 16]]], y / H);
    for (let k = 0; k < 3; k++) {
      const cx = 260 + k * 340, sway = Math.sin(x * 0.004 + k * 1.7) * 60;
      const d = Math.abs(x - cx - sway * (y / H));
      const band = Math.max(0, 1 - d / 130) * Math.max(0, 1 - y / (H * 0.75));
      const hue = [[80, 255, 160], [60, 220, 255], [140, 90, 255]][k];
      c = mix(c, hue, band * band * 0.7);
    }
    const r = mulberry32((x * 31 + y * 17) % 977);
    if (r() > 0.9985) c = [230, 240, 255];
    return c;
  };
}
function sceneMountains() {
  const ridge = (x, k, amp, base) => base + Math.sin(x * 0.004 + k) * amp + Math.sin(x * 0.013 + k * 3) * amp * 0.45;
  return (x, y) => {
    const sky = [[0, [43, 52, 112]], [0.5, [173, 120, 160]], [0.8, [255, 170, 130]], [1, [255, 214, 160]]];
    let c = vgrad(sky, y / H);
    const layers = [[1.2, 470, [90, 66, 110], 0.9], [2.6, 540, [60, 42, 84], 1], [4.8, 620, [32, 24, 52], 1]];
    for (const [k, base, col, strength] of layers) {
      const ry = ridge(x, k, 70, base);
      if (y > ry) c = mix(c, col, strength);
      else if (y > ry - 30) c = mix(c, col, 0.25 * (1 - (ry - y) / 30));
    }
    const d = Math.hypot(x - 260, y - 150);
    if (d < 46) c = mix(c, [255, 244, 214], 1 - smooth(d / 46) * 0.2);
    return c;
  };
}
function sceneMeadow() {
  return (x, y) => {
    let c = vgrad([[0, [110, 185, 235]], [0.55, [180, 220, 240]], [0.62, [126, 186, 98]], [1, [38, 102, 60]]], y / H);
    const hills = Math.sin(x * 0.006) * 24 + Math.sin(x * 0.0025 + 2) * 30;
    if (y > 500 + hills) c = mix(c, [88, 158, 82], 0.6);
    if (y > 620 + hills * 0.6) c = mix(c, [45, 112, 62], 0.7);
    const d = Math.hypot(x - 950, y - 130);
    if (d < 56) c = mix(c, [255, 246, 200], 0.95);
    return c;
  };
}
function sceneDunes() {
  return (x, y) => {
    let c = vgrad([[0, [214, 96, 60]], [0.45, [244, 152, 74]], [0.7, [252, 196, 110]], [1, [180, 92, 54]]], y / H);
    const d1 = 470 + Math.sin(x * 0.0035) * 60 + Math.sin(x * 0.008) * 20;
    const d2 = 600 + Math.sin(x * 0.0028 + 2.4) * 80 + Math.cos(x * 0.006 + 1) * 24;
    if (y > d1) c = mix(c, [188, 98, 60], 0.75);
    if (y > d2) c = mix(c, [122, 54, 58], 0.9);
    return c;
  };
}
function sceneCity() {
  const rand = mulberry32(42);
  const buildings = [];
  for (let i = 0, bx = 0; bx < W; i++) {
    const bw = 40 + Math.floor(rand() * 80);
    const bh = 140 + Math.floor(rand() * 330);
    buildings.push({ x: bx, w: bw, h: bh, seed: i });
    bx += bw + 6;
  }
  const lit = (b, gx, gy) => {
    const r = mulberry32(b.seed * 977 + gx * 131 + gy * 17);
    return r();
  };
  return (x, y) => {
    let c = vgrad([[0, [10, 16, 42]], [0.55, [32, 40, 84]], [1, [66, 30, 74]]], y / H);
    for (const b of buildings) {
      if (x >= b.x && x < b.x + b.w && y > H - 120 - b.h) {
        const top = H - 120 - b.h;
        c = mix(c, [16, 18, 34], 0.92);
        const gx = Math.floor((x - b.x) / 14), gy = Math.floor((y - top) / 22);
        if (gx >= 0 && gy >= 0 && lit(b, gx, gy) > 0.72) c = mix(c, [255, 214, 140], 0.85);
      }
    }
    const d = Math.hypot(x - 1050, y - 110);
    if (d < 34) c = mix(c, [255, 250, 220], 0.9);
    else if (d < 90) c = mix(c, [255, 250, 220], Math.max(0, 1 - d / 90) * 0.25);
    return c;
  };
}
function sceneNebula() {
  return (x, y) => {
    let c = vgrad([[0, [8, 4, 24]], [1, [2, 2, 10]]], y / H);
    const blobs = [[380, 300, 260, [120, 60, 200]], [760, 480, 300, [200, 80, 140]], [560, 620, 200, [60, 120, 220]]];
    for (const [bx, by, br, col] of blobs) {
      const d = Math.hypot(x - bx, (y - by) * 1.3);
      const f = Math.max(0, 1 - d / br);
      c = mix(c, col, f * f * 0.55);
    }
    const r = mulberry32((x * 73 + y * 131) % 100003);
    if (r() > 0.997) c = [240, 240, 255];
    return c;
  };
}

const SCENES = [
  ['sunset.png', sceneSunset()],
  ['ocean.png', sceneOcean()],
  ['aurora.png', sceneAurora()],
  ['mountains.png', sceneMountains()],
  ['meadow.png', sceneMeadow()],
  ['dunes.png', sceneDunes()],
  ['city-lights.png', sceneCity()],
  ['nebula.png', sceneNebula()],
];

const SVG_GEOMETRIC = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1a2e"/><stop offset="1" stop-color="#4a1e5c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <g transform="translate(600 400)">
    <circle r="180" fill="#ff6b6b" opacity="0.85"/>
    <rect x="-40" y="-260" width="80" height="520" fill="#4ecdc4" opacity="0.9" transform="rotate(30)"/>
    <rect x="-40" y="-260" width="80" height="520" fill="#ffe66d" opacity="0.9" transform="rotate(-60)"/>
    <rect x="-40" y="-220" width="80" height="440" fill="#95e5f5" opacity="0.9" transform="rotate(120)"/>
    <circle r="70" fill="#1a1a2e"/>
    <circle r="70" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7"/>
  </g>
  <text x="600" y="730" font-family="Arial, sans-serif" font-size="42" fill="#ffffff" opacity="0.85" text-anchor="middle">Geometric Study</text>
</svg>`;

const SVG_SKYLINE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f2027"/><stop offset="0.6" stop-color="#2c5364"/><stop offset="1" stop-color="#f953c6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="960" cy="500" r="90" fill="#ffd66b" opacity="0.95"/>
  <g fill="#0d1b2a">
    <rect x="60" y="420" width="90" height="380"/><rect x="170" y="360" width="70" height="440"/>
    <rect x="260" y="460" width="100" height="340"/><rect x="380" y="330" width="80" height="470"/>
    <rect x="480" y="430" width="110" height="370"/><rect x="610" y="380" width="70" height="420"/>
    <rect x="700" y="450" width="95" height="350"/><rect x="820" y="400" width="85" height="400"/>
    <rect x="930" y="350" width="75" height="450"/><rect x="1030" y="440" width="110" height="360"/>
  </g>
  <g fill="#ffd66b" opacity="0.8">
    <rect x="76" y="440" width="12" height="12"/><rect x="104" y="480" width="12" height="12"/>
    <rect x="188" y="390" width="12" height="12"/><rect x="212" y="440" width="12" height="12"/>
    <rect x="284" y="490" width="12" height="12"/><rect x="316" y="520" width="12" height="12"/>
    <rect x="402" y="360" width="12" height="12"/><rect x="432" y="410" width="12" height="12"/>
    <rect x="500" y="450" width="12" height="12"/><rect x="540" y="500" width="12" height="12"/>
    <rect x="630" y="410" width="12" height="12"/><rect x="722" y="470" width="12" height="12"/>
    <rect x="760" y="510" width="12" height="12"/><rect x="844" y="420" width="12" height="12"/>
    <rect x="952" y="380" width="12" height="12"/><rect x="1048" y="470" width="12" height="12"/>
  </g>
</svg>`;

function generateAll(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, fn] of SCENES) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, encodePNG(W, H, fn));
  }
  if (!fs.existsSync(path.join(dir, 'geometric.svg'))) fs.writeFileSync(path.join(dir, 'geometric.svg'), SVG_GEOMETRIC);
  if (!fs.existsSync(path.join(dir, 'skyline.svg'))) fs.writeFileSync(path.join(dir, 'skyline.svg'), SVG_SKYLINE);
  return SCENES.map(([n]) => n).concat(['geometric.svg', 'skyline.svg']);
}

module.exports = { generateAll, encodePNG };

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'os-data', 'user', 'Pictures');
  const files = generateAll(out);
  console.log('Generated', files.length, 'assets in', out);
}
