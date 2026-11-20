const J = (r) => r.json();

async function call(url, opts) {
  const r = await fetch(url, opts);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(body.error || `HTTP ${r.status}`);
    err.status = r.status; err.body = body;
    throw err;
  }
  return body;
}
const post = (path, data) => call('/api/fs' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

export const FS = {
  list: (path = '') => call(`/api/fs/list?path=${encodeURIComponent(path)}`),
  read: (path) => call(`/api/fs/read?path=${encodeURIComponent(path)}`),
  rawUrl: (path) => `/api/fs/raw?path=${encodeURIComponent(path)}`,
  write: (path, content) => post('/write', { path, content }),
  mkdir: (path) => post('/mkdir', { path }),
  rename: (path, name) => post('/rename', { path, name }),
  move: (from, to) => post('/move', { from, to }),
  del: (path) => post('/delete', { path }),
  stat: (path) => post('/stat', { path }),
};

/** Unique target name inside a directory listing. */
export function dedupeName(entries, name) {
  const taken = new Set(entries.map((e) => e.name));
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let i = 2;
  while (taken.has(`${base} ${i}${ext}`)) i++;
  return `${base} ${i}${ext}`;
}
export const isTextFile = (e) => e.kind === 'file' && !!e.text;
export const isImageFile = (e) => e.kind === 'file' && !!e.image;
