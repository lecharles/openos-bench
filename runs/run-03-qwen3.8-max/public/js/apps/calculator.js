import { el } from '../core/util.js';

const LAYOUT = [
  ['AC', 'fn'], ['±', 'fn'], ['%', 'fn'], ['÷', 'op'],
  ['7'], ['8'], ['9'], ['×', 'op'],
  ['4'], ['5'], ['6'], ['−', 'op'],
  ['1'], ['2'], ['3'], ['+', 'op'],
  ['0', 'zero'], ['.'], ['=', 'op'],
];

export default {
  id: 'calculator',
  name: 'Calculator',
  size: { w: 260, h: 380 },
  minW: 220, minH: 300,
  keywords: 'calc math compute',

  mount(root, api) {
    const calc = el('div', { class: 'calc', 'data-testid': 'calculator' });
    const disp = el('div', { class: 'disp', 'data-testid': 'calc-display', text: '0' });
    const keys = el('div', { class: 'keys' });
    calc.append(disp, keys);
    root.append(calc);

    let acc = null, op = null, cur = '0', fresh = true;
    const fmt = (n) => {
      if (!isFinite(n)) return 'Error';
      const s = Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-7 && n !== 0) ? n.toExponential(5) : String(Math.round(n * 1e10) / 1e10);
      const [i, d] = s.split('.');
      const ii = i.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (i.startsWith('-') ? '-' : '') + ii + (d ? '.' + d : '');
    };
    const show = () => { disp.textContent = fresh ? fmt(parseFloat(cur)) : cur; disp.style.fontSize = disp.textContent.length > 11 ? '30px' : '44px'; };

    function digit(d) {
      if (fresh) { cur = d === '.' ? '0.' : d; fresh = false; }
      else {
        if (d === '.' && cur.includes('.')) return;
        if (cur.replace(/[-.]/g, '').length >= 9 && d !== '.') return;
        cur = cur === '0' && d !== '.' ? d : cur + d;
      }
      show();
    }
    function applyOp(o) {
      const v = parseFloat(cur);
      if (op && !fresh) { acc = compute(acc, v, op); cur = String(acc); }
      else acc = v;
      op = o; fresh = true;
      markOp(o);
      show();
    }
    const compute = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b;
    function equals() {
      const v = parseFloat(cur);
      if (op !== null && acc !== null) { acc = compute(acc, v, op); cur = String(acc); op = null; }
      fresh = true;
      markOp(null);
      show();
    }
    function markOp(o) {
      keys.querySelectorAll('.k.op').forEach((k) => k.classList.toggle('active', k.dataset.k === o));
    }
    function press(k) {
      if (k >= '0' && k <= '9' || k === '.') return digit(k);
      if (['+', '−', '×', '÷'].includes(k)) return applyOp(k);
      if (k === '=') return equals();
      if (k === 'AC') { acc = null; op = null; cur = '0'; fresh = true; markOp(null); return show(); }
      if (k === '±') { cur = cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur); return show(); }
      if (k === '%') {
        const v = parseFloat(cur);
        cur = String(op === '+' || op === '−' ? (acc || 0) * v / 100 : v / 100);
        fresh = true; return show();
      }
    }

    for (const [k, cls] of LAYOUT) {
      const b = el('button', { class: 'k ' + (cls || ''), dataset: { k }, text: k, 'data-testid': 'calc-' + k });
      b.addEventListener('click', () => press(k));
      keys.append(b);
    }

    root.addEventListener('keydown', (e) => {
      const map = { Enter: '=', '=': '=', Escape: 'AC', Backspace: 'AC', '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' };
      let k = map[e.key];
      if (!k && /^[0-9.]$/.test(e.key)) k = e.key;
      if (k) { e.preventDefault(); e.stopPropagation(); press(k); }
    });
    show();
  },
};
