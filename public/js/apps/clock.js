// Clock app - world clock, alarm, stopwatch, timer
const AppClock = {
  _clockTimer: null,
  _swInterval: null,
  _swTime: 0,
  _swRunning: false,
  _timerInterval: null,
  _timerRemaining: 0,

  render(container) {
    container.innerHTML = `
      <div style="text-align:center;">
        <div id="clock-display" style="font-size:64px;font-weight:200;letter-spacing:-2px;margin:20px 0;"></div>
        <div id="clock-date" style="font-size:16px;color:#666;margin-bottom:20px;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="app-btn" id="clock-stopwatch">Stopwatch</button>
        <button class="app-btn" id="clock-timer">Timer</button>
      </div>
      <div id="clock-extra" style="margin-top:12px;"></div>
    `;

    this._updateTime(container);
    this._clockTimer = setInterval(() => this._updateTime(container), 1000);

    container.querySelector('#clock-stopwatch').addEventListener('click', () => {
      this._showStopwatch(container);
    });

    container.querySelector('#clock-timer').addEventListener('click', () => {
      this._showTimer(container);
    });
  },

  cleanup() {
    if (this._clockTimer) { clearInterval(this._clockTimer); this._clockTimer = null; }
    if (this._swInterval) { clearInterval(this._swInterval); this._swInterval = null; }
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  },

  _updateTime(container) {
    const now = new Date();
    const h = now.getHours().toString().padStart(2,'0');
    const m = now.getMinutes().toString().padStart(2,'0');
    const s = now.getSeconds().toString().padStart(2,'0');
    const disp = container.querySelector('#clock-display');
    const date = container.querySelector('#clock-date');
    if (disp) disp.textContent = `${h}:${m}:${s}`;
    if (date) date.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  },

  _showStopwatch(container) {
    // Clear any running timer interval
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }

    const extra = container.querySelector('#clock-extra');
    extra.innerHTML = `<div style="text-align:center;font-size:36px;font-weight:200;" id="stopwatch-display">00:00:00</div>
      <div style="text-align:center;margin-top:8px;">
        <button class="app-btn primary" id="sw-start">Start</button>
        <button class="app-btn" id="sw-reset">Reset</button>
      </div>`;

    if (this._swRunning) {
      // Restore display from running state
      const h = Math.floor(this._swTime/3600).toString().padStart(2,'0');
      const m = Math.floor((this._swTime%3600)/60).toString().padStart(2,'0');
      const s = (this._swTime%60).toString().padStart(2,'0');
      extra.querySelector('#stopwatch-display').textContent = `${h}:${m}:${s}`;
      extra.querySelector('#sw-start').textContent = 'Stop';
    }

    extra.querySelector('#sw-start').addEventListener('click', () => {
      const btn = extra.querySelector('#sw-start');
      if (this._swRunning) {
        clearInterval(this._swInterval);
        this._swInterval = null;
        this._swRunning = false;
        btn.textContent = 'Start';
      } else {
        this._swRunning = true;
        btn.textContent = 'Stop';
        this._swInterval = setInterval(() => {
          this._swTime++;
          const h = Math.floor(this._swTime/3600).toString().padStart(2,'0');
          const m = Math.floor((this._swTime%3600)/60).toString().padStart(2,'0');
          const s = (this._swTime%60).toString().padStart(2,'0');
          const disp = extra.querySelector('#stopwatch-display');
          if (disp) disp.textContent = `${h}:${m}:${s}`;
        }, 1000);
      }
    });

    extra.querySelector('#sw-reset').addEventListener('click', () => {
      clearInterval(this._swInterval);
      this._swInterval = null;
      this._swRunning = false;
      this._swTime = 0;
      const disp = extra.querySelector('#stopwatch-display');
      if (disp) disp.textContent = '00:00:00';
      const btn = extra.querySelector('#sw-start');
      if (btn) btn.textContent = 'Start';
    });
  },

  _showTimer(container) {
    // Clear any running stopwatch interval
    if (this._swInterval) { clearInterval(this._swInterval); this._swInterval = null; }
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }

    const extra = container.querySelector('#clock-extra');
    extra.innerHTML = `<div style="text-align:center;">
      <input type="number" id="timer-minutes" class="app-input" value="5" min="1" style="width:80px;text-align:center;font-size:24px;" placeholder="Min">
      <span style="font-size:24px;"> min</span>
      <div style="margin-top:8px;">
        <button class="app-btn primary" id="timer-start">Start</button>
        <button class="app-btn" id="timer-stop">Stop</button>
      </div>
      <div id="timer-display" style="font-size:36px;font-weight:200;margin-top:8px;"></div>
    </div>`;

    extra.querySelector('#timer-start').addEventListener('click', () => {
      const min = parseInt(extra.querySelector('#timer-minutes').value) || 5;
      this._timerRemaining = min * 60;
      clearInterval(this._timerInterval);
      const update = () => {
        const m = Math.floor(this._timerRemaining/60).toString().padStart(2,'0');
        const s = (this._timerRemaining%60).toString().padStart(2,'0');
        const disp = extra.querySelector('#timer-display');
        if (disp) disp.textContent = `${m}:${s}`;
        if (this._timerRemaining <= 0) {
          clearInterval(this._timerInterval);
          this._timerInterval = null;
          Notifications.add('Timer', 'Time is up!');
        }
        this._timerRemaining--;
      };
      update();
      this._timerInterval = setInterval(update, 1000);
    });

    extra.querySelector('#timer-stop').addEventListener('click', () => {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    });
  }
};
