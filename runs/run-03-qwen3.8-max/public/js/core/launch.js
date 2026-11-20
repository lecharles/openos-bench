import { APPS } from '../apps/registry.js';
import * as WM from './wm.js';

/** Launch (or focus) an app. opts: {params, x,y,w,h, minimized, maximized, forceNew, noAnim, restore, bounce} */
export function launch(appId, opts = {}) {
  const app = APPS[appId];
  if (!app) { console.warn('unknown app', appId); return null; }
  if (app.singleton !== false && !opts.forceNew) {
    const existing = WM.windowsForApp(appId);
    if (existing.length) {
      const w = existing.sort((a, b) => b.z - a.z)[0];
      if (opts.params && app.onRelaunch) {
        try { app.onRelaunch(w.api, opts); } catch (e) { console.warn(e); }
      }
      if (w.minimized) WM.restoreWindow(w); else WM.focusWindow(w);
      return w;
    }
  }
  return WM.createWindow(app, opts);
}

export function isRunning(appId) { return WM.windowsForApp(appId).length > 0; }
export const getApp = (id) => APPS[id];
export const allApps = () => APPS;
