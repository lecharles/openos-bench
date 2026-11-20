export const bus = {
  emit(name, detail) { window.dispatchEvent(new CustomEvent('os:' + name, { detail })); },
  on(name, fn) {
    const h = (e) => fn(e.detail);
    window.addEventListener('os:' + name, h);
    return () => window.removeEventListener('os:' + name, h);
  },
};
