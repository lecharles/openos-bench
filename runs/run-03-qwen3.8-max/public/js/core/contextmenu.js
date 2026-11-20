import { el } from './util.js';

const menu = () => document.getElementById('context-menu');

let open = false;

export function hideContextMenu() {
  const m = menu();
  m.dataset.open = 'false';
  m.innerHTML = '';
  open = false;
}

/**
 * items: [{label, action, shortcut, disabled, separator, checked}]
 */
export function showContextMenu(x, y, items) {
  const m = menu();
  m.innerHTML = '';
  for (const it of items) {
    if (!it) continue;
    if (it.separator) { m.append(el('div', { class: 'sep' })); continue; }
    const row = el('div', { class: 'mi' + (it.disabled ? ' disabled' : ''), role: 'menuitem' },
      el('span', { class: 'check', text: it.checked ? '✓' : '' }),
      el('span', { text: it.label }),
      it.shortcut ? el('span', { class: 'shortcut', text: it.shortcut }) : null);
    if (!it.disabled) row.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      hideContextMenu();
      setTimeout(() => it.action && it.action(), 0);
    });
    m.append(row);
  }
  m.dataset.open = 'true';
  open = true;
  const r = m.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  m.style.left = `${Math.min(x, vw - r.width - 8)}px`;
  m.style.top = `${Math.min(y, vh - r.height - 8)}px`;
  return m;
}

export const isContextMenuOpen = () => open;

document.addEventListener('mousedown', (e) => {
  if (open && !e.target.closest('#context-menu')) hideContextMenu();
}, true);
addEventListener('blur', hideContextMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideContextMenu(); });
