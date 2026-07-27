// Calendar app
window.AppCalendar = {
  _year: new Date().getFullYear(),
  _month: new Date().getMonth(),
  _selected: null, // 'YYYY-MM-DD'
  events: [],
  _loaded: false,

  async render(container) {
    if (!this._year) { this._year = new Date().getFullYear(); this._month = new Date().getMonth(); }
    if (!this._loaded) {
      await this.loadEvents();
      this._loaded = true;
    }
    if (!this._selected) this._selected = this._toDateStr(new Date());
    this._renderCalendar(container);
  },

  async loadEvents() {
    try {
      const r = await fetch('/api/calendar');
      const data = await r.json();
      this.events = Array.isArray(data) ? data : [];
    } catch { this.events = []; }
  },

  async saveEvents() {
    await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.events) });
  },

  _toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  _renderCalendar(container) {
    const now = new Date();
    const year = this._year;
    const month = this._month;
    const today = now.getDate();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cal = '<table style="width:100%;border-collapse:collapse;text-align:center;">';
    cal += '<tr>' + dayNames.map(d => `<th style="padding:8px;color:#666;font-weight:500;font-size:12px;">${d}</th>`).join('') + '</tr>';

    let day = 1;
    for (let w = 0; w < 6; w++) {
      cal += '<tr>';
      for (let d = 0; d < 7; d++) {
        if ((w === 0 && d < firstDay) || day > daysInMonth) {
          cal += '<td></td>';
        } else {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = isCurrentMonth && day === today;
          const isSelected = dateStr === this._selected;
          let style = 'padding:4px 6px;';
          if (isToday) style += 'background:#ff3b30;color:#fff;border-radius:50%;';
          else if (isSelected) style += 'background:var(--accent, #0a84ff);color:#fff;border-radius:50%;';
          cal += `<td class="cal-day" data-date="${dateStr}" style="padding:8px;cursor:pointer;"><span style="${style}">${day}</span></td>`;
          day++;
        }
      }
      cal += '</tr>';
      if (day > daysInMonth) break;
    }
    cal += '</table>';

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
        <button class="app-btn" id="cal-prev">◀</button>
        <span style="font-size:18px;font-weight:600;min-width:160px;text-align:center;">${monthNames[month]} ${year}</span>
        <button class="app-btn" id="cal-next">▶</button>
      </div>
      ${cal}
      <div style="margin-top:16px;border-top:1px solid rgba(0,0,0,0.08);padding-top:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h3 style="font-size:14px;">Events — ${AppUtils.escapeHtml(this._selected || '')}</h3>
          <button class="app-btn primary" id="cal-add-event" style="font-size:12px;padding:2px 8px;">+ Add Event</button>
        </div>
        <div id="calendar-events"></div>
      </div>
    `;

    container.querySelector('#cal-prev').addEventListener('click', () => {
      if (this._month === 0) { this._month = 11; this._year--; }
      else { this._month--; }
      this._renderCalendar(container);
    });

    container.querySelector('#cal-next').addEventListener('click', () => {
      if (this._month === 11) { this._month = 0; this._year++; }
      else { this._month++; }
      this._renderCalendar(container);
    });

    container.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        this._selected = el.dataset.date;
        this._renderCalendar(container);
      });
    });

    container.querySelector('#cal-add-event').addEventListener('click', async () => {
      const title = prompt('Event title:');
      if (!title) return;
      const time = prompt('Time (e.g. 14:00):') || '';
      this.events.push({ id: Date.now().toString(), date: this._selected, title, time });
      await this.saveEvents();
      this._renderCalendar(container);
    });

    this._renderEvents(container);
  },

  _renderEvents(container) {
    const el = container.querySelector('#calendar-events');
    if (!el) return;
    const dayEvents = this.events.filter(e => e.date === this._selected);
    if (dayEvents.length === 0) {
      el.innerHTML = '<div class="app-empty">No events</div>';
      return;
    }
    el.innerHTML = dayEvents.map(e => `
      <div class="app-list-item" style="padding:8px var(--space-3);display:flex;align-items:center;gap:10px;">
        <span style="flex:1;">${AppUtils.escapeHtml(e.title)}</span>
        <span style="font-size:12px;color:var(--content-text-secondary);">${AppUtils.escapeHtml(e.time || '')}</span>
        <button class="app-btn cal-del-btn" data-id="${AppUtils.escapeHtml(e.id)}" style="font-size:10px;padding:2px 6px;">✕</button>
      </div>
    `).join('');

    el.querySelectorAll('.cal-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = this.events.findIndex(e => e.id === btn.dataset.id);
        if (idx === -1) return;
        this.events.splice(idx, 1);
        await this.saveEvents();
        this._renderEvents(container);
      });
    });
  }
};
