import { el } from './util.js';
import { appIconSVG } from './icons.js';

export function toast(title, body, icon = 'settings', ms = 4200) {
  const wrap = document.getElementById('toasts');
  const t = el('div', { class: 'toast', role: 'status' },
    el('div', { class: 't-icon', html: typeof icon === 'string' && icon.includes('<') ? icon : appIconSVG(icon) }),
    el('div', {}, el('div', { class: 't-title', text: title }), body ? el('div', { class: 't-body', text: body }) : null));
  wrap.append(t);
  t.addEventListener('click', () => dismiss());
  const dismiss = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
  setTimeout(dismiss, ms);
  return t;
}
