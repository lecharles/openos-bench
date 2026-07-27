// Calendar app
const AppCalendar = {
  render(container) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cal = '<table style="width:100%;border-collapse:collapse;text-align:center;">';
    cal += '<tr>' + dayNames.map(d => `<th style="padding:8px;color:#666;font-weight:500;">${d}</th>`).join('') + '</tr>';

    let day = 1;
    for (let w = 0; w < 6; w++) {
      cal += '<tr>';
      for (let d = 0; d < 7; d++) {
        if ((w === 0 && d < firstDay) || day > daysInMonth) {
          cal += '<td></td>';
        } else {
          const isToday = day === today;
          const style = isToday ? 'background:#ff3b30;color:#fff;border-radius:50%;padding:4px;' : '';
          cal += `<td style="padding:8px;cursor:default;"><span style="${style}">${day}</span></td>`;
          day++;
        }
      }
      cal += '</tr>';
      if (day > daysInMonth) break;
    }
    cal += '</table>';

    container.innerHTML = `
      <div style="text-align:center;font-size:18px;font-weight:600;margin-bottom:16px;">
        ${monthNames[month]} ${year}
      </div>
      ${cal}
      <div style="margin-top:16px;border-top:1px solid rgba(0,0,0,0.08);padding-top:12px;">
        <h3 style="font-size:14px;margin-bottom:8px;">Events</h3>
        <div id="calendar-events" class="app-empty">No events today</div>
      </div>
    `;
  }
};
