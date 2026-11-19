/* Toast notifications (top-right cards) */
import { icon } from './icons.js';

let dnd = false;
export function setDND(v) { dnd = !!v; }

export function toast({ title, body = '', app = 'settings', timeout = 3800 }) {
  if (dnd) return;
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="t-icon">${icon(app, 28)}</div>
    <div class="t-text">
      <div class="t-title">${escapeHTML(title)}</div>
      ${body ? `<div class="t-body">${escapeHTML(body)}</div>` : ''}
    </div>`;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, timeout);
}

export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
