import '@esri/calcite-components/main.css';
import './setup.js';
import '@esri/calcite-components/components/calcite-shell';
import '@esri/calcite-components/components/calcite-shell-panel';
import '@esri/calcite-components/components/calcite-tabs';
import '@esri/calcite-components/components/calcite-tab-nav';
import '@esri/calcite-components/components/calcite-tab-title';
import '@esri/calcite-components/components/calcite-tab';
import '@esri/calcite-components/components/calcite-block';
import '@esri/calcite-components/components/calcite-slider';
import '@esri/calcite-components/components/calcite-segmented-control';
import '@esri/calcite-components/components/calcite-segmented-control-item';
import '@esri/calcite-components/components/calcite-switch';
import '@esri/calcite-components/components/calcite-select';
import '@esri/calcite-components/components/calcite-option';
import '@esri/calcite-components/components/calcite-notice';
import '@esri/calcite-components/components/calcite-chip';
import '@esri/calcite-components/components/calcite-icon';
import '@esri/calcite-components/components/calcite-button';
import '@esri/calcite-components/components/calcite-input';
import './style.css';
import { CONFIG } from './config.js';
import { loadAll, loadCities } from './data.js';
import { createMap, HS_LABELS } from './map.js';
import { mountOverview } from './overview.js';
import { mountRanking } from './ranking.js';
import { mountLandcover } from './landcover.js';
import { mountGrowth } from './growth.js';
import { mountOpportunity } from './opportunity.js';
import { mountDefinitions } from './definitions.js';
import { buildRings } from './scoring.js';
import { notice } from './ui.js';
import { sparkline } from './charts.js';
import { emit, on } from './state.js';
import { dec, int, pct, inr, esc, short } from './format.js';

const $ = (s) => document.querySelector(s);
$('#theme-switch').addEventListener('calciteSwitchChange', (e) => {
  const dark = e.target.checked; document.documentElement.classList.toggle('calcite-mode-dark', dark); document.documentElement.classList.toggle('calcite-mode-light', !dark);
  $('#esri-theme').href = new URL(`${CONFIG.base}arcgis-assets/esri/themes/${dark ? 'dark' : 'light'}/main.css`, document.baseURI).href; window.__map?.setTheme(dark);
});
if (matchMedia('(prefers-color-scheme: dark)').matches) { $('#theme-switch').checked = true; $('#theme-switch').dispatchEvent(new CustomEvent('calciteSwitchChange')); }
const tip = $('#tip');
document.addEventListener('mousemove', (e) => { const t = e.target.closest?.('[data-tip]'); if (!t) { tip.style.opacity = 0; return; } tip.textContent = t.dataset.tip; tip.style.opacity = 1; tip.style.left = Math.min(innerWidth - 290, e.clientX + 12) + 'px'; tip.style.top = e.clientY + 14 + 'px'; });

(async () => {
  let cities, data;
  try { cities = await loadCities(); } catch (err) { $('#banner').innerHTML = notice('danger', 'Could not load data', esc(err.message)); $('#data-chip').textContent = 'no data'; return; }
  const want = new URLSearchParams(location.search).get('city');
  const slug = cities.find((c) => c.slug === want)?.slug || cities[0].slug;
  const sel = $('#city-select');
  sel.innerHTML = cities.map((c) => `<calcite-option value="${esc(c.slug)}" ${c.slug === slug ? 'selected' : ''}>${esc(c.name)}${c.synthetic ? ' (demo data)' : ''}</calcite-option>`).join('');
  if (cities.length < 2) sel.setAttribute('disabled', '');
  sel.addEventListener('calciteSelectChange', (e) => { location.search = '?city=' + encodeURIComponent(e.target.value); });
  try { data = await loadAll(slug); } catch (err) { $('#banner').innerHTML = notice('danger', 'Could not load data', esc(err.message)); $('#data-chip').textContent = 'no data'; return; }
  const C = data.city, desc = C.mode === 'descriptive', subj = data.malls.malls.find((m) => m.id === C.subject);
  document.title = `Mall Insights · ${C.name}`;
  $('#subtitle').textContent = desc && subj ? `${C.name} · study of ${short(subj.name)}` : `${C.name} · ${data.malls.malls.length} malls compared`;
  $('#mode-chip').textContent = desc ? 'Descriptive study' : 'Predictive ranking';
  $('#mode-chip').title = desc ? 'Profiles one mall’s area; no ranking of malls' : 'Compares and ranks the malls; suggests next-mall zones';
  $('#data-chip').textContent = `${int(data.hexes.length)} hexagons · ${C.years[0]}–${C.years.at(-1)}`;
  if (data.manifest?.synthetic || C.synthetic) $('#banner').innerHTML = notice('danger', 'Synthetic demo data', 'Generated with <code>--demo</code> from made-up stand-in inputs. The numbers mean nothing: re-run on the real exports.');

  // ---- tabs per mode
  const TABS = desc
    ? [['overview', subj ? short(subj.name) : 'Overview', mountOverview], ['landcover', 'Land cover', mountLandcover], ['growth', 'Growth', mountGrowth], ['opportunity', 'Opportunity', mountOpportunity], ['defs', 'Definitions', mountDefinitions]]
    : [['ranking', 'Ranking', mountRanking], ['landcover', 'Land cover', mountLandcover], ['growth', 'Growth', mountGrowth], ['opportunity', 'Next mall', mountOpportunity], ['defs', 'Definitions', mountDefinitions]];
  const nav = $('#tab-nav'), tabs = $('#tabs');
  TABS.forEach(([k, label], n) => {
    const t = document.createElement('calcite-tab-title'); t.textContent = label; t.dataset.key = k; if (!n) t.selected = true; nav.appendChild(t);
    const p = document.createElement('calcite-tab'); if (!n) p.selected = true; p.innerHTML = `<div class="tab" id="tab-${k}"></div>`; tabs.appendChild(p);
  });
  const S = { malls: data.malls.malls }; window.__S = S;
  const ringsOf = buildRings(data.hexes, C.neighbour_rings || 4);
  const legendEl = $('#map-legend');
  const ctx = { S, data, setLegend: (html) => { legendEl.innerHTML = html; }, ringsOf, active: null };
  const rowsHTML = (rows) => `<table class="pop">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
  const handlers = {
    onMall: (id) => emit('select', id), onCand: (k) => ctx.focusCandidate?.(k), onHex: (i) => { emit('hex', i); map.highlightHex(i); },
    hexTitle: (i) => `Hexagon · ${esc(data.hexes[i].growth_type)}`,
    hexPopup: (i) => {
      const h = data.hexes[i], sc = mounted.opportunity?.score(i);
      return `<div class="pop-spark">Built-up share ${C.years[0]}–${C.years.at(-1)}<br>${sparkline(h.bu, { fmt: (v) => pct(v) })}</div>` + rowsHTML([
        ['Built-up share', pct(h.bu_early) + ' → ' + pct(h.bu_late)], ['Built-up growth', '+' + dec(h.built_change_pp) + ' pp'], ['Neighbourhood pull (rings 1–' + (C.neighbour_rings || 4) + ')', dec(h.growth_pull_pp) + ' pp'],
        ['Growth hotspot', HS_LABELS[h.hotspot_bin] || '–'], ['Forecast to ' + C.forecast_years[1], '+' + dec(h.fc_gain_pp) + ' pp (' + dec(h.fc_low_pp) + '–' + dec(h.fc_high_pp) + ')'],
        ['Land-use mix', dec(h.mix_early, 2) + ' → ' + dec(h.mix_late, 2)], ['Open land left', pct(h.open_land)],
        ['People (BA)', int(h.pop)], ['Purchasing power (BA)', inr(h.spend)], ['Nearest mall', esc(short(h.nearest_mall || '–')) + ' · ' + dec(h.dist_mall_km) + ' km'],
        ['Opportunity score', h.excluded ? 'excluded: ' + esc(h.exclude_reason) : Number.isFinite(sc) ? dec(sc, 0) + ' / 100' : 'not eligible (too few people or too little built-up)']]);
    },
    mallPopup: (id) => {
      const m = S.malls.find((x) => x.id === id) || data.malls.malls.find((x) => x.id === id); if (!m) return '';
      return rowsHTML([...(Number.isFinite(m.rank) && !desc ? [['Rank', '#' + m.rank + ' · composite ' + dec(m.composite, 0)]] : []), ['People within 15 min', int(m.pop)], ['Shared catchment', pct(m.overlap_share)],
        ['Built-up now', pct(m.built_late)], ['Built-up growth', '+' + dec(m.built_change_pp) + ' pp'], ['Forecast growth', '+' + dec(m.fc_gain_pp) + ' pp'],
        ['Scale confidence', m.confidence === 'check' ? 'unverified (OSM tag only)' : 'confident']]);
    },
  };
  const map = await createMap({ container: 'viewDiv', data, handlers }); window.__map = map; ctx.map = map;
  map.setMalls(data.malls.malls); if (subj) map.selectMall(subj);
  const mounted = {};
  TABS.forEach(([k, , fn]) => { mounted[k] = fn($('#tab-' + k), ctx); });
  const activate = (k) => { if (ctx.active && ctx.active !== k) mounted[ctx.active]?.deactivate?.(); ctx.active = k; mounted[k]?.activate(); };
  nav.addEventListener('calciteTabChange', () => activate(nav.selectedTitle?.dataset.key));
  on('select', (id) => { const m = data.malls.malls.find((x) => x.id === id); if (m) map.selectMall(m); });
  activate(TABS[0][0]);
  const side = $('#side'); const pad = () => map.setPadding(side.getBoundingClientRect().width || 0); pad(); new ResizeObserver(pad).observe(side);
  window.__ready = true;
})();
