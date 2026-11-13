// Where is the city building up, around which neighbours, and where next.
import { block, seg, onSeg, legendBar } from './ui.js';
import { hbars, radar, legend, dataTable, lineChart } from './charts.js';
import { rampCss, HS_COLORS, HS_LABELS } from './map.js';
import { dec, pct, esc, int, compact } from './format.js';
import { on } from './state.js';
import { quantile } from './overview.js';

const HIST = '#9a9a94', PROJ0 = [246, 180, 138], PROJ1 = [210, 74, 27];
const projColor = (t) => `rgb(${PROJ0.map((c, i) => Math.round(c + (PROJ1[i] - c) * t)).join(',')})`;

export function mountGrowth(el, ctx) {
  const { data, map } = ctx, H = data.hexes, D = data.dyn, F = D.forecast, Y = data.city.years, K = D.rings;
  const ringsOf = ctx.ringsOf;
  let view = 'change', selHex = null;
  const q97 = (k) => Math.max(1, quantile(H.map((h) => h[k]), 0.97));
  const VIEWS = {
    change: { label: 'Growth', paint: () => { const hi = q97('built_change_pp'); map.setHexValues(H.map((h) => h.built_change_pp), { ramp: 'heat', domain: [0, hi] }); return legendBar(rampCss('heat'), '0 pp', `+${dec(hi, 0)} pp`, `Built-up growth ${data.city.early[0]}→${data.city.late.at(-1)}`); },
      text: 'How many percentage points of the hexagon turned into built-up area between the start years and the latest years.' },
    hot: { label: 'Hotspots', paint: () => { map.setHexCategories(H.map((h) => String(h.hotspot_bin)), HS_COLORS); return legendCatsHS(); },
      text: 'Clusters of hexagons growing unusually fast (hot) or slowly (cold) compared with the whole area — tested statistically over each hexagon plus rings 1–2, like ArcGIS Pro’s Hot Spot Analysis. A single fast hexagon is not a hot spot; a fast neighbourhood is.' },
    fc: { label: 'Forecast', paint: () => { const hi = q97('fc_gain_pp'); map.setHexValues(H.map((h) => h.fc_gain_pp), { ramp: 'magma', domain: [0, hi] }); return legendBar(rampCss('magma'), '0 pp', `+${dec(hi, 0)} pp`, `Forecast built-up growth ${F.base_year}→${F.target_year}`); },
      text: `Expected rise of the built-up share by ${F.target_year} if the last years’ patterns continue. Learned from how hexagons changed given their own state and their rings 1–${K}. It does not know about master plans, zoning or new metro lines.` },
  };
  const legendCatsHS = () => `<div class="lg-title">Growth hotspots (Getis-Ord Gi*)</div><div class="legend">${[3, 2, 1, 0, -1, -2, -3].map((b) => `<span class="lg"><i style="background:${HS_COLORS[b]}"></i>${esc(HS_LABELS[b])}</span>`).join('')}</div>`;

  // ---- population (Esri Business Analyst yearly series)
  const [PY0, PY1] = data.city.pop_years, PYS = data.city.proj_years || [], hasPop = H.some((h) => Number.isFinite(h.pop_proj));
  const yrs = PYS.map((y, k) => ({ y, k })).filter((r) => r.y <= PY1);
  const lastHist = Math.max(...yrs.filter((r) => r.y < PY0).map((r) => r.y), -Infinity);
  const nProj = yrs.filter((r) => r.y >= PY0).length;
  const yColor = (y) => (y < PY0 ? HIST : projColor(nProj > 1 ? (y - PY0) / (PY1 - PY0) : 1));
  const popRows = (vals) => yrs.map((r) => ({ key: 'y' + r.y, label: String(r.y), value: vals[r.k], text: int(vals[r.k]), color: yColor(r.y), tip: `${r.y}${r.y < PY0 ? '' : ' (projection)'}: ${int(vals[r.k])} residents` })).filter((r) => Number.isFinite(r.value));
  const sumAt = (k) => H.reduce((a, h) => a + (Number.isFinite(h.pp[k]) ? h.pp[k] : 0), 0);
  const popLegend = legend([{ name: `${yrs[0]?.y ?? ''}–${Number.isFinite(lastHist) ? lastHist : ''}: earlier estimates`, color: HIST }, { name: `${PY0}–${PY1}: projection`, color: projColor(0.6) }]);
  if (hasPop) {
    VIEWS.pop = { label: 'Pop. ' + PY1, paint: () => { const vals = H.map((h) => h.pop_proj), hi = Math.max(1, quantile(vals.filter(Number.isFinite), 0.97));
        map.setHexValues(vals, { ramp: 'heat', domain: [0, hi] }); return legendBar(rampCss('heat'), '0', int(hi) + '+', `Projected residents per hexagon, ${PY1}`); },
      text: `Projected residents per hexagon in ${PY1} (Esri Business Analyst population projection).` };
  }
  const tot = yrs.map((r) => sumAt(r.k)), iNow = yrs.findIndex((r) => r.y === PY0), iEnd = yrs.length - 1;
  const popBlock = !hasPop ? '' : block(`Population ${yrs[0].y} – ${PY1}`, `${compact(tot[iNow])} (${PY0}) → ${compact(tot[iEnd])} (${PY1}) residents`,
    hbars(popRows(tot), { max: Math.max(...tot, 1) * 1.02 }) + popLegend);

  const edge = D.edge.table, y0 = Y[0], y1 = Y.at(-1), S8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const ev8 = (y) => S8.map((s) => edge.find((r) => r.year === y && r.sector === s)?.edge_km), cap8 = (y) => S8.map((s) => edge.find((r) => r.year === y && r.sector === s)?.beyond_study_area);
  const radarHTML = radar({ labels: S8, series: [{ name: String(y0), color: '#8a8a85', values: ev8(y0), dash: true, fill: 0.05, capped: cap8(y0) }, { name: String(y1), color: '#eb6834', values: ev8(y1), capped: cap8(y1) }] });
  const growthRows = S8.map((s, k) => [s, dec(ev8(y0)[k]), dec(ev8(y1)[k]) + (cap8(y1)[k] ? '+' : ''), (ev8(y1)[k] - ev8(y0)[k] >= 0 ? '+' : '') + dec(ev8(y1)[k] - ev8(y0)[k])]);
  el.innerHTML = `
    <div class="intro">Read straight from satellite land cover, hexagon by hexagon, and from each hexagon’s <b>neighbours</b> (rings 1–${K}).</div>
    ${seg('gr-view', Object.entries(VIEWS).map(([k, v]) => [k, v.label]), view)}
    <div id="gr-text" class="explain"></div>
    <div id="gr-hex"></div>
    <div id="gr-built">
      <div id="gr-chart"></div>
      ${block(`Built-up reach by direction from ${D.focus.label}`, `Distance at which the built-up share drops below 50 %, ${y0} vs ${y1}`, radarHTML +
        `<div class="note">Longer arms = continuous city stretches further that way. The arms that grew most show where the city is pushing outward. “+” = still built-up at the edge of the study area. Shown on the map as rays.</div>` +
        dataTable(['Direction', `${y0} km`, `${y1} km`, 'change km'], growthRows))}
    </div>
    <div id="gr-pop" hidden>${popBlock}</div>`;
  const isPop = () => view === 'pop';
  // ---- built-up graph that goes with each built-up view
  const meanBu = (j) => { const a = H.map((h) => h.bu[j]).filter(Number.isFinite); return a.reduce((s, x) => s + x, 0) / (a.length || 1); };
  const buSeries = Y.map((_, j) => meanBu(j));
  const builtChart = () => {
    if (view === 'hot') {
      const cnt = [3, 2, 1, 0, -1, -2, -3].map((b) => ({ b, n: H.filter((h) => h.hotspot_bin === b).length }));
      return block('Hexagons by growth hotspot class', `${int(H.length)} hexagons`, hbars(cnt.map((r) => ({ key: 'h' + r.b, label: HS_LABELS[r.b], value: r.n, text: int(r.n), color: HS_COLORS[r.b] })), { max: Math.max(...cnt.map((r) => r.n), 1) * 1.02 }));
    }
    if (view === 'fc') {
      const T = F.target_year, xs = []; for (let y = Y[0]; y <= Math.max(T, Y.at(-1)); y++) xs.push(y);
      const fcEnd = buSeries.at(-1) + H.reduce((a, h) => a + (Number.isFinite(h.fc_gain_pp) ? h.fc_gain_pp : 0), 0) / H.length / 100;
      const actual = xs.map((y) => (Y.includes(y) ? buSeries[Y.indexOf(y)] : null)), fc = xs.map((y) => (y === Y.at(-1) ? buSeries.at(-1) : y === T ? fcEnd : null));
      return block(`Built-up share, study area: ${Y[0]} → ${T}`, `Average of all hexagons · forecast ${pct(fcEnd)} in ${T}`, lineChart({ xs: xs.map(String), fmt: (x) => pct(x), yMin: null, cap: 1,
        series: [{ name: 'Satellite land cover', short: 'actual', color: '#2a78d6', values: actual }, { name: 'Forecast', short: 'forecast', color: '#eb6834', dash: true, values: fc }] }));
    }
    return block(`Built-up share over time, study area`, `Average of all hexagons · ${pct(buSeries[0])} in ${Y[0]} → ${pct(buSeries.at(-1))} in ${Y.at(-1)}`,
      lineChart({ xs: Y.map(String), fmt: (x) => pct(x), yMin: null, cap: 1, series: [{ name: 'Study area', short: 'built-up', color: '#2a78d6', values: buSeries }] }));
  };
  const hexCard = () => {
    const box = el.querySelector('#gr-hex');
    if (selHex == null) { box.innerHTML = isPop() ? '' : '<div class="note">Click a hexagon on the map to see how it and its rings changed.</div>'; map.showRings(null); return; }
    const h = H[selHex];
    if (isPop()) { map.showRings(null); box.innerHTML = ''; return; }
    const rg = ringsOf(selHex);
    map.showRings(selHex, rg);
    const rows = [{ key: 'own', label: 'This hexagon', value: h.built_change_pp, text: '+' + dec(h.built_change_pp) + ' pp' }];
    for (let k = 1; k <= K; k++) rows.push({ key: 'r' + k, label: `Ring ${k} · ≈${[0.9, 1.7, 2.5, 3.3, 4.1, 4.9][k - 1]} km`, tip: `${rg[k - 1]?.length || 0} hexagons exactly ${k} step(s) away`, value: h['ring' + k], text: '+' + dec(h['ring' + k]) + ' pp' });
    const mx = Math.max(1, ...rows.map((r) => r.value).filter(Number.isFinite));
    box.innerHTML = block('Selected hexagon', HS_LABELS[h.hotspot_bin] || '', `
      ${hbars(rows, { max: mx })}
      <div class="note">Built-up ${pct(h.bu_early)} → ${pct(h.bu_late)} · open land left ${pct(h.open_land)} · neighbourhood pull ${dec(h.growth_pull_pp)} pp<br>
      Forecast to ${F.target_year}: <b>+${dec(h.fc_gain_pp)} pp</b> (likely range ${dec(h.fc_low_pp)}–${dec(h.fc_high_pp)} pp)</div>`);
  };
  const paint = () => {
    el.querySelector('#gr-built').hidden = isPop(); el.querySelector('#gr-pop').hidden = !isPop(); if (!isPop()) el.querySelector('#gr-chart').innerHTML = builtChart();
    ctx.setLayers([{ key: 'hex', label: 'Hexagons' }, { key: 'malls', label: 'Malls' }, ...(isPop() ? [] : [{ key: 'edge', label: 'Built-up reach rays' }])]);
    ctx.setLegend(VIEWS[view].paint()); el.querySelector('#gr-text').innerHTML = VIEWS[view].text; hexCard();
  };
  onSeg(el, 'gr-view', (v) => { view = v; paint(); });
  on('hex', (i) => { selHex = i; if (ctx.active === 'growth') hexCard(); });
  return {
    activate() {
      map.selectMall(null);
      map.setEdges([...edge.filter((r) => r.year === y0).map((r) => ({ ...r, color: '#8a8a85', width: 2 })), ...edge.filter((r) => r.year === y1).map((r) => ({ ...r, color: '#eb6834', width: 3.5 }))], D.focus);
      paint();
    },
    deactivate() { map.showRings(null); },
  };
}
