/* ⌘Tab app switcher overlay */
import { icon } from './icons.js';
import { APPS } from './registry.js';
import { wm } from './wm.js';
import { bus } from './bus.js';

const el = () => document.getElementById('appswitcher');
let visible = false;
let sel = 0;
let apps = [];

export function initAppSwitcher() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!visible) {
        apps = wm.runningApps();
        if (!apps.length) return;
        sel = Math.max(0, apps.indexOf(wm.focused?.appId));
        show();
      } else {
        sel = (sel + (e.shiftKey ? -1 : 1) + apps.length) % apps.length;
        render();
      }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (visible && (e.key === 'Meta' || e.key === 'Control')) {
      hide();
      const appId = apps[sel];
      if (appId) {
        const running = wm.byApp(appId);
        const minimized = running.filter((w) => w.minimized);
        if (minimized.length) wm.restore(minimized[minimized.length - 1]);
        else if (running.length) wm.focus(running.sort((a, b) => a.el.style.zIndex - b.el.style.zIndex).pop());
        else wm.open(appId);
      }
    }
  });
}

function show() { visible = true; el().hidden = false; render(); }
function hide() { visible = false; el().hidden = true; }

function render() {
  el().innerHTML = `<div class="switcher-panel">` + apps.map((id, i) => {
    const def = APPS[id];
    return `<div class="switch-item ${i === sel ? 'selected' : ''}"><div>${icon(def.icon || id, 64)}</div><div class="sw-name">${def.name}</div></div>`;
  }).join('') + `</div>`;
}
