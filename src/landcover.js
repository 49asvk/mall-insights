// Land cover per hexagon, year by year (time slider + play).
import { block, seg, onSeg, legendBar } from './ui.js';
import { lineChart, legend } from './charts.js';
import { rampCss } from './map.js';
import { dec, pct, esc, short } from './format.js';
import { on } from './state.js';

const RC = ['#1baf7a', '#2a78d6', '#eda100', '#e87ba4', '#6250d6'];
export function mountLandcover(el, ctx) {
  const { data, map } = ctx, Y = data.city.years, H = data.hexes;
  let varName = 'bu', yi = Y.length - 1, timer = null, focusId = data.city.subject || data.malls.malls[0]?.id;
  el.innerHTML = `
    <div class="intro">Esri Sentinel-2 10 m land cover, counted <b>per hexagon and per year</b>. Drag the year or press play to watch the city fill in.</div>
    ${seg('lc-var', [['bu', 'Built-up share'], ['mix', 'Land-use mix']], 'bu')}
    <div class="year-row"><calcite-button id="lc-play" scale="s" icon-start="play" appearance="outline">Play</calcite-button>
      <calcite-slider id="lc-year" min="${Y[0]}" max="${Y.at(-1)}" step="1" value="${Y.at(-1)}" ticks="1" label-ticks label="Year"></calcite-slider></div>
    <div id="lc-explain" class="note"></div>
    ${block('Whole study area vs the mall’s areas', '', '<div id="lc-chart"></div>')}
    ${block('By distance ring around the mall', 'Pixels of all hexagons whose centre lies within the ring', '<div id="lc-rings"></div>')}`;
  const explain = { bu: 'Share of the hexagon classified as built area in that year.', mix: 'Land-use mix (0 = one cover type, 1 = all eight types equally).' };
  const paint = () => {
    const vals = H.map((h) => (varName === 'bu' ? h.bu : h.mix)[yi]);
    map.setHexValues(vals, { ramp: varName === 'bu' ? 'greys' : 'mix', domain: [0, 1] });
    ctx.setLegend(legendBar(rampCss(varName === 'bu' ? 'greys' : 'mix'), varName === 'bu' ? '0 %' : '0', varName === 'bu' ? '100 %' : '1', `${varName === 'bu' ? 'Built-up share' : 'Land-use mix'} ${Y[yi]}`));
    el.querySelector('#lc-explain').textContent = explain[varName];
    charts();
  };
  const charts = () => {
    const mean = (j, key) => { const a = H.map((h) => h[key][j]).filter(Number.isFinite); return a.reduce((s, x) => s + x, 0) / (a.length || 1); };
    const key = varName === 'bu' ? 'built' : 'mix', hk = varName;
    const lb = data.malls.lulc_by_year.filter((r) => r.mall_id === focusId), fm = data.malls.malls.find((m) => m.id === focusId);
    const mins = [...new Set(lb.map((r) => r.minutes))].sort((a, b) => a - b);
    const series = [{ name: 'Study area (mean of hexagons)', short: 'study area', color: '#8a8a85', dash: true, values: Y.map((_, j) => mean(j, hk)) },
      ...mins.map((m, k) => ({ name: `${short(fm?.name || '')} ${m}-min area`, short: `${m} min`, color: RC[k % RC.length], values: Y.map((y) => lb.find((r) => r.minutes === m && r.year === y)?.[key]) }))];
    el.querySelector('#lc-chart').innerHTML = `<div class="note">${esc(fm ? fm.name : '')}${data.city.mode === 'predictive' ? ' — pick another mall on the map or in the Ranking tab' : ''}</div>` +
      lineChart({ xs: Y.map(String), series, fmt: (x) => (varName === 'bu' ? pct(x) : dec(x, 2)), yMin: null, mark: yi, cap: 1 });
    const R = data.land.malls[focusId];
    if (R) el.querySelector('#lc-rings').innerHTML = lineChart({ xs: Y.map(String), mark: yi, yMin: null, cap: 1, fmt: (x) => (varName === 'bu' ? pct(x) : dec(x, 2)),
      series: R.cumulative.map((r, k) => ({ name: `within ${r.ring_km} km${r.coverage < 0.9 ? ` (only ${pct(r.coverage)} of the ring inside the study area)` : ''}`, short: `${r.ring_km} km`, color: RC[k % RC.length], values: r.series.map((s) => s[key]) })) }) +
      legend(R.cumulative.map((r, k) => ({ name: `≤ ${r.ring_km} km${r.coverage < 0.9 ? ' (partly outside study area)' : ''}`, color: RC[k % RC.length] })));
  };
  onSeg(el, 'lc-var', (v) => { varName = v; paint(); });
  el.querySelector('#lc-year').addEventListener('calciteSliderInput', (e) => { yi = Y.indexOf(+e.target.value); paint(); });
  const play = el.querySelector('#lc-play');
  play.addEventListener('click', () => {
    if (timer) { clearInterval(timer); timer = null; play.iconStart = 'play'; play.textContent = 'Play'; return; }
    play.iconStart = 'pause'; play.textContent = 'Pause'; if (yi === Y.length - 1) yi = -1;
    timer = setInterval(() => { yi++; if (yi >= Y.length) { clearInterval(timer); timer = null; play.iconStart = 'play'; play.textContent = 'Play'; yi = Y.length - 1; } el.querySelector('#lc-year').value = Y[yi]; paint(); }, 900);
  });
  on('select', (id) => { if (data.land.malls[id]) { focusId = id; if (ctx.active === 'landcover') charts(); } });
  return { activate() { ['cand', 'watch', 'excl', 'edge'].forEach((k) => map.setLayerVisible(k, false)); const m = data.malls.malls.find((x) => x.id === focusId); if (m) map.selectMall(m); paint(); } };
}
