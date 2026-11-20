import { launch } from './launch.js';
import { toast } from './toast.js';

export function kindLabel(entry) {
  if (entry.kind === 'dir') return 'Folder';
  const ext = (entry.ext || entry.name.split('.').pop() || '').toLowerCase();
  return { png: 'PNG image', jpg: 'JPEG image', jpeg: 'JPEG image', gif: 'GIF image', svg: 'SVG image', webp: 'WebP image', txt: 'Plain text', md: 'Markdown', json: 'JSON', csv: 'CSV', m3u: 'Playlist', html: 'HTML', js: 'JavaScript', css: 'CSS' }[ext] || (ext ? ext.toUpperCase() + ' document' : 'Document');
}

export function openEntry(entry) {
  if (entry.kind === 'dir') return launch('finder', { params: { path: entry.path } });
  if (entry.image) return launch('preview', { params: { path: entry.path } });
  if (entry.text) return launch('textedit', { params: { path: entry.path } });
  toast('Cannot open', `OpenOS has no app for “${entry.name}”.`, 'settings');
  return null;
}
