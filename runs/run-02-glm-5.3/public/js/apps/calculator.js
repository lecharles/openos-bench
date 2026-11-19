/* Calculator — macOS-style, mouse + keyboard input. */
export function mountCalculator(win) {
  win.body.innerHTML = `
    <div class="calc-root">
      <div class="calc-display" id="${win.id}-disp">0</div>
      <div class="calc-keys" id="${win.id}-keys"></div>
    </div>`;
  const disp = win.body.querySelector(`#${win.id}-disp`);
  const keys = win.body.querySelector(`#${win.id}-keys`);

  const layout = [
    ['AC', 'fn'], ['±', 'fn'], ['%', 'fn'], ['÷', 'op'],
    ['7'], ['8'], ['9'], ['×', 'op'],
    ['4'], ['5'], ['6'], ['−', 'op'],
    ['1'], ['2'], ['3'], ['+', 'op'],
    ['0', 'zero'], ['.'], ['=', 'eq'],
  ];

  keys.innerHTML = layout.map(([k, cls]) =>
    `<button class="calc-key ${cls || ''}" data-k="${k}" aria-label="${k}" style="${k === '0' ? 'grid-column:span 2' : ''}">${k}</button>`
  ).join('');

  let acc = null, pending = null, current = '0', fresh = false;

  function fmt(n) {
    if (!isFinite(n)) return 'Error';
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-9 && n !== 0)) return n.toExponential(6);
    const r = Math.round(n * 1e10) / 1e10;
    const [ip, dp] = String(r).split('.');
    const withCommas = Number(ip).toLocaleString('en-US');
    return dp !== undefined ? `${withCommas}.${dp}` : withCommas;
  }
  function show() {
    disp.textContent = current;
    const opBtns = keys.querySelectorAll('[data-k="+"], [data-k="−"], [data-k="×"], [data-k="÷"]');
    for (const b of opBtns) b.classList.toggle('active-op', pending !== null && b.dataset.k === pending);
  }
  function apply(a, b, op) {
    if (op === '+') return a + b;
    if (op === '−') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return b;
  }
  function press(k) {
    if (/^[0-9]$/.test(k)) {
      current = (current === '0' || fresh) ? k : current.slice(0, 14) + k;
      fresh = false;
    } else if (k === '.') {
      if (fresh) { current = '0.'; fresh = false; }
      else if (!current.includes('.')) current += '.';
    } else if (k === 'AC') {
      acc = null; pending = null; current = '0'; fresh = false;
    } else if (k === '±') {
      current = String(parseFloat(current) * -1);
    } else if (k === '%') {
      current = String(parseFloat(current) / 100);
    } else if (k === '+' || k === '−' || k === '×' || k === '÷') {
      const val = parseFloat(current);
      if (pending !== null && !fresh) {
        acc = apply(acc, val, pending);
        current = fmt(acc);
      } else {
        acc = val;
      }
      pending = k;
      fresh = true;
    } else if (k === '=') {
      if (pending !== null) {
        const val = parseFloat(current);
        acc = apply(acc, val, pending);
        current = fmt(acc);
        pending = null;
        fresh = true;
      }
    }
    show();
  }

  keys.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });

  const keyHandler = (e) => {
    if (wmFocused(win)) {
      const map = { '/': '÷', '*': '×', '-': '−', '+': '+', 'Enter': '=', '=': '=', '.': '.', ',': '.', '%': '%' };
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
      else if (e.key === 'Escape') { e.preventDefault(); press('AC'); }
      else if (e.key === 'Backspace') { e.preventDefault(); current = current.length > 1 ? current.slice(0, -1) : '0'; show(); }
    }
  };
  document.addEventListener('keydown', keyHandler);
  win.onclose = () => document.removeEventListener('keydown', keyHandler);

  function wmFocused(w) {
    // calculator keyboard follows window focus; use wm via registry hook to avoid cycles
    return w.el.classList.contains('active');
  }

  show();
}

export function serializeCalculator() { return {}; }
