/* Menu engine — dropdown menus (menubar) + context menus.
 * items: {label, shortcut?, disabled?, checked?, danger?, action?, separator?, submenu?} */

let openPanel = null;
let closeHandlers = [];

export function closeMenus() {
  if (openPanel) { openPanel.remove(); openPanel = null; }
  for (const h of closeHandlers) h();
  closeHandlers = [];
}

function buildItem(it) {
  if (it.separator) return '<div class="menu-sep"></div>';
  const cls = ['ctx-item', it.disabled ? 'disabled' : '', it.danger ? 'danger' : ''].filter(Boolean).join(' ');
  const glyph = it.checked ? `<span class="mi-glyph">${ICON_CHECK}</span>` : (it.glyph ? `<span class="mi-glyph">${it.glyph}</span>` : '<span class="mi-glyph"></span>');
  return `<div class="${cls}" data-idx="${it._idx}" role="menuitem">${glyph}<span class="mi-label">${it.label}</span>${it.shortcut ? `<span class="mi-shortcut">${it.shortcut}</span>` : ''}</div>`;
}
const ICON_CHECK = `<svg viewBox="0 0 24 24" width="13" height="13"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 L9.5 17.5 L19.5 7"/></g></svg>`;

export function openMenu({ x, y, items, className = 'ctx-menu', minwidth = 190, onItem, onclose }) {
  closeMenus();
  const panel = document.createElement('div');
  panel.className = className;
  panel.style.minWidth = minwidth + 'px';
  let idx = 0;
  const prepared = items.map((it) => { it._idx = it.separator ? -1 : idx++; return it; });
  panel.innerHTML = prepared.map(buildItem).join('');
  document.getElementById('ctx-layer').appendChild(panel);
  openPanel = panel;

  // position (flip on overflow)
  const r = panel.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let px = Math.min(x, vw - r.width - 8);
  let py = y;
  if (py + r.height > vh - 8) py = Math.max(8, vh - r.height - 8);
  panel.style.left = px + 'px';
  panel.style.top = py + 'px';

  const close = (e) => {
    if (panel.contains(e.target)) return;
    closeMenus();
    if (onclose) onclose();
  };
  setTimeout(() => {
    document.addEventListener('mousedown', close, true);
    document.addEventListener('keydown', escClose, true);
  }, 0);
  function escClose(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeMenus(); if (onclose) onclose(); }
  }
  closeHandlers.push(() => {
    document.removeEventListener('mousedown', close, true);
    document.removeEventListener('keydown', escClose, true);
    if (onclose) onclose();
  });

  panel.addEventListener('click', (e) => {
    const el = e.target.closest('.ctx-item');
    if (!el) return;
    const item = prepared.find((t) => t._idx === Number(el.dataset.idx));
    if (!item || item.disabled) return;
    closeMenus();
    if (onItem) onItem(item);
    if (item.action) item.action();
  });
  return panel;
}

export function contextMenu(x, y, items) {
  return openMenu({ x, y, items, className: 'ctx-menu' });
}
