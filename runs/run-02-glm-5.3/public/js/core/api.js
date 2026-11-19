/* Backend API client */
async function jfetch(url, opts) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
const json = { 'content-type': 'application/json' };

export const api = {
  HOME: null, // filled by resolveHome()

  async resolveHome() {
    const r = await jfetch('/api/fs/list?path=' + encodeURIComponent('~'));
    this.HOME = r.path;
    return r.path;
  },
  health: () => jfetch('/api/health'),

  settings: {
    get: () => jfetch('/api/settings'),
    put: (patch) => jfetch('/api/settings', { method: 'PUT', headers: json, body: JSON.stringify(patch) }),
  },
  layout: {
    get: () => jfetch('/api/layout'),
    put: (obj) => jfetch('/api/layout', { method: 'PUT', headers: json, body: JSON.stringify(obj) }),
  },
  store: { // notes / events / contacts
    get: (name) => jfetch(`/api/${name}`),
    put: (name, arr) => jfetch(`/api/${name}`, { method: 'PUT', headers: json, body: JSON.stringify(arr) }),
  },

  fs: {
    list: (path) => jfetch('/api/fs/list?path=' + encodeURIComponent(path)),
    readText: (path) => jfetch('/api/fs/read?path=' + encodeURIComponent(path) + '&mode=text'),
    async readDataURL(path) {
      const r = await jfetch('/api/fs/read?path=' + encodeURIComponent(path) + '&mode=base64');
      return `data:${r.mime};base64,${r.base64}`;
    },
    stat: (path) => jfetch('/api/fs/read?path=' + encodeURIComponent(path) + '&mode=stat'),
    write: (path, content, encoding) => jfetch('/api/fs/write', { method: 'POST', headers: json, body: JSON.stringify({ path, content, encoding }) }),
    mkdir: (path) => jfetch('/api/fs/mkdir', { method: 'POST', headers: json, body: JSON.stringify({ path }) }),
    rename: (from, to) => jfetch('/api/fs/rename', { method: 'POST', headers: json, body: JSON.stringify({ from, to }) }),
    trash: (path) => jfetch('/api/fs/trash', { method: 'POST', headers: json, body: JSON.stringify({ path }) }),
    restore: (id) => jfetch('/api/fs/restore', { method: 'POST', headers: json, body: JSON.stringify({ id }) }),
    emptyTrash: () => jfetch('/api/fs/empty-trash', { method: 'POST', headers: json, body: JSON.stringify({}) }),
    listTrash: () => jfetch('/api/trash'),
    delete: (path) => jfetch('/api/fs/delete', { method: 'POST', headers: json, body: JSON.stringify({ path }) }),
  },
};
