/* Calendar — month view with server-persisted events. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';
import { contextMenu } from '../core/menu.js';

export function mountCalendar(win, payload) {
  const today = new Date();
  let view = { y: today.getFullYear(), m: today.getMonth() };
  let events = [];
  let popEl = null;

  win.body.innerHTML = `
    <div class="cal-toolbar">
      <button class="icon-btn" id="${win.id}-prev" aria-label="Previous month">${icon('chevronL', 13)}</button>
      <button class="icon-btn" id="${win.id}-today">Today</button>
      <button class="icon-btn" id="${win.id}-next" aria-label="Next month">${icon('chevronR', 13)}</button>
      <div class="cal-month-label" id="${win.id}-label"></div>
    </div>
    <div class="cal-grid" id="${win.id}-grid"></div>`;
  win.__calState = { get view() { return view; } };

  const $ = (sel) => win.body.querySelector(sel);

  async function load() {
    events = await api.store.get('events').catch(() => []);
    if (payload.view) view = payload.view;
    render();
  }
  async function persist() {
    await api.store.put('events', events).catch((e) => toast({ title: 'Save failed', body: e.message, app: 'calendar' }));
  }

  function render() {
    $(`#${win.id}-label`).textContent = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const grid = $(`#${win.id}-grid`);
    const weekdays = [...Array(7)].map((_, i) => new Date(2026, 0, 4 + i).toLocaleDateString(undefined, { weekday: 'short' }));
    const first = new Date(view.y, view.m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const prevDays = new Date(view.y, view.m, 0).getDate();

    grid.innerHTML = `
      <div class="cal-weekdays">${weekdays.map((d) => `<div>${d}</div>`).join('')}</div>
      <div class="cal-days" id="${win.id}-days"></div>`;
    const daysEl = $(`#${win.id}-days`);

    const cells = [];
    for (let i = startDow - 1; i >= 0; i--) cells.push({ d: prevDays - i, other: true, date: new Date(view.y, view.m - 1, prevDays - i) });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, other: false, date: new Date(view.y, view.m, d) });
    while (cells.length % 7 !== 0) cells.push({ d: cells.length % 7, other: true, date: new Date(view.y, view.m + 1, cells[cells.length - 1] ? cells[cells.length - 1].d + 1 : 1) });

    daysEl.innerHTML = cells.map((c, i) => {
      const iso = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}-${String(c.date.getDate()).padStart(2, '0')}`;
      const dayEvents = events.filter((e) => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
      const isToday = !c.other && c.d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
      const chips = dayEvents.slice(0, 2).map((e) => `<div class="cal-event-chip" data-eid="${e.id}">${e.time} ${escapeHTML(e.title)}</div>`).join('');
      const dots = dayEvents.length > 2 ? `<div class="cd-dots">${[...Array(Math.min(3, dayEvents.length - 2))].map(() => '<i></i>').join('')}</div>` : '';
      return `<div class="cal-day ${c.other ? 'other' : ''} ${isToday ? 'today' : ''}" data-date="${iso}" data-idx="${i}">
        <div class="cd-num">${c.d}</div>
        <div class="cd-events">${chips}</div>
        ${dots}
      </div>`;
    }).join('');

    for (const cell of daysEl.querySelectorAll('.cal-day')) {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.cal-event-chip')) return;
        showDayPopover(cell.dataset.date, cell);
      });
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDayPopover(cell.dataset.date, cell);
      });
    }
    win.save();
  }

  function showDayPopover(iso, anchorCell) {
    closePopover();
    popEl = document.createElement('div');
    popEl.className = 'cal-popover';
    popEl.innerHTML = `
      <div class="pop-title">${new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div class="pop-events"></div>
      <div class="pop-row">
        <input class="field" id="${win.id}-ev-title" placeholder="New event" aria-label="Event title">
        <input class="field" id="${win.id}-ev-time" type="time" value="09:00" style="width:88px" aria-label="Event time">
      </div>
      <div class="pop-row">
        <button class="btn small" id="${win.id}-ev-add">Add Event</button>
      </div>`;
    win.body.appendChild(popEl);
    const cellRect = anchorCell.getBoundingClientRect();
    const bodyRect = win.body.getBoundingClientRect();
    let x = cellRect.left - bodyRect.left;
    let y = cellRect.top - bodyRect.top + 30;
    popEl.style.left = Math.min(x, win.w - 250) + 'px';
    popEl.style.top = Math.min(y, win.h - 240) + 'px';

    const evList = events.filter((e) => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
    popEl.querySelector('.pop-events').innerHTML = evList.length ? evList.map((e) =>
      `<div class="pop-row" style="justify-content:space-between;padding:4px 6px;border-radius:6px;background:var(--hover)">
         <span style="font-size:12.5px"><b>${e.time}</b> ${escapeHTML(e.title)}</span>
         <button class="icon-btn" style="width:22px;height:22px" data-del="${e.id}" aria-label="Delete event">${icon('close', 10)}</button>
       </div>`).join('') : `<div style="font-size:12px;color:var(--text-3);padding:2px 6px">No events</div>`;

    for (const b of popEl.querySelectorAll('[data-del]')) {
      b.addEventListener('click', async () => {
        events = events.filter((e) => e.id !== b.dataset.del);
        await persist();
        closePopover();
        render();
      });
    }
    popEl.querySelector(`#${win.id}-ev-add`).addEventListener('click', async () => {
      const title = popEl.querySelector(`#${win.id}-ev-title`).value.trim();
      const time = popEl.querySelector(`#${win.id}-ev-time`).value || '09:00';
      if (!title) return;
      events.push({ id: 'e' + Date.now().toString(36), date: iso, time, title });
      await persist();
      closePopover();
      render();
    });
    popEl.querySelector(`#${win.id}-ev-title`).focus();

    const closeHandler = (e) => { if (!popEl.contains(e.target)) closePopover(); };
    setTimeout(() => win.body.addEventListener('mousedown', closeHandler), 0);
    popEl.addEventListener('mousedown', (e) => e.stopPropagation());
  }
  function closePopover() { if (popEl) { popEl.remove(); popEl = null; } }

  $(`#${win.id}-prev`).addEventListener('click', () => { view.m--; if (view.m < 0) { view.m = 11; view.y--; } render(); });
  $(`#${win.id}-next`).addEventListener('click', () => { view.m++; if (view.m > 11) { view.m = 0; view.y++; } render(); });
  $(`#${win.id}-today`).addEventListener('click', () => { view = { y: today.getFullYear(), m: today.getMonth() }; render(); });

  load();
}

export function serializeCalendar(win) {
  return { view: win.__calState?.view ?? null };
}
