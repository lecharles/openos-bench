/* App registry — binds all apps to the shell. */
import { registerApp } from './core/registry.js';
import { mountFinder } from './finder.js';
import { mountNotes, serializeNotes } from './apps/notes.js';
import { mountCalendar, serializeCalendar } from './apps/calendar.js';
import { mountWeather, serializeWeather } from './apps/weather.js';
import { mountCalculator } from './apps/calculator.js';
import { mountPreview, serializePreview } from './apps/preview.js';
import { mountTrash } from './apps/trash.js';
import { mountSettings, serializeSettings } from './apps/settings.js';
import { mountClock } from './apps/clock.js';
import { mountContacts, serializeContacts } from './apps/contacts.js';
import { mountMusic, serializeMusic } from './apps/music.js';
import { mountMail, serializeMail } from './apps/mail.js';
import { mountTerminal, serializeTerminal } from './apps/terminal.js';
import { mountPhotos, serializePhotos } from './apps/photos.js';
import { mountTextEdit, serializeTextEdit } from './apps/textedit.js';
import { mountAbout } from './apps/about.js';

registerApp({
  id: 'finder', name: 'Finder', icon: 'finder',
  w: 900, h: 560, minW: 560, minH: 340, singleton: true, inDock: true,
  desc: 'Browse the real filesystem.',
  mount: mountFinder,
  serialize: (win) => win.__finderState ? { path: win.__finderState.cwd, view: win.__finderState.view } : {},
  reopen: (win, payload) => { if (payload.path && win.navigate) win.navigate(payload.path); },
  menus: () => ({
    File: [
      { label: 'New Finder Window', shortcut: '⌘N', action: () => import('./core/wm.js').then(({ wm }) => wm.open('finder', { payload: { path: '~' } })) },
      { label: 'New Folder', shortcut: '⇧⌘N', action: () => busEmit('finder:newfolder') },
      { separator: true },
      { label: 'Close Window', shortcut: '⌘W', action: () => closeFocused() },
    ],
    View: [
      { label: 'as Icons', shortcut: '⌘1', action: () => busEmit('finder:view', 'icons') },
      { label: 'as List', shortcut: '⌘2', action: () => busEmit('finder:view', 'list') },
    ],
  }),
});
registerApp({ id: 'notes', name: 'Notes', icon: 'notes', w: 900, h: 560, minW: 560, minH: 320, singleton: true, inDock: true, desc: 'Notes that persist.', mount: mountNotes, serialize: serializeNotes });
registerApp({ id: 'calendar', name: 'Calendar', icon: 'calendar', w: 960, h: 640, minW: 560, minH: 400, singleton: true, inDock: true, desc: 'Month view with events.', mount: mountCalendar, serialize: serializeCalendar });
registerApp({ id: 'weather', name: 'Weather', icon: 'weather', w: 860, h: 600, minW: 480, minH: 400, singleton: true, inDock: true, desc: 'Forecast for world cities.', mount: mountWeather, serialize: serializeWeather });
registerApp({ id: 'calculator', name: 'Calculator', icon: 'calculator', w: 300, h: 470, minW: 240, minH: 380, singleton: true, inDock: true, desc: 'Basic calculator.', mount: mountCalculator });
registerApp({ id: 'preview', name: 'Preview', icon: 'preview', w: 900, h: 620, minW: 480, minH: 360, inDock: true, desc: 'Renders real images.', mount: mountPreview, serialize: serializePreview });
registerApp({ id: 'trash', name: 'Trash', icon: 'trash', w: 720, h: 480, minW: 460, minH: 300, singleton: true, inDock: true, desc: 'Move and restore files.', mount: mountTrash });
registerApp({ id: 'settings', name: 'System Settings', icon: 'settings', w: 860, h: 600, minW: 620, minH: 420, singleton: true, inDock: true, desc: 'Themes, wallpaper, dock.', mount: mountSettings, serialize: serializeSettings });
registerApp({ id: 'clock', name: 'Clock', icon: 'clock', w: 640, h: 440, minW: 480, minH: 360, singleton: true, inDock: true, desc: 'Analog face + world clocks.', mount: mountClock });
registerApp({ id: 'contacts', name: 'Contacts', icon: 'contacts', w: 860, h: 560, minW: 560, minH: 360, singleton: true, inDock: true, desc: 'Address book.', mount: mountContacts, serialize: serializeContacts });
registerApp({ id: 'music', name: 'Music', icon: 'music', w: 940, h: 640, minW: 620, minH: 420, singleton: true, inDock: true, desc: 'Player with synth audio.', mount: mountMusic, serialize: serializeMusic });
registerApp({ id: 'mail', name: 'Mail', icon: 'mail', w: 1000, h: 640, minW: 700, minH: 420, singleton: true, inDock: true, desc: 'Mock inbox.', mount: mountMail, serialize: serializeMail });
registerApp({ id: 'terminal', name: 'Terminal', icon: 'terminal', w: 760, h: 480, minW: 420, minH: 260, inDock: true, desc: 'Sandboxed shell.', mount: mountTerminal, serialize: serializeTerminal });
registerApp({ id: 'photos', name: 'Photos', icon: 'photos', w: 900, h: 620, minW: 520, minH: 380, singleton: true, inDock: true, desc: 'Gallery of your pictures.', mount: mountPhotos, serialize: serializePhotos });
registerApp({ id: 'textedit', name: 'TextEdit', icon: 'textedit', w: 660, h: 580, minW: 420, minH: 320, inDock: true, desc: 'Edit real text files.', mount: mountTextEdit, serialize: serializeTextEdit });
registerApp({ id: 'about', name: 'About This Computer', icon: 'about', w: 380, h: 430, minW: 340, minH: 380, singleton: true, inDock: false, hidden: true, mount: mountAbout });

function busEmit(ev, data) { import('./core/bus.js').then(({ bus }) => bus.emit(ev, data)); }
function closeFocused() { import('./core/wm.js').then(({ wm }) => { if (wm.focused) wm.close(wm.focused); }); }
