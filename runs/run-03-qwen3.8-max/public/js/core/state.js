import { debounce } from './util.js';

/** Single server-persisted state document. */
export const State = {
  data: null,
  loaded: false,
  listeners: new Set(),
};

export const DEFAULTS = {
  settings: {
    theme: 'dark', wallpaper: 'sonoma', accent: '#0a84ff',
    dockSize: 52, dockMagnify: true, brightness: 1, volume: 0.7,
  },
  layout: { windows: [], focusedApp: 'finder' },
  desktop: { positions: {} },
  calendar: { events: [], seeded: false },
  contacts: { list: [], seeded: false },
  mail: { messages: [], read: [], sent: [], drafts: [], seeded: false, nextId: 100 },
  notes: { items: [], seeded: false },
  trash: {},
  photos: { favs: [] },
  music: { lastTrack: null },
};

const KEY_ORDER = Object.keys(DEFAULTS);

function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over === undefined ? base : over;
  if (typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) out[k] = (k in base) ? deepMerge(base[k], v) : v;
  return out;
}

export async function loadState() {
  let server = {};
  try {
    const r = await fetch('/api/state');
    if (r.ok) server = await r.json();
  } catch (e) { console.warn('state load failed', e); }
  State.data = {};
  for (const k of KEY_ORDER) State.data[k] = deepMerge(DEFAULTS[k], server[k]);
  for (const [k, v] of Object.entries(server)) if (!(k in State.data)) State.data[k] = v;
  State.loaded = true;
}

const flush = debounce(() => persist(true), 400);

export function saveState(now = false) {
  if (now) persist(true); else flush();
}
async function persist() {
  try {
    await fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(State.data) });
  } catch (e) { console.warn('state save failed', e); }
}
window.addEventListener('beforeunload', () => {
  try {
    navigator.sendBeacon('/api/state', new Blob([JSON.stringify(State.data)], { type: 'application/json' }));
  } catch {}
});

export function get(path, fallback) {
  let cur = State.data;
  for (const p of path.split('.')) {
    if (cur === null || cur === undefined) return fallback;
    cur = cur[p];
  }
  return cur === undefined ? fallback : cur;
}
export function set(path, value, now = false) {
  const parts = path.split('.');
  let cur = State.data;
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  saveState(now);
  for (const fn of State.listeners) { try { fn(path, value); } catch (e) { console.warn(e); } }
}
export function onChange(fn) { State.listeners.add(fn); return () => State.listeners.delete(fn); }

export const settings = {
  get: (k) => get(`settings.${k}`, DEFAULTS.settings[k]),
  set: (k, v, now = false) => set(`settings.${k}`, v, now),
};
