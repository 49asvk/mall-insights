const nf = new Intl.NumberFormat('en-IN');
export const int = (v) => (Number.isFinite(v) ? nf.format(Math.round(v)) : '–');
export const dec = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
export const pct = (v, d = 0) => (Number.isFinite(v) ? (v * 100).toFixed(d) + '%' : '–');
export const inr = (v) => {
  if (!Number.isFinite(v)) return '–';
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(v >= 1e9 ? 0 : 1) + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + ' L';
  return '₹' + nf.format(Math.round(v));
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const short = (name) => name.replace(/\s*\(.*?\)\s*/g, '').replace(/ Mall$/, '');
export const compact = (v) => (!Number.isFinite(v) ? '–' : v >= 1e7 ? (v / 1e7).toFixed(1) + ' Cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : String(Math.round(v)));
