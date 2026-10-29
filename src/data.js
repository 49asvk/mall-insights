import { CONFIG } from './config.js';
const normName = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
async function getJSON(url, optional = false) {
  const r = await fetch(url);
  if (!r.ok) { if (optional) return null; throw new Error(`Missing ${url.replace(CONFIG.dataPath, '')} (HTTP ${r.status}). Run: npm run sync-data -- <path to the city's dashboard folder>`); }
  return r.json();
}
export async function loadCities() {
  const c = await getJSON(CONFIG.dataPath + 'cities.json');
  if (!Array.isArray(c) || !c.length) throw new Error('cities.json is empty. Run: npm run sync-data -- <path to dashboard folder>');
  return c;
}
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
      excluded: !!p.excluded, exclude_reason: p.exclude_reason || '', eligible0: !!p.eligible, bu: (p.bu || []).map(num), mix: (p.mix || []).map(num) };
    for (const k of NUMF) h[k] = num(p[k]);
    for (let k = 1; k <= 6; k++) if (p[`ring${k}_change_pp`] !== undefined) h[`ring${k}`] = num(p[`ring${k}_change_pp`]);
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
  return { city, hexes, malls, opp, dyn, land, defs, sa, tenants, catchment, exclusions, manifest };
}
