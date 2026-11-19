/* Weather — static mock data, animated presentation. */
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/toast.js';

const CONDS = {
  sunny: { label: 'Sunny', cls: 'w-sun' },
  partly: { label: 'Partly Cloudy', cls: 'w-sun w-cloud-w' },
  cloudy: { label: 'Cloudy', cls: 'w-cloud' },
  rain: { label: 'Light Rain', cls: 'w-cloud w-rain-w' },
  storm: { label: 'Thunderstorms', cls: 'w-cloud w-rain-w' },
};

const CITIES = [
  { name: 'Cupertino', temp: 68, hi: 71, lo: 54, cond: 'sunny', base: 60, span: 14, hue: '#3fa4fb' },
  { name: 'San Francisco', temp: 61, hi: 64, lo: 52, cond: 'partly', base: 54, span: 12, hue: '#4b9ef0' },
  { name: 'New York', temp: 47, hi: 52, lo: 38, cond: 'cloudy', base: 40, span: 14, hue: '#5d6d8a' },
  { name: 'London', temp: 52, hi: 55, lo: 45, cond: 'rain', base: 46, span: 10, hue: '#64748b' },
  { name: 'Paris', temp: 57, hi: 60, lo: 44, cond: 'partly', base: 48, span: 12, hue: '#5b8bd0' },
  { name: 'Tokyo', temp: 63, hi: 66, lo: 50, cond: 'sunny', base: 52, span: 14, hue: '#3fa4fb' },
  { name: 'Sydney', temp: 76, hi: 81, lo: 64, cond: 'sunny', base: 68, span: 16, hue: '#2f8fe8' },
  { name: 'Reykjavík', temp: 38, hi: 41, lo: 32, cond: 'rain', base: 34, span: 9, hue: '#708090' },
];

function seededTemp(city, i) { return Math.round(city.base + city.span * Math.abs(Math.sin(i * 1.7 + city.name.length))); }

function hourly(city) {
  const now = new Date().getHours();
  return [...Array(12)].map((_, i) => {
    const h = (now + i) % 24;
    const t = seededTemp(city, h + city.name.length);
    return { h: (h % 12 === 0 ? 12 : h % 12) + (h < 12 || h >= 24 ? 'am' : 'pm'), t, cond: h >= 6 && h < 19 ? city.cond : 'cloudy' };
  });
}
function tenday(city) {
  const names = ['Today', ...[...Array(9)].map((_, i) => new Date(Date.now() + (i + 1) * 864e5).toLocaleDateString(undefined, { weekday: 'long' }))];
  const all = [...CITIES.map((c) => c.lo)];
  return names.map((n, i) => {
    const hi = seededTemp(city, i + 3);
    const lo = Math.round(hi - (city.span / 2 + 4));
    const min = Math.min(...all), max = Math.max(...all);
    return { name: n, hi, lo, left: ((lo - min) / (max - min)) * 100, width: ((hi - lo) / (max - min)) * 100, cond: (i + city.name.length) % 4 === 0 ? 'rain' : i % 3 === 0 ? 'partly' : 'sunny' };
  });
}

function condGlyph(cond) {
  if (cond === 'sunny') return `<div class="w-sun" style="width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #ffe27a, #ffb200)"></div>`;
  return `<div class="w-cloud" style="width:36px;height:14px;border-radius:9px;background:rgba(255,255,255,.85)"></div>`;
}

export function mountWeather(win, payload) {
  let selected = payload.city || 0;
  win.body.innerHTML = `
    <div class="weather-root">
      <div class="sidebar weather-sidebar" id="${win.id}-cities"></div>
      <div class="weather-main" id="${win.id}-main"></div>
    </div>`;
  win.__wxState = { get selected() { return selected; } };
  const $ = (sel) => win.body.querySelector(sel);

  function render() {
    $(`#${win.id}-cities`).innerHTML = CITIES.map((c, i) => `
      <div class="sidebar-item ${i === selected ? 'selected' : ''}" data-idx="${i}">
        ${condGlyph(i % 3 === 0 ? 'sunny' : 'partly')}
        <span>${c.name}</span>
        <span class="si-count" style="font-size:14px;color:var(--text)">${c.temp}°</span>
      </div>`).join('');
    for (const el of $(`#${win.id}-cities`).querySelectorAll('.sidebar-item')) {
      el.addEventListener('click', () => { selected = Number(el.dataset.idx); render(); win.save(); });
    }
    const c = CITIES[selected];
    $(`#${win.id}-main`).style.background = `linear-gradient(180deg, ${c.hue} 0%, ${shade(c.hue, -28)} 100%)`;
    $(`#${win.id}-main`).innerHTML = `
      <div class="weather-hero">
        <div class="w-city">${c.name}</div>
        <div class="w-icon-${c.cond === 'sunny' ? 'sun' : 'cloud'}">
          ${c.cond === 'sunny' ? `<div class="w-sun"></div>` : ''}
          ${c.cond !== 'sunny' ? `<div class="w-cloud" style="transform:scale(1.2)"></div>` : ''}
        </div>
        <div class="w-temp">${c.temp}°</div>
        <div class="w-cond">${CONDS[c.cond].label}</div>
        <div class="w-hilo">H:${c.hi}°  L:${c.lo}°</div>
      </div>
      <div class="weather-hourly">
        ${hourly(c).map((h) => `<div class="wh-cell"><div class="wh-h">${h.h}</div>${condGlyph(h.cond)}<div class="wh-t">${h.t}°</div></div>`).join('')}
      </div>
      ${tenday(c).map((d) => `
        <div class="wf-row">
          <div class="wf-day">${d.name}</div>
          ${condGlyph(d.cond)}
          <div class="wf-range"><i style="left:${d.left}%;width:${Math.max(8, d.width)}%"></i></div>
          <div class="wf-lo">${d.lo}°</div>
          <div class="wf-hi">${d.hi}°</div>
        </div>`).join('')}`;
    win.setTitle(`Weather — ${c.name}`);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }

  render();
}

export function serializeWeather(win) {
  return { city: win.__wxState?.selected ?? 0 };
}
