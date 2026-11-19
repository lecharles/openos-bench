/* App registry — filled by apps.js. wm/menubar/dock read from here.
 * hooks: late-bound cross-module functions to avoid circular imports. */
export const APPS = {};
export function registerApp(def) { APPS[def.id] = def; }
export function getApp(id) { return APPS[id]; }
export const hooks = {}; // e.g. hooks.dockIconRect(appId)
