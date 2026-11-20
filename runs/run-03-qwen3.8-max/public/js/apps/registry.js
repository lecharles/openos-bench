import finder from './finder.js';
import notes from './notes.js';
import calendar from './calendar.js';
import weather from './weather.js';
import calculator from './calculator.js';
import preview from './preview.js';
import trash from './trash.js';
import settings from './settings.js';
import clock from './clock.js';
import contacts from './contacts.js';
import music from './music.js';
import mail, { COMPOSE_APP } from './mail.js';
import terminal from './terminal.js';
import photos from './photos.js';
import textedit from './textedit.js';
import { GETINFO_APP, ABOUT_APP } from '../core/getinfo.js';

export const APPS = {
  finder,
  notes,
  calendar,
  weather,
  calculator,
  preview,
  trash,
  settings,
  clock,
  contacts,
  music,
  mail,
  terminal,
  photos,
  textedit,
  // hidden (not in Dock / Spotlight)
  compose: COMPOSE_APP,
  getinfo: GETINFO_APP,
  about: ABOUT_APP,
};

export const DOCK_APPS = ['finder', 'notes', 'calendar', 'weather', 'photos', 'music', 'mail', 'calculator', 'terminal', 'textedit', 'preview', 'settings'];
