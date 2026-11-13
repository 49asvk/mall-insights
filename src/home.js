// First tab: mall ranking on top, the profile of the focus mall below.
import { mountRanking } from './ranking.js';
import { mountOverview } from './overview.js';
export function mountHome(el, ctx) {
  el.innerHTML = '<div id="home-rank"></div><div id="home-ov"></div>';
  const rk = mountRanking(el.querySelector('#home-rank'), ctx), ov = mountOverview(el.querySelector('#home-ov'), ctx);
  return {
    activate() {
      ov.activate?.(); rk.activate?.();
      ctx.setLayers([{ key: 'hex', label: 'Hexagons' }, { key: 'malls', label: 'Malls' }, { key: 'saAll', label: '15-minute drive areas', on: false }]);
    },
  };
}
