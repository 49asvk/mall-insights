// Plain-language definitions of every indicator this run produced (definitions.json comes from mallkit/glossary.py).
import { esc } from './format.js';
import { legendBar } from './ui.js';
import { rampCss } from './map.js';
const LEVELS = { hex: 'Per hexagon — land cover and growth', focus: 'Around the focus point', opportunity: 'Per hexagon — opportunity score', mall: 'Per mall — inside its 15-minute drive area', mall_index: 'Per mall — indices and ranking' };
export function mountDefinitions(el, ctx) {
  const { data } = ctx, D = data.defs, c = data.city;
  const render = (q = '') => {
    const ql = q.toLowerCase(), hit = (g) => !ql || [g.name, g.short, g.how, g.key].join(' ').toLowerCase().includes(ql);
    el.querySelector('#df-list').innerHTML = Object.entries(LEVELS).map(([lv, title]) => {
      const rows = D.filter((g) => g.level === lv && !g.support && hit(g)); if (!rows.length) return '';
      return `<div class="chart-title">${esc(title)}</div>` + rows.map((g) => `<details class="def"><summary><b>${esc(g.name)}</b> <span class="muted">${esc(g.unit)}</span><div class="def-short">${esc(g.short)}</div></summary>
        <div class="def-how"><b>How:</b> ${esc(g.how)}<br><b>Source:</b> ${esc(g.source)} · <b>Field:</b> <code>${esc(g.key)}</code></div></details>`).join('');
    }).join('') + (() => { const sup = D.filter((g) => g.support && hit(g)); return sup.length ? `<details class="dt"><summary>Supporting fields (${sup.length}) — in the geodatabase and CSVs</summary>${sup.map((g) => `<div class="def-how"><b>${esc(g.name)}</b> <code>${esc(g.key)}</code>: ${esc(g.short)}</div>`).join('')}</details>` : ''; })() || '<div class="muted">Nothing matches.</div>';
  };
  el.innerHTML = `
    <div class="intro">Every number in this dashboard, in one or two lines. Click a line for how it is calculated. The same list is in <code>INDEX_GUIDE.md</code> and in the <code>field_dictionary</code> table of the ArcGIS Pro geodatabase.</div>
    <div class="note">Mode: <b>${esc(c.mode)}</b>. Land cover ${c.years[0]}–${c.years.at(-1)} (start = ${c.early.join(' & ')}, latest = ${c.late.join(' & ')}). Forecast ${c.forecast_years[0]} → ${c.forecast_years[1]}. Neighbour rings 1–${c.neighbour_rings}. ${c.mode === 'descriptive' ? 'No ranking of malls in this mode.' : ''}</div>
    <calcite-input id="df-q" placeholder="Search, e.g. hotspot, purchasing, ring" icon="search" scale="s" clearable></calcite-input>
    <div id="df-list"></div>
    <div class="chart-title">Data sources</div>
    <ul class="steps"><li>Land cover: Esri Sentinel-2 10 m Land Use/Land Cover, one raster per year.</li><li>Population, purchasing power: Esri Business Analyst (offline), enriched in ArcGIS Pro.</li>
      <li>Drive-time areas: ArcGIS Pro Network Analyst (local network).</li><li>Brand outlets: Esri Business Analyst POIs.</li><li>Transit, roads, military land / cantonments, unlisted malls: OpenStreetMap.</li></ul>
    <div class="note">Nothing here calls an online Esri service; all scores are computed in your browser from static files.</div>`;
  el.querySelector('#df-q').addEventListener('calciteInputInput', (e) => render(e.target.value));
  render();
  return { activate() { ctx.map.setHexValues(data.hexes.map((h) => h.bu_late), { ramp: 'greys', domain: [0, 1], opacity: 0.55 }); ctx.setLegend(legendBar(rampCss('greys'), '0 %', '100 %', 'Built-up share, latest years')); } };
}
