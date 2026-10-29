// Descriptive mode: profile of the subject mall's area. No score, no rank.
import { block, notice, legendBar } from './ui.js';
import { hbars, lineChart, stackRows, dataTable } from './charts.js';
import { rampCss, GT_COLORS } from './map.js';
import { int, dec, pct, inr, esc, short } from './format.js';

export function mountOverview(el, ctx) {
  const { data, map } = ctx, P = data.malls.profile, subj = data.malls.malls.find((m) => m.id === data.city.subject);
  if (!P || !subj) { el.innerHTML = notice('warning', 'No subject profile', 'Set <code>subject:</code> in city.yaml and re-run notebooks 07–08.'); return { activate() {} }; }
  const v = P.values, c = P.context_median, Y = data.city.years;
  const fact = (label, val, ctxv, tip) => `<div data-tip="${esc(tip)}"><dt>${esc(label)}</dt><dd>${val}</dd><div class="ctx">other malls (median): ${ctxv}</div></div>`;
  const facts = `<dl class="facts">
    ${fact('People within 15 min', int(v.pop), int(c.pop), 'Residents of the hexagons inside the 15-minute drive area (Business Analyst)')}
    ${fact('Purchasing power / person', inr(v.spend_pc), inr(c.spend_pc), 'Business Analyst estimate - treat with caution')}
    ${fact('Shared catchment', pct(v.overlap_share), pct(c.overlap_share), 'Share of those people another listed mall also reaches within 15 minutes')}
    ${fact('Nearest other mall', dec(v.nearest_other_km) + ' km', dec(c.nearest_other_km) + ' km', 'Straight-line distance')}
    ${fact('Built-up now', pct(v.built_late), pct(c.built_late), 'Average built-up share of the 15-minute area, latest two years')}
    ${fact(`Built-up growth ${data.city.early[0]}→${data.city.late.at(-1)}`, '+' + dec(v.built_change_pp) + ' pp', '+' + dec(c.built_change_pp) + ' pp', 'Rise of the built-up share, percentage points')}
    ${fact(`Forecast growth to ${data.city.forecast_years[1]}`, '+' + dec(v.fc_gain_pp) + ' pp', '+' + dec(c.fc_gain_pp) + ' pp', 'Land-cover model, no population projections')}
    ${fact('Growth hotspots', pct(v.hot_share), pct(c.hot_share), 'Share of hexagons in the area that are statistically significant growth hot spots (95 %+)')}
    ${fact('Brand outlets / 100k people', dec(v.brand_per_100k), dec(c.brand_per_100k), 'Business Analyst POIs of the tenant brands')}
    ${fact('Neighbourhood growth pull', dec(v.growth_pull_pp) + ' pp', dec(c.growth_pull_pp) + ' pp', 'How fast the rings around each hexagon build up, averaged')}
  </dl>`;
  const gtRow = { label: short(subj.name), parts: Object.entries(P.growth_types).map(([k, val]) => {
    const name = { infill: 'Infill growth', edge: 'Edge growth', leapfrog: 'Leapfrog growth', growth: 'Growth frontier', 'built-up': 'Built-up, stable', open: 'Open land, stable' }[k];
    return { name, value: val, color: GT_COLORS[name] }; }).filter((p) => p.name), total: '' };
  const lb = data.malls.lulc_by_year.filter((r) => r.mall_id === subj.id);
  const mins = [...new Set(lb.map((r) => r.minutes))].sort((a, b) => a - b), MC = ['#1baf7a', '#2a78d6', '#eda100', '#e87ba4'];
  const series = (key) => mins.map((m, k) => ({ name: `${m}-min area`, short: `${m} min`, color: MC[k % 4], values: Y.map((y) => lb.find((r) => r.minutes === m && r.year === y)?.[key]) }));
  let catchHTML = '';
  if (data.catchment) {
    const rows = data.catchment.filter((r) => r.mall_id === subj.id);
    if (rows.length) catchHTML = block('People by drive time', 'Business Analyst population inside the 10 / 20 / 30-minute drive areas', dataTable(['Drive time', ...[...new Set(rows.map((r) => r.scenario))]],
      [...new Set(rows.map((r) => r.minutes))].sort((a, b) => a - b).map((m) => [`${m} min`, ...[...new Set(rows.map((r) => r.scenario))].map((s) => int(rows.find((r) => r.minutes === m && r.scenario === s)?.pop))]), true));
  }
  const T = P.tenant;
  const tenHTML = T ? block('Tenant mix (fixed 0–100 scale)', 'From the mall’s own tenant list; not compared with other malls', `
    <div class="hero-num"><span class="big">${dec(T.index_A, 0)}</span><span class="of">/ 100</span></div>
    ${hbars(Object.entries(T.sub_scores).map(([k, val]) => ({ key: k, label: { diversity: 'Category variety', premium: 'Premium-brand share (vs 30 % benchmark)', anchors: 'Anchor coverage', quality: 'Rating quality' }[k] || k, value: val * 100, text: pct(val) })))}
    <div class="note">${T.anchors ? 'Anchors: ' + Object.entries(T.anchors).map(([k, val]) => `${val ? '✓' : '✗'} ${esc(k)}`).join(' · ') : ''}</div>`) : '';
  el.innerHTML = `
    <div class="intro"><b>Descriptive study.</b> What the area around <b>${esc(subj.name)}</b> looks like and how it is changing. There is <b>no score and no ranking</b> here: other malls appear only as context (their median).</div>
    ${block('Inside the 15-minute drive area', 'Same yardstick for every mall: hexagons whose centre lies inside the drive area', facts)}
    ${block('How the area is growing', 'Share of the 15-minute area’s hexagons by growth type', stackRows([gtRow], { fmt: (x) => pct(x) }) + '<div class="note">Infill = filling gaps inside the city; edge = the city growing outward; leapfrog = detached new development (sprawl); frontier = open land surrounded by growth.</div>')}
    ${block('Built-up share over time, by drive time', 'Satellite land cover, pooled over each drive-time area', lineChart({ xs: Y.map(String), series: series('built'), fmt: (x) => pct(x), yMin: null, cap: 1 }) +
      '<div class="chart-title">Land-use mix (0 = one cover type, 1 = fully mixed)</div>' + lineChart({ xs: Y.map(String), series: series('mix'), fmt: (x) => dec(x, 2), yMin: null, cap: 1 }))}
    ${catchHTML}${tenHTML}`;
  return {
    activate() {
      map.setHexValues(data.hexes.map((h) => h.built_change_pp), { ramp: 'heat', domain: [0, Math.max(5, quantile(data.hexes.map((h) => h.built_change_pp), 0.97))] });
      map.selectMall(subj); ['cand', 'watch', 'excl', 'edge'].forEach((k) => map.setLayerVisible(k, false));
      ctx.setLegend(legendBar(rampCss('heat'), '0 pp', '+' + dec(quantile(data.hexes.map((h) => h.built_change_pp), 0.97), 0) + ' pp', `Built-up growth ${data.city.early[0]}→${data.city.late.at(-1)} (blue outline: ${short(subj.name)}'s 15-min area)`));
    },
  };
}
export function quantile(arr, q) { const a = arr.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : NaN; }
