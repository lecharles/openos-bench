/* Clock — live analog face + world clocks. */
const ZONES = [
  ['Cupertino', 'America/Los_Angeles'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Paris', 'Europe/Paris'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney'],
];

export function mountClock(win) {
  win.body.innerHTML = `
    <div class="clock-root">
      <div class="clock-face-pane">
        <svg class="clock-face" id="${win.id}-face" width="190" height="190" viewBox="0 0 200 200" role="img" aria-label="Analog clock">
          <g class="clock-hands">
            <circle class="face" cx="100" cy="100" r="94"/>
            <g stroke="currentColor" stroke-width="3" stroke-linecap="round" id="${win.id}-ticks"></g>
            <line id="${win.id}-hour" x1="100" y1="100" x2="100" y2="55" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
            <line id="${win.id}-min" x1="100" y1="100" x2="100" y2="34" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
            <line id="${win.id}-sec" x1="100" y1="112" x2="100" y2="28" stroke="#ff3b30" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="100" cy="100" r="5.5" fill="currentColor"/>
          </g>
        </svg>
      </div>
      <div class="clock-world" id="${win.id}-world">
        <div class="clock-date" id="${win.id}-date"></div>
      </div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);

  const ticks = $(`#${win.id}-ticks`);
  ticks.innerHTML = [...Array(12)].map((_, i) => {
    const a = i * 30 * Math.PI / 180;
    const r1 = i % 3 === 0 ? 82 : 86, r2 = 92;
    return `<line x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}" stroke-width="${i % 3 === 0 ? 5 : 2.5}"/>`;
  }).join('');

  const world = $(`#${win.id}-world`);
  world.innerHTML += ZONES.map(([city]) => `
    <div class="world-clock" data-zone="${city}">
      <div class="wc-city">${city}</div>
      <div class="wc-time">--:--</div>
      <div class="wc-off"></div>
    </div>`).join('');

  function tick() {
    const now = new Date();
    const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds() + now.getMilliseconds() / 1000;
    $(`#${win.id}-hour`).setAttribute('transform', `rotate(${h * 30 + m * 0.5} 100 100)`);
    $(`#${win.id}-min`).setAttribute('transform', `rotate(${m * 6 + s * 0.1} 100 100)`);
    $(`#${win.id}-sec`).setAttribute('transform', `rotate(${s * 6} 100 100)`);
    $(`#${win.id}-date`).textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    for (const row of world.querySelectorAll('.world-clock')) {
      const city = row.dataset.zone;
      const zone = ZONES.find((z) => z[0] === city)[1];
      try {
        row.querySelector('.wc-time').textContent = now.toLocaleTimeString(undefined, { timeZone: zone, hour: 'numeric', minute: '2-digit' });
        const zoneTime = new Date(now.toLocaleString('en-US', { timeZone: zone }));
        const diff = Math.round((zoneTime - now) / 36e5);
        row.querySelector('.wc-off').textContent = diff === 0 ? 'Today' : `${diff > 0 ? '+' : ''}${diff}HRS`;
      } catch { row.querySelector('.wc-off').textContent = ''; }
    }
  }

  const timer = setInterval(tick, 250);
  tick();
  win.onclose = () => clearInterval(timer);
}

export function serializeClock() { return {}; }
