import { el } from '../core/util.js';
import { wxIconSVG } from '../core/icons.js';

const HOURS = [
  ['Now', 'clear', 68], ['4 PM', 'clear', 69], ['5 PM', 'partly', 67], ['6 PM', 'partly', 64],
  ['7 PM', 'cloud', 61], ['8 PM', 'cloud', 59], ['9 PM', 'rain', 57], ['10 PM', 'rain', 56],
  ['11 PM', 'cloud', 55], ['AM', 'partly', 54], ['1 AM', 'clear', 53], ['2 AM', 'clear', 52],
];
const DAYSF = [
  ['Today', 'partly', 55, 71], ['Thu', 'clear', 56, 74], ['Fri', 'clear', 58, 76],
  ['Sat', 'partly', 57, 72], ['Sun', 'rain', 54, 64], ['Mon', 'storm', 52, 61],
  ['Tue', 'rain', 51, 62], ['Wed', 'cloud', 53, 66], ['Thu', 'partly', 55, 70], ['Fri', 'clear', 57, 73],
];

export default {
  id: 'weather',
  name: 'Weather',
  size: { w: 380, h: 620 },
  minW: 330, minH: 420,
  keywords: 'forecast temperature rain',

  mount(root) {
    const wx = el('div', { class: 'wx', 'data-testid': 'weather' });
    root.append(wx);
    wx.append(
      el('div', { class: 'wx-top' },
        el('div', { class: 'loc', text: 'San Francisco' }),
        el('div', { class: 'temp', text: '68°' }),
        el('div', { class: 'cond', text: 'Sunny' }),
        el('div', { class: 'hl', text: 'H:71°  L:55°' })),
    );
    const pad = el('div', { class: 'wx-pad' });
    wx.append(pad);

    const hours = el('div', { class: 'wx-card' }, el('div', { class: 'wx-h', html: wxIconSVG('clear') }, 'HOURLY FORECAST'));
    const hrow = el('div', { class: 'wx-hours' });
    for (const [h, k, t] of HOURS) hrow.append(el('div', { class: 'wx-hour' }, el('div', { class: 'h', text: h }), el('span', { html: wxIconSVG(k) }), el('div', { class: 't', text: t + '°' })));
    hours.append(hrow);
    pad.append(hours);

    const days = el('div', { class: 'wx-card wx-days' }, el('div', { class: 'wx-h', text: '10-DAY FORECAST' }));
    for (const [d, k, lo, hi] of DAYSF) {
      const left = ((lo - 48) / (80 - 48)) * 100, right = ((hi - 48) / (80 - 48)) * 100;
      days.append(el('div', { class: 'wx-day' },
        el('div', { class: 'd', text: d }),
        el('span', { html: wxIconSVG(k) }),
        el('div', { class: 'bar' }, el('i', { style: { left: left + '%', right: (100 - right) + '%' } })),
        el('div', { style: { display: 'flex', gap: '8px' } }, el('div', { class: 'lo', text: lo + '°' }), el('div', { class: 'hi', text: hi + '°' }))));
    }
    pad.append(days);

    const metrics = el('div', { class: 'wx-metrics' });
    const M = [
      ['UV INDEX', '4', 'Moderate through 5 PM.'],
      ['HUMIDITY', '62%', 'Dew point 54° right now.'],
      ['WIND', '8 mph', 'Gusting to 14 mph from the WSW.'],
      ['VISIBILITY', '10 mi', 'Clear haze over the bay.'],
      ['SUNRISE', '6:52 AM', 'Sunset today at 4:58 PM.'],
      ['PRESSURE', '30.12 in', 'Steady over the last hour.'],
    ];
    for (const [k, v, s] of M) metrics.append(el('div', { class: 'wx-card wx-m' }, el('div', { class: 'wx-h', text: k }), el('div', { class: 'v', text: v }), el('div', { class: 's', text: s })));
    pad.append(metrics);
  },
};
