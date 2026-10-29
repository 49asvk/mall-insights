// Predictive mode: rank the malls with adjustable, explained weights.
import { block, notice, weightPanel, legendBar } from './ui.js';
import { hbars } from './charts.js';
import { MALL_INDICES, MALL_PRESETS, compositeScores, rankRanges } from './scoring.js';
import { rampCss } from './map.js';
import { int, dec, pct, inr, esc, short } from './format.js';
import { emit, on } from './state.js';

export function mountRanking(el, ctx) {
  const { data, map, S } = ctx, used = data.malls.indices_used || [], IDX = MALL_INDICES.filter((i) => used.includes(i.key)), keys = IDX.map((i) => i.key);
  const base = data.malls.malls, defaults = data.malls.weights;
  const defRank = Object.fromEntries(compositeScores(base, defaults, keys).map((m) => [m.id, m.rank]));
  const skipped = MALL_INDICES.filter((i) => !used.includes(i.key)).map((i) => `${i.key} ${i.name}`);
  el.innerHTML = `
    <div class="intro"><b>Predictive comparison.</b> Every mall is measured on the same yardstick (its 15-minute drive area). Each index is scaled 0–100 <b>across these ${base.length} malls</b>, so 100 = best of this set, not "perfect".</div>
    ${base.length < 10 ? notice('warning', `Only ${base.length} malls`, 'With so few malls every mall moves the scale. Treat the ranking as a conversation starter; add more peers (notebook 04 lists unlisted malls).') : ''}
    ${skipped.length ? `<div class="note">Not in this ranking: ${esc(skipped.join(', '))} — ${used.includes('A') ? '' : 'A and H need a tenant list for every mall. '}${used.includes('G') ? '' : 'G needs the Business Analyst POI export.'}</div>` : ''}
    <div class="chart-title">Ranking</div><div id="rk-list"></div><div class="note">▲▼ = places gained / lost compared with the default weights. Click a mall for details.</div>
    <div id="rk-card"></div>
    ${block('What counts, and how much', 'Move a slider and the ranking updates instantly', '<div id="rk-w"></div>')}`;
  let W = { ...defaults }, sel = data.city.subject || compositeScores(base, defaults, keys).sort((a, b) => a.rank - b.rank)[0]?.id || null, ranked = [];
  const render = () => {
    ranked = compositeScores(base, W, keys).sort((a, b) => a.rank - b.rank); S.malls = ranked;
    const RR = rankRanges(ranked, W, keys);
    el.querySelector('#rk-list').innerHTML = hbars(ranked.map((m, i) => ({ key: m.id, rank: m.rank, label: short(m.name), value: m.composite, text: dec(m.composite, 0),
      cls: (m.id === sel ? 'sel ' : '') + (m.role === 'subject' ? 'subj ' : '') + (m.confidence === 'check' ? 'chk' : ''), delta: defRank[m.id] - m.rank,
      tip: `In 80 % of 400 random re-weightings around these weights: rank ${RR[i].p10}–${RR[i].p90}` })), { attr: 'data-mall' });
    el.querySelectorAll('[data-mall]').forEach((r) => r.addEventListener('click', () => emit('select', r.dataset.mall)));
    map.setMalls(ranked, 'composite'); card(RR);
  };
  const card = (RR) => {
    const i = ranked.findIndex((m) => m.id === sel), box = el.querySelector('#rk-card');
    if (i < 0) { box.innerHTML = ''; return; }
    const m = ranked[i], others = ranked.filter((x) => x.id !== m.id), med = (k) => { const a = others.map((x) => x[k]).sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
    box.innerHTML = block(`#${m.rank} ${m.name}`, `Composite ${dec(m.composite, 0)} / 100`, `
      ${hbars(IDX.map((I) => ({ key: I.key, label: `${I.key} · ${I.name}`, value: m[I.key], text: dec(m[I.key], 0), tick: med(I.key), tip: I.blurb })))}
      <div class="note">Orange tick = median of the other malls.</div>
      <div class="robust">Rank stability: in 80 % of 400 random re-weightings around your current weights this mall ranks <b>#${RR[i].p10}–#${RR[i].p90}</b>${RR[i].top1 > 0 ? ` (first in ${pct(RR[i].top1)} of them)` : ''}.</div>
      <dl class="facts">
        <div><dt>People within 15 min</dt><dd>${int(m.pop)}</dd></div><div><dt>Shared catchment</dt><dd>${pct(m.overlap_share)}</dd></div>
        <div><dt>Nearest other mall</dt><dd>${dec(m.nearest_other_km)} km</dd></div><div><dt>Purchasing power / person</dt><dd>${inr(m.spend_pc)}</dd></div>
        <div><dt>Built-up now</dt><dd>${pct(m.built_late)}</dd></div><div><dt>Built-up growth</dt><dd>+${dec(m.built_change_pp)} pp</dd></div>
        <div><dt>Forecast growth</dt><dd>+${dec(m.fc_gain_pp)} pp</dd></div><div><dt>Brand outlets / 100k</dt><dd>${dec(m.brand_per_100k)}</dd></div>
      </dl>`);
  };
  weightPanel(el.querySelector('#rk-w'), { id: 'rkw', items: IDX, defaults, presets: MALL_PRESETS, onChange: (w) => { W = w; render(); },
    intro: 'The composite is a weighted average of the indices.' });
  on('select', (id) => { sel = id; render(); });
  render();
  return {
    activate() {
      map.setHexValues(data.hexes.map((h) => h.bu_late), { ramp: 'greys', domain: [0, 1], opacity: 0.55 });
      ['cand', 'watch', 'excl', 'edge'].forEach((k) => map.setLayerVisible(k, false)); map.setLayerVisible('saAll', false);
      ctx.setLegend(legendBar(rampCss('greys'), '0 %', '100 %', 'Built-up share, latest years · circles: malls sized by composite'));
    },
  };
}
