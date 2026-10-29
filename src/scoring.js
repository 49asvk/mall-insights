// Pure functions: everything the sliders drive is computed here, in the browser (same maths as notebooks 06 and 07).
export const MALL_INDICES = [
  { key: 'A', name: 'Tenant mix', blurb: 'Variety, premium brands and anchor stores in the mall’s own tenant list.', more: 'Favours malls with a stronger line-up of shops.' },
  { key: 'B', name: 'Competitive headroom', blurb: 'How few other malls fight for the same shoppers (shared 15-min catchment, nearby malls).', more: 'Favours malls with less competition around them.' },
  { key: 'C', name: 'Reachability', blurb: 'People living within a 15-minute drive, plus public transport.', more: 'Favours malls that reach more people.' },
  { key: 'D', name: 'Spending power', blurb: 'Purchasing power of those people (Business Analyst estimate — treat with caution).', more: 'Favours richer catchments. Kept low by default because the purchasing-power estimates are uncertain.' },
  { key: 'E', name: 'Growth momentum', blurb: 'How fast the catchment is building up, observed and forecast from satellite land cover.', more: 'Favours malls in areas that are growing.' },
  { key: 'G', name: 'Brand ecosystem', blurb: 'Stand-alone outlets of the tenant brands nearby, per 100k people.', more: 'Favours malls in areas where brands already invest.' },
  { key: 'H', name: 'Brand differentiation', blurb: 'Share of the mall’s brands its competitors do not have.', more: 'Favours malls with a unique line-up.' },
];
export const MALL_PRESETS = {
  'Default': null,
  'Equal': (keys) => Object.fromEntries(keys.map((k) => [k, 1])),
  'Footfall first': (keys) => Object.fromEntries(keys.map((k) => [k, { C: 4, B: 2, E: 1 }[k] ?? 0.5])),
  'Growth first': (keys) => Object.fromEntries(keys.map((k) => [k, { E: 4, C: 1.5, B: 1 }[k] ?? 0.5])),
  'Less competition': (keys) => Object.fromEntries(keys.map((k) => [k, { B: 4, H: 2, C: 1 }[k] ?? 0.5])),
};
export const HEX_COMPONENTS = [
  { key: 'people', field: 'pop', name: 'People', blurb: 'Residents in the hexagon (Business Analyst).', more: 'Favours densely populated areas.' },
  { key: 'spending', field: 'spend', name: 'Spending power', blurb: 'Purchasing power estimate — can be unrealistic in special areas such as cantonments.', more: 'Kept low by default.' },
  { key: 'growth_now', field: 'built_change_pp', name: 'Recent built-up growth', blurb: 'How much the hexagon built up over the study period (satellite).', more: 'Favours areas that are already developing.' },
  { key: 'growth_next', field: 'fc_gain_pp', name: 'Forecast growth', blurb: 'Expected built-up growth in the next years (land-cover model).', more: 'Favours areas expected to develop next.' },
  { key: 'pull', field: 'growth_pull_pp', name: 'Neighbourhood pull', blurb: 'How fast the surrounding rings 1–4 are building up.', more: 'Favours areas surrounded by growth.' },
  { key: 'gap', field: 'gap', name: 'Mall gap', blurb: 'Distance from existing malls (cut if already inside a mall’s 15-min area).', more: 'Favours under-served areas.' },
  { key: 'transit', field: 'transit', name: 'Transit', blurb: 'Bus stops and rail/metro stations within 1 km.', more: 'Favours areas with public transport.' },
];
export const HEX_PRESETS = {
  'Default': null,
  'Equal': (keys) => Object.fromEntries(keys.map((k) => [k, 1])),
  'Today’s demand': (keys) => Object.fromEntries(keys.map((k) => [k, { people: 4, gap: 2, transit: 1.5, spending: 0.5 }[k] ?? 0.5])),
  'Future growth': (keys) => Object.fromEntries(keys.map((k) => [k, { growth_next: 4, pull: 2.5, growth_now: 2, gap: 1.5 }[k] ?? 0.5])),
  'Ignore spending': (keys) => Object.fromEntries(keys.map((k) => [k, k === 'spending' ? 0 : 1])),
};
export const normWeights = (W) => { const s = Object.values(W).reduce((a, b) => a + b, 0) || 1; return Object.fromEntries(Object.entries(W).map(([k, v]) => [k, v / s])); };

export function compositeScores(malls, W, keys) {
  const w = normWeights(W);
  const out = malls.map((m) => ({ ...m, composite: keys.reduce((a, k) => a + (w[k] || 0) * m[k], 0) }));
  [...out].sort((a, b) => b.composite - a.composite).forEach((m, i) => { m.rank = i + 1; });
  return out;
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gamma(shape, rnd) {
  if (shape <= 0) return 0;
  if (shape < 1) return gamma(shape + 1, rnd) * Math.pow(rnd(), 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { const u1 = rnd() || 1e-9, u2 = rnd(); x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = rnd();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
/** rank range of every mall under n random weightings around W (Dirichlet, concentration 25) */
export function rankRanges(malls, W, keys, n = 400, seed = 7) {
  const w = normWeights(W), rnd = mulberry32(seed), R = malls.map(() => []);
  for (let d = 0; d < n; d++) {
    const g = keys.map((k) => gamma((w[k] || 0) * 25, rnd)), s = g.reduce((a, b) => a + b, 0) || 1;
    const sc = malls.map((m) => keys.reduce((a, k, j) => a + (g[j] / s) * m[k], 0));
    sc.forEach((v, i) => R[i].push(1 + sc.filter((x) => x > v).length));
  }
  return R.map((r) => { r.sort((a, b) => a - b); const q = (p) => r[Math.min(n - 1, Math.floor(p * n))]; return { median: q(0.5), p10: q(0.1), p90: q(0.9), top1: r.filter((x) => x === 1).length / n }; });
}
function pctRank(vals, mask) {
  const idx = []; vals.forEach((v, i) => { if (mask[i] && Number.isFinite(v)) idx.push(i); });
  idx.sort((a, b) => vals[a] - vals[b]);
  const out = new Float64Array(vals.length).fill(NaN), n = idx.length;
  for (let a = 0; a < n;) { let b = a; while (b + 1 < n && vals[idx[b + 1]] === vals[idx[a]]) b++; const r = (a + b) / 2 + 1; for (let k = a; k <= b; k++) out[idx[k]] = r / n; a = b + 1; }
  return out;
}
/** Percentile-blend opportunity score among eligible hexes (same rules as notebook 06). */
export function scoreHexes(hexes, W, f) {
  const w = normWeights(W);
  const eligible = hexes.map((h) => h.pop >= f.minPop && h.bu_late >= f.minBuilt && (!f.respectExclusions || !h.excluded) && Number.isFinite(h.bu_late) && !(h.valid_share < (f.minValid ?? 0)));
  const comps = {};
  for (const c of HEX_COMPONENTS) { const p = pctRank(hexes.map((h) => h[c.field]), eligible); comps[c.key] = p.map((v) => (Number.isFinite(v) ? v : 0)); }
  const score = new Float64Array(hexes.length).fill(NaN);
  hexes.forEach((h, i) => { if (eligible[i]) score[i] = 100 * HEX_COMPONENTS.reduce((a, c) => a + (w[c.key] || 0) * comps[c.key][i], 0); });
  return { score, comps, eligible };
}
export const km = (a, b) => { const kx = 111.32 * Math.cos(((a.cy + b.cy) / 2) * Math.PI / 180), ky = 110.57; return Math.hypot((a.cx - b.cx) * kx, (a.cy - b.cy) * ky); };
export function pickCandidates(hexes, res, W, f) {
  const w = normWeights(W), order = [...hexes.keys()].filter((i) => Number.isFinite(res.score[i]) && hexes[i].dist_mall_km >= f.minDist).sort((a, b) => res.score[b] - res.score[a]);
  const out = [];
  for (const i of order) {
    if (out.every((o) => km(hexes[i], hexes[o.i]) >= f.minSep)) {
      const why = HEX_COMPONENTS.map((c) => ({ c, v: (w[c.key] || 0) * res.comps[c.key][i] })).sort((a, b) => b.v - a.v).slice(0, 2).map((x) => x.c.name);
      out.push({ i, hex: hexes[i], score: res.score[i], why });
    }
    if (out.length >= f.topN) break;
  }
  return out;
}
/** neighbour rings 1..K for every hex from centroid spacing (works for any regular hex grid) */
export function buildRings(hexes, K = 4) {
  const n = hexes.length, kx = 111.32 * Math.cos((hexes[0].cy * Math.PI) / 180), ky = 110.57;
  const P = hexes.map((h) => [h.cx * kx, h.cy * ky]);
  const cell = 1.2, grid = new globalThis.Map();
  P.forEach(([x, y], i) => { const k = Math.floor(x / cell) + ',' + Math.floor(y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  let nn = []; for (let i = 0; i < Math.min(n, 300); i++) { let b = Infinity; const [x, y] = P[i]; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get((Math.floor(x / cell) + dx) + ',' + (Math.floor(y / cell) + dy)) || []) if (j !== i) b = Math.min(b, Math.hypot(P[j][0] - x, P[j][1] - y)); if (b < Infinity) nn.push(b); }
  nn.sort((a, b) => a - b); const sp = nn[Math.floor(nn.length / 2)] || 0.9, thr = sp * 1.25;
  const adj = P.map(([x, y], i) => { const out = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get((Math.floor(x / cell) + dx) + ',' + (Math.floor(y / cell) + dy)) || []) if (j !== i && Math.hypot(P[j][0] - x, P[j][1] - y) < thr) out.push(j); return out; });
  return (i) => { const seen = new globalThis.Map([[i, 0]]); let fr = [i]; const rings = []; for (let k = 1; k <= K; k++) { const nx = []; for (const u of fr) for (const v of adj[u]) if (!seen.has(v)) { seen.set(v, k); nx.push(v); } rings.push(nx); fr = nx; } return rings; };
}
