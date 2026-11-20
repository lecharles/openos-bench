import { el } from './util.js';
import { APPS } from '../apps/registry.js';
import { appIconSVG } from './icons.js';
import { launch } from './launch.js';
import { bounce } from './dock.js';

const overlay = () => document.getElementById('spotlight');
const input = () => document.getElementById('spotlight-input');
const results = () => document.getElementById('spotlight-results');

let sel = 0;
let current = [];

export function buildSpotlight() {
  overlay().addEventListener('mousedown', (e) => { if (e.target === overlay()) hide(); });
  input().addEventListener('input', refresh);
  input().addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, current.length - 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(current[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(); }
  });
}

export function isOpen() { return overlay().dataset.open === 'true'; }

export function show() {
  overlay().dataset.open = 'true';
  input().value = '';
  refresh();
  setTimeout(() => { input().focus(); input().select(); }, 30);
}
export function hide() {
  overlay().dataset.open = 'false';
}
export function toggle() { isOpen() ? hide() : show(); }

function fuzzyScore(q, s) {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  const idx = s.indexOf(q);
  if (idx === 0) return 100 - s.length * 0.1;
  if (idx > 0) return 70 - idx;
  let si = 0, score = 0, streak = 0;
  for (const ch of q) {
    const at = s.indexOf(ch, si);
    if (at === -1) return 0;
    streak = at === si ? streak + 1 : 0;
    score += 4 + streak * 3 + (at === 0 ? 6 : 0);
    si = at + 1;
  }
  return score;
}

function refresh() {
  const q = input().value.trim();
  const pool = Object.values(APPS).filter((a) => !a.hidden);
  current = pool
    .map((a) => ({ app: a, score: Math.max(fuzzyScore(q, a.name), fuzzyScore(q, a.keywords || '') * 0.7) }))
    .filter((r) => r.score > 0 || !q)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
  sel = 0;
  paint();
}

function paint() {
  const box = results();
  box.innerHTML = '';
  if (!current.length) { box.classList.remove('has'); return; }
  box.classList.add('has');
  current.forEach((r, i) => {
    const row = el('div', { class: 'sp-row' + (i === sel ? ' sel' : ''), 'data-testid': 'spotlight-result', dataset: { app: r.app.id } },
      el('div', { class: 'sp-ic', html: appIconSVG(r.app.id) }),
      el('div', {}, el('div', { class: 'sp-name', text: r.app.name }), el('div', { class: 'sp-sub', text: i === 0 ? 'Application' : '' })),
      el('div', { class: 'sp-kind', text: 'Application' }));
    row.addEventListener('mousedown', (e) => { e.preventDefault(); activate(r); });
    row.addEventListener('mousemove', () => { if (sel !== i) { sel = i; paint(); } });
    box.append(row);
  });
}

async function activate(r) {
  if (!r) return;
  hide();
  await bounce(r.app.id);
  launch(r.app.id);
}
