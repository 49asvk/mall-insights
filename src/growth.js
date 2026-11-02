// Where is the city building up, around which neighbours, and where next.
import { block, seg, onSeg, legendBar, legendCats } from './ui.js';
import { hbars, radar, stackRows, dataTable, legend } from './charts.js';
import { rampCss, RAMPS, GT_COLORS, HS_COLORS, HS_LABELS } from './map.js';
import { dec, pct, esc, int, compact } from './format.js';
import { on } from './state.js';
import { quantile } from './overview.js';

const FEATURE_NAMES = { built_share: 'own built-up share', built_change_prev: 'own growth in the previous years', mix: 'land-use mix', crops_share: 'share of crops', rangeland_share: 'share of rangeland',
  trees_share: 'share of trees', bare_share: 'share of bare ground', water_share: 'share of water', dist_mall_km: 'distance to the nearest mall', dist_centre_km: 'distance to the city centre',
  dist_road_km: 'distance to a major road', dist_rail_km: 'distance to rail/metro' };
const fname = (f) => FEATURE_NAMES[f] || f.replace(/ring(\d)_built_share/, 'ring-$1 neighbours’ built-up share').replace(/ring(\d)_built_change_prev/, 'ring-$1 neighbours’ previous growth');

export function mountGrowth(el, ctx) {
  const { data, map } = ctx, H = data.hexes, D = data.dyn, F = D.forecast, Y = data.city.years, K = D.rings;
  const ringsOf = ctx.ringsOf;
  let view = 'type', selHex = null;
  const q97 = (k) => Math.max(1, quantile(H.map((h) => h[k]), 0.97));
  const VIEWS = {
    change: { label: 'Growth', paint: () => { const hi = q97('built_change_pp'); map.setHexValues(H.map((h) => h.built_change_pp), { ramp: 'heat', domain: [0, hi] }); return legendBar(rampCss('heat'), '0 pp', `+${dec(hi, 0)} pp`, `Built-up growth ${data.city.early[0]}→${data.city.late.at(-1)}`); },
      text: 'How many percentage points of the hexagon turned into built-up area between the start years and the latest years.' },
    pull: { label: 'Pull', paint: () => { const hi = q97('growth_pull_pp'); map.setHexValues(H.map((h) => h.growth_pull_pp), { ramp: 'heat', domain: [0, hi] }); return legendBar(rampCss('heat'), '0 pp', `+${dec(hi, 0)} pp`, `Neighbourhood growth pull (rings 1–${K})`); },
      text: `How fast the surroundings are building up: the growth of the hexagons 1, 2, 3 … ${K} steps away (on average ≈ 0.9 / 1.7 / 2.5 / 3.3 km), the closest ring counting most. High pull on a hexagon that has not grown yet = it is next in line. Click a hexagon to see its rings.` },
    hot: { label: 'Hotspots', paint: () => { map.setHexCategories(H.map((h) => String(h.hotspot_bin)), HS_COLORS); return legendCats('Growth hotspots (Getis-Ord Gi*)', [3, 2, 1, 0, -1, -2, -3].map((b) => [HS_COLORS[b], HS_LABELS[b]])); },
      text: 'Clusters of hexagons growing unusually fast (hot) or slowly (cold) compared with the whole area — tested statistically over each hexagon plus rings 1–2, like ArcGIS Pro’s Hot Spot Analysis. A single fast hexagon is not a hot spot; a fast neighbourhood is.' },
    type: { label: 'Type', paint: () => { map.setHexCategories(H.map((h) => h.growth_type), GT_COLORS); return legendCats('Growth type', Object.entries(GT_COLORS).filter(([k]) => k !== 'No data').map(([k, c]) => [c, k])); },
      text: '<b>Infill</b>: new building fills gaps inside the existing city. <b>Edge</b>: the city grows outward from its edge. <b>Leapfrog</b>: detached new development — sprawl in the strict sense. <b>Growth frontier</b>: not built yet, but the surrounding rings are building up fast and there is open land left. <b>Stable</b>: little change.' },
    fc: { label: 'Forecast', paint: () => { const hi = q97('fc_gain_pp'); map.setHexValues(H.map((h) => h.fc_gain_pp), { ramp: 'magma', domain: [0, hi] }); return legendBar(rampCss('magma'), '0 pp', `+${dec(hi, 0)} pp`, `Forecast built-up growth ${F.base_year}→${F.target_year}`); },
      text: `Expected rise of the built-up share by ${F.target_year} if the last years’ patterns continue. Learned from how hexagons changed given their own state and their rings 1–${K}. It does not know about master plans, zoning or new metro lines.` },
  };
  const [PY0, PY1] = data.city.pop_years, hasPop = H.some((h) => Number.isFinite(h.pop_proj));
  const popNow = H.reduce((a, h) => a + (Number.isFinite(h.pop_base) ? h.pop_base : 0), 0), popFut = H.reduce((a, h) => a + (Number.isFinite(h.pop_proj) ? h.pop_proj : 0), 0);
  const PYS = data.city.proj_years || [], yearTot = PYS.map((y, k) => ({ y, v: H.reduce((a, h) => a + (Number.isFinite(h.pp[k]) ? h.pp[k] : 0), 0) }));
  const popGrowth = popNow ? popFut / popNow - 1 : 0, sgn = (v) => (v >= 0 ? '+' : '−');
  if (hasPop) {
    VIEWS.popg = { label: 'Pop. growth', paint: () => { const vals = H.map((h) => h.pop_growth_proj), hi = Math.max(0.01, quantile(vals.filter(Number.isFinite), 0.97)), lo = Math.min(0, quantile(vals.filter(Number.isFinite), 0.03));
        map.setHexValues(vals, { ramp: 'mix', domain: [lo, hi] }); return legendBar(rampCss('mix'), `${dec(lo * 100, 0)} %`, `+${dec(hi * 100, 0)} %`, `Projected population growth ${PY0}→${PY1}`); },
      text: `How much the number of residents in each hexagon is expected to change between ${PY0} and ${PY1}, as projected by Esri Business Analyst. Darker green = faster growth.` };
    VIEWS.pop = { label: 'Pop. ' + PY1, paint: () => { const vals = H.map((h) => h.pop_proj), hi = Math.max(1, quantile(vals.filter(Number.isFinite), 0.97));
        map.setHexValues(vals, { ramp: 'blues', domain: [0, hi] }); return legendBar(rampCss('blues'), '0', int(hi) + '+', `Projected residents per hexagon, ${PY1}`); },
      text: `Projected residents per hexagon in ${PY1} (Esri Business Analyst population projection).` };
  }
  const ev = F.evaluation, cv = ev.spatial_cv, bt = ev.temporal_backtest;
  const pctOr = (x) => (x == null ? '–' : pct(x));
  const trust = `
    <div class="note">Tested on <b>areas the model never saw</b> (whole ~6 km blocks held out):</div>
    ${dataTable(['Method', 'Typical error', 'Found top-10 % growth hexes'], [['This forecast', dec(cv.model?.mae_pp) + ' pp', pctOr(cv.model?.top10_hit)],
      ['"Repeat the last ' + F.horizon + ' years"', dec(cv.repeat_last_period?.mae_pp) + ' pp', pctOr(cv.repeat_last_period?.top10_hit)],
      ['"Copy the touching neighbours"', dec(cv.copy_neighbours?.mae_pp) + ' pp', pctOr(cv.copy_neighbours?.top10_hit)], ['"No change"', dec(cv.no_change?.mae_pp) + ' pp', '–']], true)}
    ${bt && !bt.skipped && bt.model ? `<div class="note">Time test (trained before ${bt.test_origin}, tested on ${bt.test_origin}→${bt.test_origin + F.horizon}): error ${dec(bt.model?.mae_pp)} pp vs ${dec(bt.repeat_last_period?.mae_pp)} pp for "repeat the last years"; top-10 % found ${pctOr(bt.model?.top10_hit)}.</div>` : ''}
    <div class="chart-title">What the forecast leans on most</div>
    ${hbars(F.importance.slice(0, 6).map((r) => ({ key: r.feature, label: fname(r.feature), value: r.mae_increase_pp, text: '+' + dec(r.mae_increase_pp, 2), tip: 'Increase in error (pp) when this input is scrambled' })), { max: F.importance[0]?.mae_increase_pp || 1 })}`;
  const gtCounts = Object.entries(GT_COLORS).filter(([k]) => k !== 'No data').map(([k, c]) => ({ name: k, color: c, value: H.filter((h) => h.growth_type === k).length }));
  const edge = D.edge.table, y0 = Y[0], y1 = Y.at(-1), S8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const ev8 = (y) => S8.map((s) => edge.find((r) => r.year === y && r.sector === s)?.edge_km), cap8 = (y) => S8.map((s) => edge.find((r) => r.year === y && r.sector === s)?.beyond_study_area);
  const radarHTML = radar({ labels: S8, series: [{ name: String(y0), color: '#8a8a85', values: ev8(y0), dash: true, fill: 0.05, capped: cap8(y0) }, { name: String(y1), color: '#eb6834', values: ev8(y1), capped: cap8(y1) }] });
  const growthRows = S8.map((s, k) => [s, dec(ev8(y0)[k]), dec(ev8(y1)[k]) + (cap8(y1)[k] ? '+' : ''), (ev8(y1)[k] - ev8(y0)[k] >= 0 ? '+' : '') + dec(ev8(y1)[k] - ev8(y0)[k])]);
  const BANDS = [['Decline', (g) => g < 0, RAMPS.diverging[1]], ['0–5 %', (g) => g >= 0 && g < 0.05, RAMPS.mix[2]], ['5–10 %', (g) => g >= 0.05 && g < 0.10, RAMPS.mix[4]], ['10–20 %', (g) => g >= 0.10 && g < 0.20, RAMPS.mix[6]], ['20 %+', (g) => g >= 0.20, RAMPS.mix[7]]]
    .map(([name, test, color]) => ({ name, color, value: H.filter((h) => Number.isFinite(h.pop_growth_proj) && test(h.pop_growth_proj)).length }));
  const popBlock = !hasPop ? '' : block(`Population projection ${PY0} → ${PY1}`, `${compact(popNow)} → ${compact(popFut)} residents (${sgn(popGrowth)}${dec(Math.abs(popGrowth) * 100)} %)`, `
      ${hbars(yearTot.map((r) => ({ key: 'y' + r.y, label: String(r.y), value: r.v, text: int(r.v), cls: r.y === PY1 ? 'subj' : '', tip: `${r.y}: ${int(r.v)} residents (${r.v >= popNow ? '+' : '−'}${dec(Math.abs(popNow ? r.v / popNow - 1 : 0) * 100)} % vs ${PY0})` })), { max: Math.max(...yearTot.map((r) => r.v), 1) * 1.02 })}
      <div class="note">Whole study area: <b>${sgn(popFut - popNow)}${int(Math.abs(popFut - popNow))}</b> residents (${sgn(popGrowth)}${dec(Math.abs(popGrowth) * 100)} %). Hexagons by projected growth:</div>
      ${stackRows([{ label: 'Hexagons', parts: BANDS, total: int(BANDS.reduce((a, b) => a + b.value, 0)) }], { fmt: int })}${legend(BANDS)}`);
  el.innerHTML = `
    <div class="intro">Read straight from satellite land cover, hexagon by hexagon, and from each hexagon’s <b>neighbours</b> (rings 1–${K}).</div>
    ${seg('gr-view', Object.entries(VIEWS).map(([k, v]) => [k, v.label]), view)}
    <div id="gr-text" class="explain"></div>
    <div id="gr-hex"></div>
    ${block('Across the study area', '', stackRows([{ label: 'Hexagons', parts: gtCounts, total: int(H.length) }], { fmt: int }) + `<div class="note">Hotspots: ${Object.entries(D.hotspots).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}</div>`)}
    ${popBlock}
    ${block(`Built-up reach by direction from ${D.focus.label}`, `Distance at which the built-up share drops below 50 %, ${y0} vs ${y1}`, radarHTML +
      `<div class="note">Longer arms = continuous city stretches further that way. The arms that grew most show where the city is pushing outward. “+” = still built-up at the edge of the study area. Shown on the map as rays.</div>` +
      dataTable(['Direction', `${y0} km`, `${y1} km`, 'change km'], growthRows))}`;
  const hexCard = () => {
    const box = el.querySelector('#gr-hex');
    if (selHex == null) { box.innerHTML = '<div class="note">Click a hexagon on the map to see how it and its rings changed.</div>'; map.showRings(null); return; }
    const h = H[selHex], rg = ringsOf(selHex);
    map.showRings(selHex, rg);
    const rows = [{ key: 'own', label: 'This hexagon', value: h.built_change_pp, text: '+' + dec(h.built_change_pp) + ' pp' }];
    for (let k = 1; k <= K; k++) rows.push({ key: 'r' + k, label: `Ring ${k} · ≈${[0.9, 1.7, 2.5, 3.3, 4.1, 4.9][k - 1]} km`, tip: `${rg[k - 1]?.length || 0} hexagons exactly ${k} step(s) away`, value: h['ring' + k], text: '+' + dec(h['ring' + k]) + ' pp' });
    const mx = Math.max(1, ...rows.map((r) => r.value).filter(Number.isFinite));
    box.innerHTML = block('Selected hexagon', `${h.growth_type} · ${HS_LABELS[h.hotspot_bin] || ''}`, `
      ${hbars(rows, { max: mx })}
      <div class="note">Built-up ${pct(h.bu_early)} → ${pct(h.bu_late)} · open land left ${pct(h.open_land)} · neighbourhood pull ${dec(h.growth_pull_pp)} pp<br>
      Forecast to ${F.target_year}: <b>+${dec(h.fc_gain_pp)} pp</b> (likely range ${dec(h.fc_low_pp)}–${dec(h.fc_high_pp)} pp)${Number.isFinite(h.pop_proj) ? `<br>Projected residents: <b>${int(h.pop_base)}</b> (${PY0}) → <b>${int(h.pop_proj)}</b> (${PY1}) (${sgn(h.pop_growth_proj)}${dec(Math.abs(h.pop_growth_proj) * 100)} %)` : ''}</div>`);
  };
  const paint = () => { map.setLayerVisible('edge', !view.startsWith('pop')); ctx.setLegend(VIEWS[view].paint()); el.querySelector('#gr-text').innerHTML = VIEWS[view].text; };
  onSeg(el, 'gr-view', (v) => { view = v; paint(); });
  on('hex', (i) => { selHex = i; if (ctx.active === 'growth') hexCard(); });
  return {
    activate() {
      ['cand', 'watch', 'excl'].forEach((k) => map.setLayerVisible(k, false)); map.selectMall(null);
      map.setEdges([...edge.filter((r) => r.year === y0).map((r) => ({ ...r, color: '#8a8a85', width: 2 })), ...edge.filter((r) => r.year === y1).map((r) => ({ ...r, color: '#eb6834', width: 3.5 }))], D.focus);
      map.setLayerVisible('edge', true); paint(); hexCard();
    },
    deactivate() { map.setLayerVisible('edge', false); map.showRings(null); },
  };
}
