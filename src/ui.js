import { esc } from './format.js';
export const block = (heading, description, inner, open = true) =>
  `<calcite-block heading="${esc(heading)}" ${description ? `description="${esc(description)}"` : ''} expandable ${open ? 'expanded' : ''}>${inner}</calcite-block>`;
export const notice = (kind, title, msg, icon) =>
  `<calcite-notice kind="${kind}" open width="full" scale="s" ${icon ? `icon="${icon}"` : 'icon'}><div slot="title">${esc(title)}</div><div slot="message">${msg}</div></calcite-notice>`;
export const seg = (id, items, value) =>
  `<calcite-segmented-control id="${id}" scale="s" width="full">${items.map(([v, l]) => `<calcite-segmented-control-item value="${esc(v)}" ${v === value ? 'checked' : ''}>${esc(l)}</calcite-segmented-control-item>`).join('')}</calcite-segmented-control>`;
export const onSeg = (root, id, fn) => root.querySelector('#' + id)?.addEventListener('calciteSegmentedControlChange', (e) => fn(e.target.value));
export const legendBar = (css, lo, hi, title) => `<div class="lg-title">${esc(title)}</div><div class="legend-bar" style="background:${css}"></div><div class="legend-lbl"><span>${esc(lo)}</span><span>${esc(hi)}</span></div>`;
export const legendCats = (title, items) => `<div class="lg-title">${esc(title)}</div><div class="legend">${items.map(([c, l]) => `<span class="lg"><i style="background:${c}"></i>${esc(l)}</span>`).join('')}</div>`;

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#008300', '#e34948'];
/**
 * A weights panel that a non-specialist can read:
 *  - presets, reset
 *  - each slider shows the ingredient's name, one line on what it measures, what raising it favours, and its live share of the total
 *  - a stacked bar shows the shares (always 100 %)
 * items: [{key,name,blurb,more}], defaults: {key: weight 0..1}, presets: {name: null | (keys)=>weights}
 */
export function weightPanel(root, { id, items, defaults, presets, onChange, intro }) {
  const keys = items.map((i) => i.key);
  // positions are kept unrounded until the user drags a slider, so the default/preset weights are reproduced exactly
  const toSlider = (w) => { const m = Math.max(...keys.map((k) => w[k] || 0)) || 1; return Object.fromEntries(keys.map((k) => [k, ((w[k] || 0) / m) * 10])); };
  let cur = toSlider(defaults);
  root.innerHTML = `
    <div class="wp-intro">${intro || ''} <b>Each slider says how much an ingredient counts</b> (0 = ignore, 10 = counts most). The shares always add up to 100 %.</div>
    <div class="wp-presets"><span class="muted">Presets:</span> ${Object.keys(presets).map((p) => `<calcite-button scale="s" appearance="outline" kind="neutral" data-preset="${esc(p)}">${esc(p)}</calcite-button>`).join(' ')}</div>
    <div class="wp-bar" id="${id}-bar"></div>
    ${items.map((it, n) => `<div class="wrow">
      <div class="wlabel"><span><i class="dot" style="background:${COLORS[n % COLORS.length]}"></i>${esc(it.name)}</span><span class="wshare" id="${id}-${it.key}-share"></span></div>
      <div class="hint">${esc(it.blurb)}</div>
      <calcite-slider id="${id}-${it.key}" min="0" max="10" step="1" value="${Math.round(cur[it.key])}" ticks="1" label="${esc(it.name)}"></calcite-slider>
      <div class="hint more">${esc(it.more || '')}</div></div>`).join('')}`;
  const shares = () => { const s = keys.reduce((a, k) => a + cur[k], 0) || 1; return Object.fromEntries(keys.map((k) => [k, cur[k] / s])); };
  const paint = () => {
    const sh = shares();
    root.querySelector(`#${id}-bar`).innerHTML = keys.map((k, n) => sh[k] > 0 ? `<span style="flex:${sh[k]};background:${COLORS[n % COLORS.length]}" data-tip="${esc(items[n].name)}: ${Math.round(sh[k] * 100)} %"></span>` : '').join('');
    keys.forEach((k) => { root.querySelector(`#${id}-${k}-share`).textContent = cur[k] === 0 ? 'ignored' : `${Math.round(sh[k] * 100)} % of the score`; });
  };
  const set = (w) => { cur = toSlider(w); keys.forEach((k) => { const el = root.querySelector(`#${id}-${k}`); if (el) el.value = Math.round(cur[k]); }); paint(); onChange(shares()); };
  keys.forEach((k) => root.querySelector(`#${id}-${k}`).addEventListener('calciteSliderInput', (e) => { cur[k] = +e.target.value; paint(); onChange(shares()); }));
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { const p = presets[b.dataset.preset]; set(p ? p(keys) : defaults); }));
  paint();
  return { get: shares, set };
}
