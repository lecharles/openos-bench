'use strict';
/* PNG pixel probe — decodes small PNGs (RGBA/RGB, non-interlaced) and
 * reports average color of regions, so we can verify screenshot content. */
const fs = require('fs');
const zlib = require('zlib');

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8) throw new Error('unsupported bit depth ' + bitDepth);
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : -1;
  if (channels < 0) throw new Error('unsupported color type ' + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(w * h * channels);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      cur[x] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, channels, data: out };
}

const file = process.argv[2];
const img = decodePNG(fs.readFileSync(file));
const px = (x, y) => {
  const o = (y * img.w + x) * img.channels;
  return [img.data[o], img.data[o + 1], img.data[o + 2]];
};
const regionAvg = (x0, y0, x1, y1) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) {
    const p = px(x, y); r += p[0]; g += p[1]; b += p[2]; n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
};
console.log(`${file}: ${img.w}x${img.h} channels=${img.channels}`);
console.log('  top-left (menubar):   ', regionAvg(0, 0, img.w, 28).join(','));
console.log('  wallpaper center:     ', regionAvg(Math.floor(img.w / 2) - 100, 350, Math.floor(img.w / 2) + 100, 450).join(','));
console.log('  center (windows?):    ', regionAvg(Math.floor(img.w / 2) - 200, Math.floor(img.h / 2) - 100, Math.floor(img.w / 2) + 200, Math.floor(img.h / 2) + 100).join(','));
console.log('  bottom (dock area):   ', regionAvg(Math.floor(img.w / 2) - 200, img.h - 80, Math.floor(img.w / 2) + 200, img.h - 40).join(','));
console.log('  pixel(5,14):          ', px(5, 14).join(','));
console.log('  pixel(720,450):       ', px(Math.floor(img.w / 2), Math.floor(img.h / 2)).join(','));
