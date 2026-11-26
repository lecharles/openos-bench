const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.OPENOS_URL || 'http://127.0.0.1:3000';
const call = async (path, options = {}) => {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body });
  const data = await response.json();
  return { status: response.status, data };
};
(async () => {
  let result = await call('/api/health'); assert.equal(result.status, 200); assert.equal(result.data.ok, true);
  result = await call('/api/fs/list?path=/Documents'); assert.equal(result.status, 200); assert.ok(result.data.items.some(i => i.name === 'Welcome.txt'));
  for (const path of ['/etc/shadow', '/../server.js', '/%2e%2e/server.js', '/root/.ssh/id_rsa', '/proc/self/environ']) {
    result = await call(`/api/fs/list?path=${encodeURIComponent(path)}`); assert.equal(result.status, 403, `${path} must be forbidden`);
  }
  const linkPath = path.join(__dirname, '..', 'workspace', 'Documents', `escape-${process.pid}.txt`), targetPath = path.join(__dirname, '..', 'data', 'symlink-target.txt');
  fs.writeFileSync(targetPath, 'unchanged'); fs.symlinkSync(targetPath, linkPath);
  result = await call(`/api/fs/file?path=${encodeURIComponent('/Documents/' + path.basename(linkPath))}`); assert.equal(result.status, 403, 'file reads through symlinks must be forbidden');
  result = await call('/api/fs/write', { method: 'POST', body: { path: '/Documents/' + path.basename(linkPath), content: 'must not escape' } }); assert.equal(result.status, 403, 'writes through symlinks must be forbidden');
  assert.equal(fs.readFileSync(targetPath, 'utf8'), 'unchanged'); fs.unlinkSync(linkPath); fs.unlinkSync(targetPath);
  const suffix = Date.now(), folder = `/Documents/OpenOS-Test-${suffix}`, file = `${folder}/probe.txt`, renamed = `${folder}/renamed.txt`;
  result = await call('/api/fs/mkdir', { method: 'POST', body: { path: '/Documents', name: `OpenOS-Test-${suffix}` } }); assert.equal(result.status, 201);
  result = await call('/api/fs/write', { method: 'POST', body: { path: file, content: 'server persistence probe' } }); assert.equal(result.status, 200);
  result = await call(`/api/fs/file?path=${encodeURIComponent(file)}`); assert.equal(result.data.content, 'server persistence probe');
  result = await call('/api/fs/rename', { method: 'POST', body: { path: file, newName: 'renamed.txt' } }); assert.equal(result.data.item.path, renamed);
  result = await call('/api/fs/trash', { method: 'POST', body: { path: renamed } }); assert.equal(result.status, 200); const trashPath = result.data.trashPath;
  result = await call('/api/fs/trash'); assert.ok(result.data.items.some(i => i.path === trashPath));
  result = await call('/api/fs/restore', { method: 'POST', body: { path: trashPath } }); assert.equal(result.status, 200); assert.equal(result.data.restoredPath, renamed);
  result = await call('/api/fs/trash', { method: 'POST', body: { path: renamed } }); const trashFile = result.data.trashPath;
  result = await call('/api/fs/trash', { method: 'POST', body: { path: folder } }); const trashFolder = result.data.trashPath;
  for (const trashItem of [trashFile, trashFolder]) { result = await call(`/api/fs/trash?path=${encodeURIComponent(trashItem)}`, { method: 'DELETE' }); assert.equal(result.status, 200); }
  const state = await call('/api/state'); assert.equal(state.status, 200);
  result = await call('/api/state', { method: 'PATCH', body: { preferences: { apiProbe: suffix } } }); assert.equal(result.status, 200);
  result = await call('/api/state'); assert.equal(result.data.preferences.apiProbe, suffix);
  const image = await fetch(base + '/api/fs/raw?path=' + encodeURIComponent('/Pictures/Golden Hour.svg')); assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /image\/svg/); assert.match(await image.text(), /<svg/);
  console.log('PASS api-smoke: health, list, read/write, rename, trash/restore, state, image, and 7 security probes');
})().catch(error => { console.error(error); process.exitCode = 1; });
