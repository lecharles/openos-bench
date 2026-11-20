import { FS, dedupeName } from './fsapi.js';
import { get, set } from './state.js';
import { bus } from './bus.js';
import { toast } from './toast.js';

export async function moveToTrash(entry) {
  const trashList = await FS.list('.Trash').catch(() => ({ entries: [] }));
  const name = dedupeName(trashList.entries, entry.name);
  await FS.move(entry.path, `.Trash/${name}`);
  const t = get('trash', {});
  t[name] = { from: entry.path, at: Date.now(), kind: entry.kind };
  set('trash', t, true);
  bus.emit('fschange', { type: 'trash', path: entry.path });
  toast('Moved to Trash', `“${entry.name}” was moved to the Trash.`, 'trash');
}

export async function restoreFromTrash(name) {
  const meta = (get('trash', {}))[name] || {};
  let dest = meta.from || `Desktop/${name}`;
  const slash = dest.lastIndexOf('/');
  const parent = slash > 0 ? dest.slice(0, slash) : '';
  if (parent) await FS.mkdir(parent).catch(() => {});
  const listing = await FS.list(parent).catch(() => ({ entries: [] }));
  const baseName = dest.slice(slash + 1);
  dest = (parent ? parent + '/' : '') + dedupeName(listing.entries, baseName);
  await FS.move(`.Trash/${name}`, dest);
  const t = get('trash', {});
  delete t[name];
  set('trash', t, true);
  bus.emit('fschange', { type: 'restore', path: dest });
  toast('Restored', `“${name}” was put back.`, 'trash');
  return dest;
}

export async function deleteForever(name) {
  await FS.del(`.Trash/${name}`);
  const t = get('trash', {});
  delete t[name];
  set('trash', t, true);
  bus.emit('fschange', { type: 'delete', path: `.Trash/${name}` });
}

export async function emptyTrash() {
  const list = await FS.list('.Trash');
  for (const e of list.entries) await FS.del(e.path).catch(() => {});
  set('trash', {}, true);
  bus.emit('fschange', { type: 'empty' });
  toast('Trash emptied', `${list.entries.length} item(s) permanently deleted.`, 'trash');
}

export async function renameEntry(entry, newName) {
  await FS.rename(entry.path, newName);
  bus.emit('fschange', { type: 'rename', path: entry.path, newName });
}

export async function newFolderIn(dirPath) {
  const listing = await FS.list(dirPath);
  const name = dedupeName(listing.entries, 'untitled folder');
  await FS.mkdir(dirPath ? `${dirPath}/${name}` : name);
  bus.emit('fschange', { type: 'mkdir', path: dirPath });
  return name;
}

export async function trashCount() {
  try { return (await FS.list('.Trash')).entries.length; } catch { return 0; }
}
