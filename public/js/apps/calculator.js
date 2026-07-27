// Calculator app
const AppCalculator = {
  render(container) {
    container.innerHTML = `
      <div style="max-width:260px;margin:0 auto;">
        <div id="calc-display" style="background:rgba(0,0,0,0.04);border-radius:8px;padding:12px 16px;text-align:right;font-size:32px;font-weight:300;min-height:60px;display:flex;align-items:flex-end;justify-content:flex-end;word-break:break-all;">0</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px;" id="calc-buttons"></div>
      </div>
    `;

    const buttons = [
      'C','±','%','÷',
      '7','8','9','×',
      '4','5','6','−',
      '1','2','3','+',
      '0','','.','=',
    ];

    const btnGrid = container.querySelector('#calc-buttons');
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b;
      btn.className = 'app-btn';
      btn.style.cssText = 'padding:14px 0;font-size:18px;font-weight:500;';
      if (b === '=') btn.classList.add('primary');
      if (b === '0') btn.style.gridColumn = 'span 2';
      btn.addEventListener('click', () => this.handleButton(b, container));
      btnGrid.appendChild(btn);
    });

    this.current = '0';
    this.previous = '';
    this.operator = null;
    this.resetFlag = false;
  },

  handleButton(label, container) {
    const display = container.querySelector('#calc-display');

    if (label === 'C') {
      this.current = '0'; this.previous = ''; this.operator = null; this.resetFlag = false;
    } else if (label === '±') {
      this.current = (parseFloat(this.current) * -1).toString();
    } else if (label === '%') {
      this.current = (parseFloat(this.current) / 100).toString();
    } else if (['÷','×','−','+'].includes(label)) {
      if (this.operator && !this.resetFlag) this.calculate();
      this.previous = this.current;
      this.operator = label;
      this.resetFlag = true;
    } else if (label === '=') {
      this.calculate();
      this.operator = null;
    } else if (label === '.') {
      if (this.resetFlag) { this.current = '0'; this.resetFlag = false; }
      if (!this.current.includes('.')) this.current += '.';
    } else {
      if (this.resetFlag) { this.current = ''; this.resetFlag = false; }
      if (this.current === '0') this.current = label;
      else this.current += label;
    }

    display.textContent = this.current || '0';
  },

  calculate() {
    const prev = parseFloat(this.previous);
    const curr = parseFloat(this.current);
    if (isNaN(prev) || isNaN(curr)) return;

    const ops = { '÷': (a,b) => a/b, '×': (a,b) => a*b, '−': (a,b) => a-b, '+': (a,b) => a+b };
    const result = ops[this.operator](prev, curr);
    this.current = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
  }
};
