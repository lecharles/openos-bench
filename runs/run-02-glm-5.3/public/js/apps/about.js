/* About This Computer — small system info window. */
import { icon } from '../core/icons.js';
import { APPS } from '../core/registry.js';

export function mountAbout(win, payload) {
  const app = payload.app ? APPS[payload.app] : null;
  win.body.innerHTML = `
    <div class="about-hero" style="padding-top:34px">
      ${icon('logo', 84)}
      <div class="ah-name" style="margin-top:6px">${app ? app.name : 'OpenOS'}</div>
      <div class="ah-sub">${app ? `part of OpenOS 1.0` : 'Version 1.0 (OpenOS Bench)'}</div>
      <div class="ah-specs">
        ${app ? `${app.name} — ${app.desc || 'one of the built-in apps of OpenOS.'}<br><br>` : ''}
        Chip — <b>GLM-5.3</b><br>
        Memory — <b>Overnight Session</b><br>
        Startup disk — <b>OpenOS Data</b><br>
        ${payload.help ? 'Tip: press <b>⌘Space</b> for Spotlight, right-click the desktop for options, and type <b>help</b> in Terminal.' : ''}
      </div>
    </div>`;
  win.setTitle('About This Computer');
}

export function serializeAbout() { return {}; }
