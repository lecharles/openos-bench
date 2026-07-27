// Calendar app
const AppCalendar = {
  _year: new Date().getFullYear(),
  _month: new Date().getMonth(),

  render(container) {
    if (!this._year) { this._year = new Date().getFullYear(); this._month = new Date().getMonth(); }
    this._renderCalendar(container);
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
          const isToday = isCurrentMonth && day === today;
          const style = isToday ? 'background:#ff3b30;color:#fff;border-radius:50%;padding:4px 6px;' : '';
          cal += `<td style="padding:8px;cursor:default;"><span style="${style}">${day}</span></td>`;
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
        <h3 style="font-size:14px;margin-bottom:8px;">Events</h3>
        <div id="calendar-events" class="app-empty">No events today</div>
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
  }
};
