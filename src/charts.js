import { esc } from './format.js';
export const legend = (items) => `<div class="legend">${items.map((i) => `<span class="lg"><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;
export function dataTable(headers, rows, open = false) {
  return `<details class="dt" ${open ? 'open' : ''}><summary>Data table</summary><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
}
/** Horizontal bars. rows: [{key,label,value,text,tip,cls,tick,rank,delta}] */
export function hbars(rows, { max = 100, attr = 'data-key' } = {}) {
  return `<div class="hbars">${rows.map((r) => `<div class="hbar ${r.cls || ''}" ${attr}="${esc(r.key)}" data-tip="${esc(r.tip || r.label)}">
    ${r.rank !== undefined ? `<span class="hb-rank">${r.rank}</span>` : ''}<span class="hb-label">${esc(r.label)}</span>
    <span class="hb-track"><span class="hb-fill" style="width:${Math.max(0, Math.min(100, (r.value / max) * 100))}%"></span>${
      Number.isFinite(r.tick) ? `<span class="hb-tick" style="left:${Math.max(0, Math.min(100, (r.tick / max) * 100))}%"></span>` : ''}</span>
    <span class="hb-val">${r.delta ? `<span class="delta ${r.delta > 0 ? 'up' : 'down'}">${r.delta > 0 ? '▲' : '▼'}${Math.abs(r.delta)}</span> ` : ''}${esc(r.text ?? r.value.toFixed(1))}</span></div>`).join('')}</div>`;
}
const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
/** Line chart. xs:[labels], series:[{name,color,values,dash}] ; mark: index of x to highlight */
export function lineChart({ xs, series, fmt, yMin = 0, yMax = null, height = 200, mark = null, cap = Infinity }) {
  const W = 420, H = height, pl = 38, pr = 46, pt = 12, pb = 24, iw = W - pl - pr, ih = H - pt - pb;
  const all = series.flatMap((s) => s.values.filter(Number.isFinite));
  if (!all.length) return '<div class="muted">no data</div>';
  const lo = yMin ?? Math.max(0, Math.floor(Math.min(...all) * 20) / 20), max = yMax ?? Math.min(cap, lo + niceMax(Math.max(...all) - lo)), sx = (i) => pl + (xs.length === 1 ? iw / 2 : (i / (xs.length - 1)) * iw), sy = (v) => pt + ih - ((v - lo) / (max - lo || 1)) * ih;
  let g = '';
  for (let t = 0; t <= 4; t++) { const v = lo + ((max - lo) * t) / 4, y = sy(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="grid"/><text x="${pl - 5}" y="${y + 3}" class="axis" text-anchor="end">${esc(fmt(v))}</text>`; }
  if (mark !== null) g += `<line x1="${sx(mark)}" x2="${sx(mark)}" y1="${pt}" y2="${pt + ih}" class="markline"/>`;
  xs.forEach((x, i) => { if (xs.length <= 9 || i % 2 === 0) g += `<text x="${sx(i)}" y="${H - 7}" class="axis" text-anchor="middle">${esc(x)}</text>`; });
  const ends = [];
  series.forEach((s) => {
    const pts = s.values.map((v, i) => (Number.isFinite(v) ? [sx(i), sy(v), v, i] : null)).filter(Boolean);
    g += `<polyline points="${pts.map((p) => p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="4 3"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p) => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.color}" class="mk" data-tip="${esc(`${s.name} · ${xs[p[3]]}: ${fmt(p[2])}`)}"/>`; });
    const last = pts[pts.length - 1]; if (last) ends.push({ x: last[0] + 7, y: last[1] + 3, t: s.short || s.name });
  });
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
  ends.forEach((e) => { g += `<text x="${e.x}" y="${e.y}" class="lbl">${esc(e.t)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${g}</svg>`;
}
/** Radar of 8 compass directions; series:[{name,color,values (8, km)}] */
export function radar({ labels, series, fmt = (v) => v.toFixed(1) + ' km', size = 250 }) {
  const c = size / 2, R = c - 26, all = series.flatMap((s) => s.values.filter(Number.isFinite)), max = niceMax(Math.max(...all, 1));
  const pt = (k, v) => { const a = (k * 45 * Math.PI) / 180; return [c + (R * v / max) * Math.sin(a), c - (R * v / max) * Math.cos(a)]; };
  let g = '';
  for (let t = 1; t <= 4; t++) { g += `<polygon points="${labels.map((_, k) => pt(k, (max * t) / 4).join(',')).join(' ')}" class="rgrid"/>`; }
  g += `<text x="${c + 3}" y="${c - R - 2}" class="axis">${esc(fmt(max))}</text>`;
  labels.forEach((l, k) => { const [x, y] = pt(k, max * 1.12); g += `<line x1="${c}" y1="${c}" x2="${pt(k, max)[0]}" y2="${pt(k, max)[1]}" class="rgrid"/><text x="${x}" y="${y + 3}" text-anchor="middle" class="axis">${esc(l)}</text>`; });
  series.forEach((s) => {
    g += `<polygon points="${s.values.map((v, k) => pt(k, Number.isFinite(v) ? v : 0).join(',')).join(' ')}" fill="${s.color}" fill-opacity="${s.fill ?? 0.12}" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="4 3"' : ''}/>`;
    s.values.forEach((v, k) => { if (Number.isFinite(v)) { const [x, y] = pt(k, v); g += `<circle cx="${x}" cy="${y}" r="3.5" fill="${s.color}" class="mk" data-tip="${esc(`${s.name} · ${labels[k]}: ${fmt(v)}${s.capped?.[k] ? ' (or more: beyond the study area)' : ''}`)}"/>`; } });
  });
  return `<svg viewBox="0 0 ${size} ${size}" class="chart radar" role="img">${g}</svg>`;
}
/** small inline sparkline for popups */
export function sparkline(values, { w = 160, h = 34, color = '#2a78d6', fmt = (v) => v } = {}) {
  const v = values.map((x) => (Number.isFinite(x) ? x : null)); const ok = v.filter((x) => x !== null); if (ok.length < 2) return '';
  const lo = Math.min(...ok), hi = Math.max(...ok), sx = (i) => 3 + (i / (v.length - 1)) * (w - 6), sy = (x) => h - 4 - ((x - lo) / (hi - lo || 1)) * (h - 8);
  const pts = v.map((x, i) => (x === null ? null : `${sx(i)},${sy(x)}`)).filter(Boolean).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/><text x="2" y="10" font-size="9" fill="#888">${esc(fmt(lo))}–${esc(fmt(hi))}</text></svg>`;
}
/** Stacked horizontal rows. rows:[{label,parts:[{name,value,color}],total}] */
export function stackRows(rows, { fmt = (v) => v } = {}) {
  return `<div class="stacks">${rows.map((r) => {
    const tot = r.parts.reduce((a, p) => a + p.value, 0) || 1;
    return `<div class="stack"><span class="hb-label">${esc(r.label)}</span><span class="st-track">${r.parts.filter((p) => p.value > 0).map((p) =>
      `<span class="st-seg" style="flex:${p.value / tot};background:${p.color}" data-tip="${esc(`${r.label} · ${p.name}: ${fmt(p.value)} (${((p.value / tot) * 100).toFixed(0)}%)`)}"></span>`).join('')}</span><span class="hb-val">${esc(r.total ?? fmt(tot))}</span></div>`;
  }).join('')}</div>`;
}
