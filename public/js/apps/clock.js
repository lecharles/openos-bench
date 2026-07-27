// Clock app - world clock, alarm, stopwatch, timer
const AppClock = {
  timer: null,

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

    this.updateTime(container);
    this.timer = setInterval(() => this.updateTime(container), 1000);

    container.querySelector('#clock-stopwatch').addEventListener('click', () => {
      const extra = container.querySelector('#clock-extra');
      extra.innerHTML = `<div style="text-align:center;font-size:36px;font-weight:200;" id="stopwatch-display">00:00:00</div>
        <div style="text-align:center;margin-top:8px;">
          <button class="app-btn primary" id="sw-start">Start</button>
          <button class="app-btn" id="sw-reset">Reset</button>
        </div>`;
      let swRunning = false, swTime = 0, swInterval;
      container.querySelector('#sw-start').addEventListener('click', function() {
        if (swRunning) { clearInterval(swInterval); swRunning = false; this.textContent = 'Start'; }
        else {
          swRunning = true; this.textContent = 'Stop';
          swInterval = setInterval(() => {
            swTime++;
            const h = Math.floor(swTime/3600).toString().padStart(2,'0');
            const m = Math.floor((swTime%3600)/60).toString().padStart(2,'0');
            const s = (swTime%60).toString().padStart(2,'0');
            extra.querySelector('#stopwatch-display').textContent = `${h}:${m}:${s}`;
          }, 1000);
        }
      });
      container.querySelector('#sw-reset').addEventListener('click', () => {
        clearInterval(swInterval); swRunning = false; swTime = 0;
        extra.querySelector('#stopwatch-display').textContent = '00:00:00';
        extra.querySelector('#sw-start').textContent = 'Start';
      });
    });

    container.querySelector('#clock-timer').addEventListener('click', () => {
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
      let timerInterval, timerRemaining;
      container.querySelector('#timer-start').addEventListener('click', () => {
        const min = parseInt(container.querySelector('#timer-minutes').value) || 5;
        timerRemaining = min * 60;
        clearInterval(timerInterval);
        const update = () => {
          const m = Math.floor(timerRemaining/60).toString().padStart(2,'0');
          const s = (timerRemaining%60).toString().padStart(2,'0');
          extra.querySelector('#timer-display').textContent = `${m}:${s}`;
          if (timerRemaining <= 0) { clearInterval(timerInterval); Notifications.add('Timer', 'Time is up!'); }
          timerRemaining--;
        };
        update();
        timerInterval = setInterval(update, 1000);
      });
      container.querySelector('#timer-stop').addEventListener('click', () => clearInterval(timerInterval));
    });
  },

  updateTime(container) {
    const now = new Date();
    const h = now.getHours().toString().padStart(2,'0');
    const m = now.getMinutes().toString().padStart(2,'0');
    const s = now.getSeconds().toString().padStart(2,'0');
    const disp = container.querySelector('#clock-display');
    const date = container.querySelector('#clock-date');
    if (disp) disp.textContent = `${h}:${m}:${s}`;
    if (date) date.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }
};
