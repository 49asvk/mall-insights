// Hex opportunity score with explained sliders, exclusions, candidate zones.
import { block, notice, weightPanel, legendBar } from './ui.js';
import { HEX_COMPONENTS, HEX_PRESETS, scoreHexes, pickCandidates } from './scoring.js';
import { rampCss } from './map.js';
import { int, dec, esc, short } from './format.js';

export function mountOpportunity(el, ctx) {
  const { data, map } = ctx, H = data.hexes, O = data.opp, el_ = data.city.eligibility, cr = data.city.candidates_rule;
  const desc = data.city.mode === 'descriptive';
  const f = { minPop: el_.min_pop, minBuilt: el_.min_built, minValid: el_.min_valid, minDist: cr.min_dist_km, minSep: cr.min_sep_km, topN: cr.top_n, respectExclusions: true };
  const nEx = H.filter((h) => h.excluded).length;
  const exByReason = Object.entries(H.filter((h) => h.excluded).reduce((a, h) => ((a[h.exclude_reason] = (a[h.exclude_reason] || 0) + 1), a), {}));
  el.innerHTML = `
    <div class="intro">${desc ? 'Where in the study area would a mall find people, growth and few competitors?' : 'Where could the next mall go?'} Every hexagon that is already somewhat urban and populated gets a 0–100 <b>opportunity score</b>: each ingredient is turned into a percentile among those hexagons, then blended with the weights below.</div>
    ${notice('info', 'Purchasing power counts little by default', 'Business Analyst’s purchasing-power estimates can be implausible in special areas (e.g. military cantonments), so “Spending power” starts at a low weight. Military land and cantonments from OpenStreetMap, plus any areas you excluded, are left out entirely.', 'lightbulb')}
    <div class="inline"><calcite-switch id="op-excl" checked></calcite-switch> Leave out excluded areas (${nEx} hexagons${exByReason.length ? ': ' + exByReason.map(([k, v]) => `${esc(k)} ${v}`).join(', ') : ''})</div>
    <div class="chart-title">Top candidate zones <span class="muted" id="op-same"></span></div><div id="op-list"></div>
    ${block('What counts, and how much', 'Move a slider and the map and the list update instantly', '<div id="op-w"></div>')}
    ${block('Rules', '', `<div class="rules">
      <div class="wrow"><div class="wlabel"><span>Minimum people in the hexagon</span><span id="op-pop-v">${int(f.minPop)}</span></div><calcite-slider id="op-pop" min="0" max="6000" step="250" value="${f.minPop}"></calcite-slider></div>
      <div class="wrow"><div class="wlabel"><span>Minimum built-up share (latest)</span><span id="op-bu-v">${Math.round(f.minBuilt * 100)} %</span></div><calcite-slider id="op-bu" min="0" max="60" step="5" value="${f.minBuilt * 100}"></calcite-slider></div>
      <div class="wrow"><div class="wlabel"><span>Minimum distance from an existing mall</span><span id="op-d-v">${f.minDist} km</span></div><calcite-slider id="op-d" min="0" max="5" step="0.5" value="${f.minDist}"></calcite-slider></div>
      <div class="wrow"><div class="wlabel"><span>Minimum spacing between zones</span><span id="op-s-v">${f.minSep} km</span></div><calcite-slider id="op-s" min="1" max="8" step="0.5" value="${f.minSep}"></calcite-slider></div></div>`, false)}
    ${block('Layers', '', `<div class="toggles">${[['watch', 'Watchlist: fast-growing, not yet eligible (×)', false], ['excl', 'Excluded areas (hatched)', true], ['saAll', 'All 15-minute drive areas', false], ['transit', 'Transit stops (OSM)', false], ['brands', 'Brand outlets (BA POIs)', false]]
      .map(([k, l, on]) => `<div class="inline"><calcite-switch data-layer="${k}" ${on ? 'checked' : ''}></calcite-switch> ${esc(l)}</div>`).join('')}</div>`, false)}`;
  let W = { ...O.weights }, res, cands = [], def = null;
  const render = () => {
    res = scoreHexes(H, W, f); cands = pickCandidates(H, res, W, f);
    if (!def) def = new Set(cands.map((c) => c.hex.hex_id));
    map.setHexValues(Array.from(res.score), { ramp: 'viridis', domain: [20, 90] }); map.setCandidates(cands);
    const same = cands.filter((c) => def.has(c.hex.hex_id)).length;
    el.querySelector('#op-same').textContent = `(${same} of ${cands.length} also in the default top ${cands.length})`;
    el.querySelector('#op-list').innerHTML = cands.map((c, k) => `<div class="cand" data-k="${k}"><span class="cnum">${k + 1}</span><div><span class="score">${dec(c.score, 0)}</span>
      <b>${esc(c.hex.growth_type)}</b> · ${int(c.hex.pop)} people · ${dec(c.hex.dist_mall_km)} km from ${esc(short(c.hex.nearest_mall || ''))}
      <div class="why">strongest: ${esc(c.why.join(', '))} · built-up +${dec(c.hex.built_change_pp)} pp, forecast +${dec(c.hex.fc_gain_pp)} pp</div></div></div>`).join('') || '<div class="muted">No hexagon passes the rules.</div>';
    el.querySelectorAll('.cand').forEach((d) => d.addEventListener('click', () => ctx.focusCandidate(+d.dataset.k)));
    ctx.setLegend(legendBar(rampCss('viridis'), '≤ 20', '90+', 'Opportunity score (grey = not eligible) · stars = candidate zones'));
  };
  ctx.focusCandidate = (k) => { const c = cands[k]; if (!c) return; map.goTo(c.hex.cx, c.hex.cy, 14); map.highlightHex(c.i); };
  weightPanel(el.querySelector('#op-w'), { id: 'opw', items: HEX_COMPONENTS, defaults: O.weights, presets: HEX_PRESETS, onChange: (w) => { W = w; render(); }, intro: 'The score is a weighted blend of percentiles.' });
  const bind = (id, key, fmt, scale = 1) => el.querySelector('#' + id).addEventListener('calciteSliderInput', (e) => { f[key] = +e.target.value / scale; el.querySelector('#' + id + '-v').textContent = fmt(+e.target.value); render(); });
  bind('op-pop', 'minPop', int); bind('op-bu', 'minBuilt', (v) => v + ' %', 100); bind('op-d', 'minDist', (v) => v + ' km'); bind('op-s', 'minSep', (v) => v + ' km');
  el.querySelector('#op-excl').addEventListener('calciteSwitchChange', (e) => { f.respectExclusions = e.target.checked; render(); });
  el.querySelectorAll('[data-layer]').forEach((s) => s.addEventListener('calciteSwitchChange', (e) => map.setLayerVisible(s.dataset.layer, e.target.checked)));
  map.setWatchlist(O.watchlist || []);
  return {
    score: (i) => res?.score[i], comps: (i) => res && Object.fromEntries(HEX_COMPONENTS.map((c) => [c.name, res.comps[c.key][i]])),
    activate() {
      map.setLayerVisible('cand', true); map.setLayerVisible('excl', el.querySelector('[data-layer="excl"]').checked); map.setLayerVisible('watch', el.querySelector('[data-layer="watch"]').checked);
      map.setLayerVisible('edge', false); render();
    },
    deactivate() { map.setLayerVisible('cand', false); map.setLayerVisible('watch', false); map.highlightHex(null); },
  };
}
