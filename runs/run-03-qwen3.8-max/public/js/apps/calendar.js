import { el, ymd, MONTHS, MONTHS_LONG, DAYS } from '../core/util.js';
import { get, set } from '../core/state.js';
import { uid } from '../core/util.js';

const COLORS = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'teal'];
const CVAL = { blue: 'var(--accent)', red: '#ff453a', green: '#30d158', orange: '#ff9f0a', purple: '#bf5af2', pink: '#ff375f', teal: '#40c8e0' };

function seedEvents() {
  const t = new Date();
  const d = (off) => { const x = new Date(t); x.setDate(x.getDate() + off); return ymd(x); };
  return [
    { id: uid(), date: d(0), time: '09:00', title: 'Ship OpenOS v1', color: 'blue' },
    { id: uid(), date: d(0), time: '10:30', title: 'Team sync', color: 'green' },
    { id: uid(), date: d(1), time: '14:30', title: 'Dentist', color: 'red' },
    { id: uid(), date: d(3), time: '19:00', title: 'Dinner with Lea', color: 'pink' },
    { id: uid(), date: d(5), time: '08:00', title: 'Kitesurfing', color: 'teal' },
    { id: uid(), date: d(-2), time: '16:00', title: 'Design review', color: 'purple' },
    { id: uid(), date: d(9), time: '11:00', title: 'Bench retro', color: 'orange' },
  ];
}

export default {
  id: 'calendar',
  name: 'Calendar',
  size: { w: 900, h: 600 },
  minW: 620, minH: 420,
  keywords: 'events schedule month date',

  mount(root, api) {
    if (!get('calendar.seeded', false)) { set('calendar.events', seedEvents(), true); set('calendar.seeded', true, true); }
    let view = new Date();
    view.setDate(1);
    let selDate = ymd();
    root.classList.add('cal');

    const side = el('div', { class: 'cal-side' });
    const main = el('div', { class: 'cal-main' });
    root.append(side, main);

    const head = el('div', { class: 'cal-head' });
    const btnToday = el('button', { class: 'os-btn', text: 'Today' });
    const btnPrev = el('button', { class: 'os-btn icon-only', html: '‹' });
    const btnNext = el('button', { class: 'os-btn icon-only', html: '›' });
    const title = el('h2');
    head.append(btnToday, btnPrev, btnNext, title, el('div', { class: 'spacer' }));
    const dowRow = el('div', { class: 'cal-dow' }, DAYS.map((d) => el('div', { text: d.toUpperCase().slice(0, 3) })));
    const grid = el('div', { class: 'cal-grid', 'data-testid': 'calendar-grid' });
    main.append(head, dowRow, grid);

    const events = () => get('calendar.events', []);
    const save = (evts) => set('calendar.events', evts, true);

    function eventsOn(dateStr) {
      return events().filter((e) => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    function render() {
      title.innerHTML = '';
      title.append(`${MONTHS_LONG[view.getMonth()]}`, el('span', { text: ` ${view.getFullYear()}` }));
      grid.innerHTML = '';
      const first = new Date(view);
      const start = new Date(first);
      start.setDate(1 - first.getDay());
      const today = ymd();
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = ymd(d);
        const evs = eventsOn(ds);
        const cell = el('div', {
          class: 'cal-cell' + (d.getMonth() !== view.getMonth() ? ' other' : '') + (ds === today ? ' today' : ''),
          dataset: { date: ds }, 'data-testid': 'cal-day',
        }, el('div', { class: 'dnum', text: String(d.getDate()) }));
        for (const e of evs.slice(0, 3)) {
          const chip = el('div', { class: 'cal-ev c-' + e.color, text: (e.time ? e.time + ' ' : '') + e.title, 'data-testid': 'cal-event' });
          chip.addEventListener('click', (ev) => { ev.stopPropagation(); popover(cell, ds); });
          cell.append(chip);
        }
        if (evs.length > 3) cell.append(el('div', { style: { fontSize: '10px', color: 'var(--fg-dim)' }, text: `+${evs.length - 3} more` }));
        cell.addEventListener('click', (ev) => popover(cell, ds, ev));
        grid.append(cell);
      }
      renderSide();
    }

    function renderSide() {
      side.innerHTML = '';
      side.append(el('div', { class: 'mini-h', text: `${MONTHS[view.getMonth()]} ${view.getFullYear()}` }));
      const mg = el('div', { class: 'mini-grid' });
      for (const d of DAYS) mg.append(el('div', { class: 'dow', text: d[0] }));
      const first = new Date(view);
      const start = new Date(first); start.setDate(1 - first.getDay());
      const today = ymd();
      for (let i = 0; i < 42; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const ds = ymd(d);
        mg.append(el('div', { class: 'd' + (d.getMonth() !== view.getMonth() ? ' other' : '') + (ds === today ? ' today' : '') + (eventsOn(ds).length ? ' evt' : ''), text: String(d.getDate()) }));
      }
      side.append(mg);
      side.append(el('div', { class: 'mini-h cal-up-h', text: 'Upcoming' }));
      const up = el('div', { class: 'cal-up' });
      const now = ymd();
      const soon = events().filter((e) => e.date >= now).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 6);
      for (const e of soon) {
        const d = new Date(e.date + 'T00:00:00');
        up.append(el('div', { class: 'ev', style: { borderLeftColor: CVAL[e.color] || 'var(--accent)' } },
          el('div', { class: 't', text: e.title }),
          el('div', { class: 'd', text: `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} · ${e.time || 'all day'}` })));
      }
      if (!soon.length) up.append(el('div', { style: { fontSize: '11.5px', color: 'var(--fg-dim)', padding: '4px 8px' }, text: 'Nothing scheduled.' }));
      side.append(up);
    }

    let popEl = null;
    function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
    function popover(cell, dateStr, ev) {
      closePop();
      const d = new Date(dateStr + 'T00:00:00');
      popEl = el('div', { class: 'cal-pop' });
      const list = el('div', {});
      const timeIn = el('input', { type: 'time', class: 'os-input', value: '09:00' });
      const nameIn = el('input', { type: 'text', class: 'os-input', placeholder: 'New event title' });
      const addBtn = el('button', { class: 'os-btn primary', text: 'Add' });
      popEl.append(
        el('h4', { text: `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }),
        list,
        el('div', { class: 'add-row' }, timeIn, nameIn, addBtn));
      function fill() {
        list.innerHTML = '';
        const evs = eventsOn(dateStr);
        for (const e of evs) {
          list.append(el('div', { class: 'evl' },
            el('span', { class: 'dot', style: { background: CVAL[e.color] || 'var(--accent)' } }),
            el('span', { text: `${e.time || '—'}  ${e.title}` }),
            el('span', { class: 'rm', text: '✕', onclick: () => { save(events().filter((x) => x.id !== e.id)); fill(); render(); } })));
        }
        if (!evs.length) list.append(el('div', { style: { fontSize: '11.5px', color: 'var(--fg-dim)' }, text: 'No events' }));
      }
      fill();
      const commit = () => {
        const t = nameIn.value.trim();
        if (!t) return;
        const evts = events();
        evts.push({ id: uid(), date: dateStr, time: timeIn.value || '', title: t, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
        save(evts);
        nameIn.value = '';
        fill(); render();
      };
      addBtn.addEventListener('click', commit);
      nameIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); });
      timeIn.addEventListener('keydown', (e) => e.stopPropagation());
      main.append(popEl);
      const cr = cell.getBoundingClientRect(), mr = main.getBoundingClientRect();
      let x = cr.left - mr.left + 4, y = cr.top - mr.top + 24;
      x = Math.min(x, mr.width - 260); y = Math.min(y, mr.height - 190);
      popEl.style.left = Math.max(4, x) + 'px';
      popEl.style.top = Math.max(4, y) + 'px';
      if (ev) ev.stopPropagation();
      nameIn.focus();
    }
    const docDown = (e) => { if (popEl && !e.target.closest('.cal-pop') && !e.target.closest('.cal-cell') && !e.target.closest('.cal-ev')) closePop(); };
    document.addEventListener('mousedown', docDown, true);
    api._off = () => document.removeEventListener('mousedown', docDown, true);

    btnPrev.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
    btnNext.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
    btnToday.addEventListener('click', () => { view = new Date(); view.setDate(1); render(); });
    render();
    void selDate;
  },
};
