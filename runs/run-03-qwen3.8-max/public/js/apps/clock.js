import { el } from '../core/util.js';
import { beep } from '../core/audio.js';

const CITIES = [
  ['San Francisco', 'America/Los_Angeles'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Paris', 'Europe/Paris'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney'],
];

export default {
  id: 'clock',
  name: 'Clock',
  size: { w: 620, h: 520 },
  minW: 460, minH: 400,
  keywords: 'time world stopwatch timer',

  mount(root, api) {
    root.classList.add('clk');
    const side = el('div', { class: 'clk-side' });
    const main = el('div', { class: 'clk-main' });
    root.append(side, main);

    let mode = 'world';
    let city = CITIES[0];
    const timers = [];

    for (const [id, label] of [['world', 'World Clock'], ['stopwatch', 'Stopwatch'], ['timer', 'Timer']]) {
      const row = el('div', { class: 'side-row', dataset: { id } }, el('span', { text: label }));
      row.addEventListener('click', () => { mode = id; mark(); render(); });
      side.append(row);
    }
    side.append(el('div', { class: 'side-h', text: 'Cities' }));
    const cityList = el('div', {});
    side.append(cityList);
    const mark = () => side.querySelectorAll('.side-row').forEach((r) => r.classList.toggle('on', r.dataset.id === mode));

    function cityTime(tz) {
      return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(new Date());
    }
    function dayDelta(tz) {
      const here = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date());
      const there = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(new Date());
      if (here === there) return 'Today';
      return there === 'Fri' && here === 'Sat' ? 'Yesterday' : 'Different day';
    }

    function renderCities() {
      cityList.innerHTML = '';
      for (const c of CITIES) {
        const row = el('div', { class: 'clk-row', dataset: { tz: c[1] } },
          el('div', {}, el('div', { text: c[0] }), el('div', { class: 'cd', text: dayDelta(c[1]) })),
          el('div', { class: 'ct', text: cityTime(c[1]) }));
        row.addEventListener('click', () => { city = c; render(); });
        cityList.append(row);
      }
    }

    // analog face
    let faceHands = null;
    function faceSVG(tz) {
      const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, timeZone: tz }).formatToParts(new Date());
      const g = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
      const h = g('hour') % 12, m = g('minute'), s = g('second');
      const ticks = Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return `<rect x="99.2" y="6" width="${major ? 2.6 : 1.2}" height="${major ? 10 : 5}" rx="1" fill="${major ? 'var(--fg)' : 'var(--fg-faint)'}" transform="rotate(${i * 6} 100 100)"/>`;
      }).join('');
      return `<svg class="clk-face" viewBox="0 0 200 200" data-h="${h + m / 60}" data-m="${m + s / 60}" data-s="${s}">
        <circle cx="100" cy="100" r="96" fill="var(--panel)" stroke="var(--border)" stroke-width="1.5"/>
        ${ticks}
        <g class="hh"><rect x="96.5" y="52" width="7" height="52" rx="3.5" fill="var(--fg)" transform="rotate(${(h + m / 60) * 30} 100 100)"/></g>
        <g class="mh"><rect x="97.6" y="26" width="4.8" height="78" rx="2.4" fill="var(--fg)" transform="rotate(${(m + s / 60) * 6} 100 100)"/></g>
        <g class="sh"><rect x="99" y="20" width="2" height="88" rx="1" fill="#ff9f0a" transform="rotate(${s * 6} 100 100)"/></g>
        <circle cx="100" cy="100" r="5" fill="#ff9f0a"/></svg>`;
    }

    // stopwatch state
    let swRunning = false, swStart = 0, swAccum = 0, laps = [];
    let timerEnd = 0, timerTotal = 0, timerRunning = false;

    function render() {
      mark();
      main.innerHTML = '';
      faceHands = null;
      if (mode === 'world') {
        main.append(el('div', { html: faceSVG(city[1]), style: { display: 'contents' } }));
        faceHands = main.querySelector('svg');
        main.append(el('div', { class: 'clk-digital', 'data-testid': 'clock-digital' }), el('div', { class: 'clk-city-big', text: city[0] }));
        renderCities();
      } else if (mode === 'stopwatch') {
        cityList.innerHTML = '';
        const disp = el('div', { class: 'sw-display', 'data-testid': 'stopwatch-display', text: fmtSW(swAccum) });
        const btnGo = el('button', { class: 'sw-btn ' + (swRunning ? 'stop' : 'go'), text: swRunning ? 'Stop' : 'Start' });
        const btnLap = el('button', { class: 'sw-btn ghost', text: 'Lap' });
        const btnReset = el('button', { class: 'sw-btn ghost', text: 'Reset' });
        btnGo.addEventListener('click', () => {
          if (swRunning) { swAccum += performance.now() - swStart; swRunning = false; }
          else { swStart = performance.now(); swRunning = true; }
          render();
        });
        btnLap.addEventListener('click', () => { laps.unshift(fmtSW(swAccum + (swRunning ? performance.now() - swStart : 0))); renderLaps(); });
        btnReset.addEventListener('click', () => { swRunning = false; swAccum = 0; laps = []; render(); });
        const lapsEl = el('div', { class: 'sw-laps' });
        function renderLaps() {
          lapsEl.innerHTML = '';
          laps.forEach((l, i) => lapsEl.append(el('div', { class: 'lap' }, el('span', { text: `Lap ${laps.length - i}` }), el('span', { text: l }))));
        }
        renderLaps();
        main.append(disp, el('div', { class: 'sw-btns' }, btnReset, btnGo, btnLap), lapsEl);
        main._swDisp = disp;
      } else {
        cityList.innerHTML = '';
        const ring = el('div', { class: 'timer-ring' },
          el('svg', { viewBox: '0 0 210 210', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', transform: 'rotate(-90deg)' } },
            el('circle', { cx: '105', cy: '105', r: '96', fill: 'none', stroke: 'var(--panel-3)', 'stroke-width': '10' }),
            el('circle', { class: 'tring', cx: '105', cy: '105', r: '96', fill: 'none', stroke: 'var(--accent)', 'stroke-width': '10', 'stroke-linecap': 'round', 'stroke-dasharray': String(2 * Math.PI * 96), 'stroke-dashoffset': '0' })),
          el('div', { class: 'tlab', text: '05:00' }));
        const chips = el('div', { style: { display: 'flex', gap: '8px' } });
        for (const m of [1, 3, 5, 10]) {
          chips.append(el('button', { class: 'os-btn', text: `${m} min`, onclick: () => { timerTotal = m * 60000; timerEnd = performance.now() + timerTotal; timerRunning = true; render(); } }));
        }
        const btnGo = el('button', { class: 'sw-btn ' + (timerRunning ? 'stop' : 'go'), style: { width: '64px', height: '64px' }, text: timerRunning ? 'Stop' : 'Start' });
        btnGo.addEventListener('click', () => {
          if (timerRunning) { timerRunning = false; }
          else { if (timerEnd <= performance.now()) { timerEnd = performance.now() + (timerTotal || 300000); } timerRunning = true; }
          render();
        });
        main.append(ring, chips, btnGo);
        main._timerRing = ring;
      }
    }

    function fmtSW(ms) {
      const cs = Math.floor(ms / 10) % 100;
      const s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }
    function fmtT(ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }

    const tick = setInterval(() => {
      if (mode === 'world') {
        const d = main.querySelector('.clk-digital');
        if (d) d.textContent = cityTime(city[1]);
        const svgf = main.querySelector('svg.clk-face');
        if (svgf) {
          const nh = faceSVG(city[1]);
          const tmp = document.createElement('div'); tmp.innerHTML = nh;
          svgf.replaceWith(tmp.firstChild);
        }
        cityList.querySelectorAll('.clk-row .ct').forEach((ct, i) => { ct.textContent = cityTime(CITIES[i][1]); });
      } else if (mode === 'stopwatch' && swRunning) {
        const d = main._swDisp;
        if (d) d.textContent = fmtSW(swAccum + performance.now() - swStart);
      } else if (mode === 'timer' && timerRunning) {
        const remain = timerEnd - performance.now();
        const ring = main._timerRing;
        if (ring) {
          ring.querySelector('.tlab').textContent = fmtT(remain);
          const c = ring.querySelector('.tring');
          const frac = timerTotal ? Math.max(0, remain / timerTotal) : 0;
          c.setAttribute('stroke-dashoffset', String(2 * Math.PI * 96 * (1 - frac)));
        }
        if (remain <= 0) {
          timerRunning = false;
          beep(1200, 0.25, 'sine', 0.6); setTimeout(() => beep(1200, 0.25), 300); setTimeout(() => beep(1500, 0.4), 600);
          import('../core/toast.js').then(({ toast }) => toast('Timer finished', 'Your countdown reached zero.', 'clock'));
          render();
        }
      }
    }, 200);
    api._off = () => clearInterval(tick);

    render();
  },
  onclose(api) { api._off && api._off(); },
};
