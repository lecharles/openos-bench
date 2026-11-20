'use strict';
/**
 * Generates the seeded virtual filesystem: procedural PNG photos (pure-node
 * PNG encoder, zero deps) + sample documents. Run: node scripts/gen-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FSROOT = path.join(__dirname, '..', 'fsroot');

// ---------- minimal PNG encoder ----------
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
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- scene helpers ----------
function hash2(x, y, s = 1) {
  let h = Math.sin(x * 127.1 * s + y * 311.7 * s + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s = 1) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { v += amp * vnoise(x * f, y * f, s + i * 13.7); amp *= 0.5; f *= 2; }
  return v;
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

function canvas(w, h) {
  return { w, h, buf: Buffer.alloc(w * h * 4) };
}
function px(c, x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  x |= 0; y |= 0;
  const i = (y * c.w + x) * 4;
  if (a >= 1) { c.buf[i] = rgb[0]; c.buf[i + 1] = rgb[1]; c.buf[i + 2] = rgb[2]; c.buf[i + 3] = 255; }
  else {
    c.buf[i] = lerp(c.buf[i], rgb[0], a);
    c.buf[i + 1] = lerp(c.buf[i + 1], rgb[1], a);
    c.buf[i + 2] = lerp(c.buf[i + 2], rgb[2], a);
    c.buf[i + 3] = 255;
  }
}

const scenes = {
  sunset(w, h) {
    const c = canvas(w, h);
    const sunY = h * 0.55, sunX = w * 0.62, sunR = h * 0.09;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col;
      if (t < 0.62) col = mix(mix([26, 15, 60], [120, 40, 90], t / 0.62), [255, 140, 60], Math.pow(t / 0.62, 3));
      else col = mix([255, 120, 50], [40, 12, 50], (t - 0.62) / 0.38);
      const d = Math.hypot(x - sunX, (y - sunY) * 1.15);
      if (d < sunR) col = mix(col, [255, 236, 180], 0.95 * (1 - d / sunR * 0.4));
      else if (d < sunR * 3.2) col = mix(col, [255, 170, 90], 0.35 * (1 - d / (sunR * 3.2)));
      if (t > 0.62) { // water shimmer
        const sh = fbm(x * 0.02, y * 0.35 + t * 40, 3);
        const gl = Math.max(0, 1 - Math.abs(x - sunX) / (w * 0.18));
        col = mix(col, [255, 200, 130], gl * sh * 0.5 * (1 - (t - 0.62) / 0.38 * 0.6));
        col = mix(col, [10, 5, 25], sh * 0.25);
      }
      px(c, x, y, col);
    }
    return c;
  },
  mountains(w, h) {
    const c = canvas(w, h);
    const ridge = (x, seed, base, amp) => base + fbm(x * 0.004, 0.5, seed) * amp;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col = mix([14, 30, 66], [86, 130, 190], Math.pow(t / 0.55, 1.4));
      if (t < 0.55) {
        const star = hash2(x, y, 9); if (star > 0.9985) col = mix(col, [230, 240, 255], (star - 0.9985) * 400 * (1 - t / 0.55));
      }
      const r1 = ridge(x, 2, h * 0.42, h * 0.22);
      const r2 = ridge(x, 5, h * 0.52, h * 0.16);
      if (y > r1 && y < 0.62 * h) col = mix([24, 34, 62], [70, 90, 130], clamp((y - r1) / (h * 0.12), 0, 1));
      if (y > r2 && y < 0.62 * h) col = mix([12, 18, 36], [34, 48, 80], clamp((y - r2) / (h * 0.1), 0, 1));
      if (t >= 0.62) { // lake reflection
        const ry = 0.62 * h + (0.62 * h - y) * 0 + (y - 0.62 * h);
        const rr1 = ridge(x, 2, h * 0.42, h * 0.22);
        const refl = clamp((h * 0.62 * 2 - y - rr1) / (h * 0.2), 0, 1);
        col = mix([8, 14, 34], [40, 66, 110], refl * 0.7);
        const rip = Math.sin(y * 0.6 + fbm(x * 0.01, y * 0.05, 7) * 12) * 0.5 + 0.5;
        col = mix(col, [120, 160, 210], rip * 0.12 * refl);
        col = mix(col, [6, 10, 26], (t - 0.62) / 0.38 * 0.5);
      }
      px(c, x, y, col);
    }
    return c;
  },
  forest(w, h) {
    const c = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col = mix([180, 205, 170], [30, 60, 34], Math.pow(t, 1.2));
      const fog = Math.exp(-Math.pow((t - 0.45) * 6, 2));
      col = mix(col, [215, 225, 205], fog * 0.55);
      const n = fbm(x * 0.008, y * 0.02, 4);
      col = mix(col, [16, 40, 22], clamp(n * 0.9 - 0.25, 0, 1) * (0.4 + t * 0.5));
      // trunks
      const trunk = Math.sin(x * 0.09 + fbm(x * 0.02, 3, 8) * 6);
      if (trunk > 0.93 && t > 0.35) col = mix(col, [26, 20, 14], (trunk - 0.93) * 10 * clamp((t - 0.35) * 3, 0, 1));
      // light shafts
      const shaft = Math.exp(-Math.pow((x / w - 0.3 - t * 0.18) * 9, 2)) * (1 - t) * 0.5;
      col = mix(col, [255, 250, 210], clamp(shaft, 0, 0.4));
      px(c, x, y, col);
    }
    return c;
  },
  dunes(w, h) {
    const c = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col;
      if (t < 0.35) col = mix([250, 200, 130], [110, 160, 220], Math.pow(t / 0.35, 0.8));
      else {
        const d1 = Math.sin(x * 0.006 + 2) * h * 0.05 + h * 0.42;
        const d2 = Math.sin(x * 0.011 + 5) * h * 0.04 + h * 0.58;
        const d3 = Math.sin(x * 0.004 + 1) * h * 0.06 + h * 0.78;
        const s = fbm(x * 0.02, y * 0.06, 6) * 0.25;
        if (y > d3) col = mix([222, 172, 105], [160, 105, 55], clamp((y - d3) / (h * 0.2), 0, 1) + s * 0.4);
        else if (y > d2) col = mix([235, 190, 125], [190, 132, 74], clamp((y - d2) / (h * 0.2), 0, 1) + s * 0.4);
        else if (y > d1) col = mix([246, 208, 150], [214, 160, 95], clamp((y - d1) / (h * 0.2), 0, 1) + s * 0.4);
        else col = mix([250, 224, 170], [240, 198, 130], t + s * 0.3);
        const shade = Math.sin(x * 0.02 + y * 0.05) * 0.5 + 0.5;
        col = mix(col, [120, 70, 35], shade * 0.08);
      }
      // sun glow
      const d = Math.hypot(x - w * 0.25, y - h * 0.18);
      if (d < h * 0.3) col = mix(col, [255, 245, 215], 0.5 * (1 - d / (h * 0.3)) ** 2);
      px(c, x, y, col);
    }
    return c;
  },
  night(w, h) {
    const c = canvas(w, h);
    const mx = w * 0.72, my = h * 0.22, mr = h * 0.07;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col = mix([4, 6, 24], [22, 30, 70], Math.pow(t, 1.5));
      const star = hash2(x >> 0, y >> 0, 21);
      if (star > 0.9975 && t < 0.7) col = mix(col, [255, 255, 255], (star - 0.9975) * 380);
      // milky band
      const band = Math.exp(-Math.pow((x / w + t * 0.6 - 0.65) * 4.2, 2));
      col = mix(col, [90, 100, 180], band * 0.18 * (1 - t));
      const d = Math.hypot(x - mx, y - my);
      if (d < mr) col = mix(col, [240, 240, 225], 0.95);
      else if (d < mr * 4) col = mix(col, [160, 170, 220], 0.25 * (1 - d / (mr * 4)));
      if (t > 0.78) { // hills
        const r = h * 0.8 + fbm(x * 0.005, 1.3, 11) * h * 0.14;
        if (y > r) col = mix([6, 8, 20], [2, 3, 10], (y - r) / (h * 0.2));
        else col = mix(col, [8, 10, 28], (t - 0.78) * 0.8);
      }
      px(c, x, y, col);
    }
    return c;
  },
  ocean(w, h) {
    const c = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      const n1 = fbm(x * 0.006, y * 0.012, 31), n2 = fbm(x * 0.03, y * 0.05, 17);
      let col = mix([6, 90, 120], [16, 170, 180], n1);
      col = mix(col, [230, 250, 245], Math.pow(clamp(n2 * 1.25 - 0.42, 0, 1), 2.4) * 0.85);
      col = mix(col, [2, 40, 70], t * 0.55);
      col = mix(col, [120, 220, 230], Math.pow(1 - t, 3) * 0.4);
      px(c, x, y, col);
    }
    return c;
  },
  city(w, h) {
    const c = canvas(w, h);
    const bSeed = 5;
    const buildings = [];
    let bx = -20;
    let i = 0;
    while (bx < w + 20) {
      const bw = 30 + hash2(i, 1, bSeed) * 70;
      const bh = h * (0.18 + hash2(i, 2, bSeed) * 0.5);
      buildings.push({ x: bx, w: bw, h: bh, s: i });
      bx += bw + 4 + hash2(i, 3, bSeed) * 10; i++;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col = mix([8, 10, 30], [40, 30, 70], Math.pow(1 - t, 2));
      col = mix(col, [90, 50, 90], Math.exp(-Math.pow((t - 0.75) * 5, 2)) * 0.5);
      const star = hash2(x, y, 44); if (star > 0.998 && t < 0.4) col = mix(col, [255, 255, 255], (star - 0.998) * 450);
      for (const b of buildings) {
        if (x >= b.x && x <= b.x + b.w && y >= h - b.h) {
          const shade = 0.25 + hash2(b.s, 7, bSeed) * 0.2;
          col = [14 * shade + 8, 14 * shade + 8, 24 * shade + 14];
          const wx = Math.floor((x - b.x) / 9), wy = Math.floor((h - y) / 13);
          if ((x - b.x) % 9 > 2 && (x - b.x) % 9 < 7 && (h - y) % 13 > 3 && (h - y) % 13 < 10) {
            const lit = hash2(b.s * 31 + wx, wy, bSeed + wx * 0.13);
            if (lit > 0.55) col = mix(col, lit > 0.93 ? [255, 210, 130] : [250, 235, 170], 0.85);
          }
          break;
        }
      }
      px(c, x, y, col);
    }
    return c;
  },
  abstract(w, h) {
    const c = canvas(w, h);
    const blobs = [];
    for (let i = 0; i < 7; i++) blobs.push({ x: hash2(i, 1, 77) * w, y: hash2(i, 2, 77) * h, r: (0.12 + hash2(i, 3, 77) * 0.3) * h, col: [hash2(i, 4, 77) * 200 + 55, hash2(i, 5, 77) * 200 + 55, hash2(i, 6, 77) * 200 + 55] });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let col = mix([12, 10, 30], [30, 18, 60], y / h);
      for (const b of blobs) {
        const d = Math.hypot(x - b.x, y - b.y) / b.r;
        const g = Math.exp(-d * d * 1.6);
        col = mix(col, b.col, g * 0.55);
      }
      const sw = Math.sin(x * 0.01 + y * 0.02 + fbm(x * 0.004, y * 0.004, 3) * 8);
      col = mix(col, [255, 255, 255], Math.pow(clamp(sw, 0, 1), 6) * 0.12);
      px(c, x, y, col);
    }
    return c;
  },
  meadow(w, h) {
    const c = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col;
      if (t < 0.45) {
        col = mix([120, 180, 240], [210, 235, 255], Math.pow(t / 0.45, 0.7));
        const cd = fbm(x * 0.004, y * 0.008, 55);
        if (cd > 0.55 && t < 0.3) col = mix(col, [255, 255, 255], clamp((cd - 0.55) * 3.5, 0, 0.9));
      } else {
        const g = fbm(x * 0.02, y * 0.05, 12);
        col = mix([46, 110, 40], [110, 170, 70], g);
        col = mix(col, [30, 80, 35], clamp((t - 0.45) * 1.2, 0, 1) * 0.5);
        const fl = hash2(x >> 1, y >> 1, 90);
        if (fl > 0.9965 && t > 0.55) col = fl > 0.999 ? [250, 230, 90] : [250, 250, 250];
      }
      const d = Math.hypot(x - w * 0.8, y - h * 0.12);
      if (t < 0.45 && d < h * 0.2) col = mix(col, [255, 252, 230], 0.7 * (1 - d / (h * 0.2)));
      px(c, x, y, col);
    }
    return c;
  },
  aurora(w, h) {
    const c = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let col = mix([2, 4, 16], [10, 20, 45], t);
      const star = hash2(x, y, 61); if (star > 0.998) col = mix(col, [255, 255, 255], (star - 0.998) * 400);
      for (let k = 0; k < 3; k++) {
        const wave = Math.sin(x * (0.004 + k * 0.002) + k * 2.4) * h * 0.08 + h * (0.2 + k * 0.08);
        const band = Math.exp(-Math.pow((y - wave) / (h * (0.05 + k * 0.02)), 2));
        const flick = 0.6 + fbm(x * 0.01, k * 5, 23) * 0.8;
        const colA = k === 0 ? [40, 220, 130] : k === 1 ? [60, 180, 255] : [180, 90, 255];
        col = mix(col, colA, clamp(band * flick * 0.5, 0, 0.75));
      }
      if (t > 0.85) {
        const r = h * 0.88 + fbm(x * 0.006, 2.2, 71) * h * 0.08;
        if (y > r) col = [3, 4, 12];
        else col = mix(col, [5, 8, 20], (t - 0.85) * 4);
      }
      px(c, x, y, col);
    }
    return c;
  },
};

// ---------- write files ----------
function savePNG(file, sceneFn, w, h) {
  const c = sceneFn(w, h);
  fs.writeFileSync(file, encodePNG(c.w, c.h, c.buf));
  console.log('  wrote', path.relative(FSROOT, file), `${(fs.statSync(file).size / 1024) | 0} KB`);
}

function main() {
  for (const d of ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', '.Trash', 'Documents/Projects']) {
    fs.mkdirSync(path.join(FSROOT, d), { recursive: true });
  }
  const P = (w = 960, h = 600) => [w, h];

  console.log('photos:');
  const photos = [
    ['Golden-Gate-Sunset.png', 'sunset'], ['Alpine-Lake.png', 'mountains'], ['Redwood-Fog.png', 'forest'],
    ['Sahara-Dunes.png', 'dunes'], ['Starry-Night.png', 'night'], ['Aerial-Ocean.png', 'ocean'],
    ['City-Lights.png', 'city'], ['Nebula-Dreams.png', 'abstract'], ['Spring-Meadow.png', 'meadow'],
    ['Aurora-Borealis.png', 'aurora'],
  ];
  for (const [name, scene] of photos) savePNG(path.join(FSROOT, 'Pictures', name), scenes[scene], ...P());
  savePNG(path.join(FSROOT, 'Desktop', 'Wallpaper-Preview.png'), scenes.aurora, 800, 500);
  savePNG(path.join(FSROOT, 'Downloads', 'screenshot-2026-11-14.png'), scenes.city, 800, 500);

  console.log('docs:');
  const docs = {
    'Desktop/Welcome to OpenOS.txt': `Welcome to OpenOS!\n\nThis is a macOS-class desktop environment running entirely in your browser.\n\nThings to try:\n  • Press Cmd+Space (or Ctrl+Space) to open Spotlight, type an app name, hit Enter\n  • Drag windows by their title bar, resize from any edge or corner\n  • Right-click desktop icons and files in the Finder\n  • Open Settings to switch between light/dark theme and wallpapers (persisted!)\n  • Move a file to the Trash, then restore it from the Trash app\n  • The Terminal app is a sandboxed shell over this virtual filesystem\n  • Everything you do — windows, notes, settings — survives a page reload\n\nBuilt with vanilla JS + Express. No frameworks, no bundlers.\n`,
    'Desktop/Project Roadmap.md': `# OpenOS Roadmap\n\n## v1.0 (shipped)\n- [x] Desktop shell: menu bar, wallpaper, desktop icons\n- [x] Window manager: drag / 8-way resize / traffic lights / z-order\n- [x] Dock with magnification + launch bounce + genie minimize\n- [x] Spotlight (Cmd+Space, fuzzy search)\n- [x] Finder (icon + list views, breadcrumbs, sidebar)\n- [x] 14 apps\n- [x] Server-side persistence\n\n## v1.1 (next)\n- [ ] Mission Control / Expose\n- [ ] Multiple desktops (Spaces)\n- [ ] Snap layouts on window drag\n\n## Ideas parking lot\n- Widget layer on desktop\n- Screen recording of sessions\n`,
    'Documents/letter.md': `Dear Carlos,\n\nThe overnight build completed successfully. The desktop shell renders,\nall fourteen apps launch, and the filesystem probes behave. Security\nallow-list is enforced — /etc/shadow returns 403 as required.\n\nSee STATUS.md for the full report.\n\n— OpenOS Build Agent\n`,
    'Documents/budget.csv': `category,planned,actual\nEngineering,42000,39800\nDesign,18000,18240\nInfrastructure,6400,5120\nMarketing,12000,9800\nLegal,4000,4000\n`,
    'Documents/Projects/spec-v0.txt': `OpenOS Bench — Fixed Task Spec v0 (frozen 2026-11-19)\n\nHard requirements: desktop shell, window manager, dock, spotlight,\nfinder, 12+ apps, persistence, filesystem allow-list.\n\nScoring: apps render (E2E), interaction probes (15), persistence,\nsecurity probe, human fidelity pass, cost telemetry.\n`,
    'Downloads/readme.txt': `Thanks for downloading OpenOS assets.\n\nscreenshot-2026-11-14.png  — a procedurally generated cityscape\ndata.json                  — sample structured data\n\nAll files here are sandboxed inside the virtual filesystem.\n`,
    'Downloads/data.json': JSON.stringify({ dataset: 'openos-bench', rows: 1200, generated: '2026-11-19', columns: ['id', 'label', 'score', 'ts'], sample: [{ id: 1, label: 'alpha', score: 0.91, ts: '2026-11-19T03:58:00Z' }, { id: 2, label: 'beta', score: 0.77, ts: '2026-11-19T03:59:00Z' }] }, null, 2),
    'Music/playlist.m3u': `#EXTM3U\n#EXTINF:214,Midnight Protocol - Neon Harbor\n#EXTINF:187,Solar Fields - Blue Drift\n#EXTINF:243,Kavinsky Mode - Nightdrive\n`,
  };
  for (const [f, body] of Object.entries(docs)) fs.writeFileSync(path.join(FSROOT, f), body);

  console.log('done.');
}
main();
