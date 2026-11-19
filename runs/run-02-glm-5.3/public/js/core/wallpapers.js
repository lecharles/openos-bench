/* Wallpaper definitions — pure CSS backgrounds (no external assets). */

export const WALLPAPERS = {
  horizon: {
    name: 'Horizon',
    css: 'linear-gradient(180deg, #3f97f0 0%, #7cc0f7 42%, #fde0a7 78%, #ffb26b 100%)',
  },
  sequoia: {
    name: 'Sequoia',
    css: 'radial-gradient(90% 70% at 18% 12%, #7b4bff 0%, transparent 55%),' +
         'radial-gradient(80% 60% at 85% 20%, #ff5ea8 0%, transparent 50%),' +
         'radial-gradient(120% 90% at 60% 100%, #14276b 0%, #060a1f 70%),' +
         'linear-gradient(160deg, #2d1b69 0%, #0a0f2e 100%)',
  },
  monterey: {
    name: 'Monterey',
    css: 'conic-gradient(from 210deg at 68% 32%, #3555d1 0deg, #7d6bf5 70deg, #3bb8c9 150deg, #10316b 260deg, #1d2f8f 360deg),' +
         'linear-gradient(180deg, #16207a 0%, #0b1145 100%)',
  },
  aurora: {
    name: 'Aurora',
    css: 'radial-gradient(65% 45% at 26% 26%, rgba(72,229,181,.5) 0%, transparent 55%),' +
         'radial-gradient(58% 40% at 70% 12%, rgba(56,132,255,.45) 0%, transparent 52%),' +
         'radial-gradient(85% 55% at 55% 95%, rgba(19,70,120,.65) 0%, transparent 70%),' +
         'linear-gradient(180deg, #04121e 0%, #02070f 100%)',
  },
  sunsetdune: {
    name: 'Dune',
    css: 'linear-gradient(180deg, #2a1250 0%, #83377b 34%, #e4636f 58%, #ffa45c 76%, #ffd9a0 100%)',
  },
  solar: {
    name: 'Solar',
    css: 'radial-gradient(110% 85% at 50% -18%, #ffe7702e 0%, transparent 60%),' +
         'linear-gradient(180deg, #f7a521 0%, #f76b1c 55%, #c8371d 100%)',
  },
  graphite: {
    name: 'Graphite',
    css: 'radial-gradient(85% 60% at 50% 0%, #4a4e57 0%, transparent 60%),' +
         'linear-gradient(180deg, #23262c 0%, #121316 100%)',
  },
  ministry: {
    name: 'Tide',
    css: 'radial-gradient(100% 75% at 78% 88%, #0e7490 0%, transparent 55%),' +
         'radial-gradient(70% 55% at 12% 8%, #1d4ed8 0%, transparent 60%),' +
         'linear-gradient(165deg, #075985 0%, #0c1421 100%)',
  },
};

export function applyWallpaper(id) {
  const wp = WALLPAPERS[id] || WALLPAPERS.horizon;
  const el = document.getElementById('wallpaper');
  if (el) el.style.background = wp.css;
}
