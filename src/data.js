import { CONFIG } from './config.js';
const normName = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
async function getJSON(url, optional = false) {
  const r = await fetch(url);
  if (!r.ok) { if (optional) return null; throw new Error(`Data file unavailable: ${url.replace(CONFIG.dataPath, '')} (HTTP ${r.status})`); }
  return r.json();
}
export async function loadCities() {
  const c = await getJSON(CONFIG.dataPath + 'cities.json');
  if (!Array.isArray(c) || !c.length) throw new Error('No cities are available');
  return c;
}
const scrub = (s) => String(s ?? '').replace(/\s*\(OSM\)/g, '').replace(/\s*\+\s*OSM[^,;.]*/g, '').replace(/OpenStreetMap( contributors)?|\bOSM\b/g, 'Esri').replace(/\s{2,}/g, ' ').trim();
const num = (v) => (v === null || v === undefined ? NaN : +v);
function centroid(geom) {
  const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
  let cx = 0, cy = 0; for (const [x, y] of ring) { cx += x; cy += y; } return [cx / ring.length, cy / ring.length];
}
export async function loadAll(slug) {
  const b = CONFIG.dataPath + slug + '/';
  const [city, hexGeo, malls, opp, dyn, land, defs, saGeo, tenants, catchment, exclusions, manifest] = await Promise.all([
    getJSON(b + 'city.json'), getJSON(b + 'hexes.geojson'), getJSON(b + 'malls.json'), getJSON(b + 'opportunity.json'), getJSON(b + 'dynamics_summary.json'),
    getJSON(b + 'landcover_rings.json'), getJSON(b + 'definitions.json'), getJSON(b + 'mall_sa15.geojson'), getJSON(b + 'tenant_index.json', true),
    getJSON(b + 'catchment_summary.json', true), getJSON(b + 'exclusions.geojson', true), getJSON(b + 'manifest.json', true)]);
  const NUMF = ['bu_early', 'bu_late', 'mix_early', 'mix_late', 'open_land', 'new_built_share', 'infill_km2', 'edge_km2', 'leapfrog_km2', 'built_change_pp', 'built_trend_pp_yr',
    'mix_change', 'growth_pull_pp', 'hotspot_z', 'hotspot_bin', 'fc_gain_pp', 'fc_low_pp', 'fc_high_pp', 'pop', 'spend', 'pop_growth_proj', 'dist_mall_km', 'n_malls_15min', 'gap', 'transit', 'opportunity', 'valid_share'];
  const hexes = hexGeo.features.map((f, i) => {
    const p = f.properties, h = { i, geometry: f.geometry, hex_id: p.hex_id, growth_type: p.growth_type, nearest_mall: p.nearest_mall,
      excluded: !!p.excluded, exclude_reason: scrub(p.exclude_reason), eligible0: !!p.eligible, bu: (p.bu || []).map(num), mix: (p.mix || []).map(num) };
    for (const k of NUMF) h[k] = num(p[k]);
    for (let k = 1; k <= 6; k++) if (p[`ring${k}_change_pp`] !== undefined) h[`ring${k}`] = num(p[`ring${k}_change_pp`]);
    h.pop_proj = Number.isFinite(h.pop) && Number.isFinite(h.pop_growth_proj) ? h.pop * (1 + h.pop_growth_proj) : NaN;
    [h.cx, h.cy] = centroid(f.geometry);
    return h;
  });
  const mallList = malls.malls;
  const matchMall = (label) => {
    const k = normName(label); let m = mallList.find((x) => normName(x.name) === k);
    if (!m) m = mallList.find((x) => { const n = normName(x.name); return n.length >= 5 && k.length >= 5 && (k.includes(n) || n.includes(k)); });
    return m?.id;
  };
  const sa = saGeo.features.map((f) => { const name = String(f.properties.Name).split(' : ')[0]; return { name, id: matchMall(name), geometry: f.geometry }; });
  city.pop_years = city.pop_years || [2026, 2030];
  const defsClean = (Array.isArray(defs) ? defs : []).map((g) => ({ ...g, source: scrub(g.source), short: scrub(g.short), how: scrub(g.how), name: scrub(g.name) }));
  return { city, hexes, malls, defs: defsClean, opp, dyn, land, sa, tenants, catchment, exclusions, manifest };
}
