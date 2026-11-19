/* Tiny event bus */
const map = new Map();
export const bus = {
  on(ev, fn) {
    if (!map.has(ev)) map.set(ev, new Set());
    map.get(ev).add(fn);
    return () => map.get(ev).delete(fn);
  },
  emit(ev, data) {
    const set = map.get(ev);
    if (set) for (const fn of [...set]) { try { fn(data); } catch (e) { console.error(e); } }
  },
};
