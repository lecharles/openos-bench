/* Shared "open" behavior for files (used by Spotlight, Desktop, Finder, Terminal). */
import { api } from './api.js';
import { wm } from './wm.js';
import { toast } from './toast.js';

export async function openFile(path, kind) {
  try {
    if (kind === 'folder') {
      wm.open('finder', { payload: { path } });
      return;
    }
    if (kind === 'image') {
      wm.open('preview', { payload: { path } });
      return;
    }
    if (kind === 'text') {
      wm.open('textedit', { payload: { path } });
      return;
    }
    if (!kind) {
      const st = await api.fs.stat(path);
      return openFile(path, st.kind);
    }
    toast({ title: 'Cannot open file', body: `No app can open this file type.`, app: 'settings' });
  } catch (e) {
    toast({ title: 'Cannot open file', body: e.message, app: 'settings' });
  }
}
