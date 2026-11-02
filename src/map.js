import esriConfig from '@arcgis/core/config.js';
import Map from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer.js';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js';
import Basemap from '@arcgis/core/Basemap.js';
import Graphic from '@arcgis/core/Graphic.js';
import Polygon from '@arcgis/core/geometry/Polygon.js';
import Polyline from '@arcgis/core/geometry/Polyline.js';
import Point from '@arcgis/core/geometry/Point.js';
import PopupTemplate from '@arcgis/core/PopupTemplate.js';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js';
import { CONFIG } from './config.js';

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const RAMPS = {
  blues: ['#e8f1fb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
  heat: ['#fff5d6', '#fde3a7', '#fbc37a', '#f59a52', '#ea6c35', '#d24527', '#a82a1f', '#741a16'],
  magma: ['#fcfdbf', '#feca8d', '#fd9668', '#f1605d', '#cd4071', '#9e2f7f', '#721f81', '#3b0f70'],
  viridis: ['#fde725', '#b5de2b', '#6ece58', '#35b779', '#1f9e89', '#26828e', '#31688e', '#3e4989'],
  greys: ['#f4f4f0', '#dcdcd6', '#bfbfb8', '#a1a19a', '#83837d', '#666661', '#4a4a46', '#2e2e2b'],
  mix: ['#f7fcf5', '#dff2d8', '#bde5b5', '#94d391', '#64bb6e', '#38a055', '#17823d', '#00602b'],
  diverging: ['#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b'],
};
export const rampCss = (name) => 'linear-gradient(90deg,' + RAMPS[name].join(',') + ')';
function rampColor(name, t) {
  const R = RAMPS[name].map(hex2rgb); t = Math.max(0, Math.min(1, t));
  const x = t * (R.length - 1), i = Math.min(R.length - 2, Math.floor(x)), f = x - i;
  return R[i].map((c, k) => Math.round(c + (R[i + 1][k] - c) * f));
}
export const GT_COLORS = { 'Infill growth': '#2a78d6', 'Edge growth': '#eb6834', 'Leapfrog growth': '#c02a2a', 'Growth frontier': '#eda100',
  'Built-up, stable': '#8a8a85', 'Open land, stable': '#e4e3de', 'No data': '#ffffff' };
export const HS_COLORS = { 3: '#b2182b', 2: '#d6604d', 1: '#f4a582', 0: '#ecebe7', '-1': '#92c5de', '-2': '#4393c3', '-3': '#2166ac' };
export const HS_LABELS = { 3: 'Hot spot, 99 %', 2: 'Hot spot, 95 %', 1: 'Hot spot, 90 %', 0: 'Not significant', '-1': 'Cold spot, 90 %', '-2': 'Cold spot, 95 %', '-3': 'Cold spot, 99 %' };

const abs = (p) => new URL(p, document.baseURI).href;
const rings = (geom) => (geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat());
const polygon = (geom) => new Polygon({ rings: rings(geom), spatialReference: { wkid: 4326 } });
const zoomToScale = (z) => 591657527.591555 / 2 ** z;

export async function createMap({ container, data, handlers }) {
  esriConfig.assetsPath = abs(CONFIG.base + 'arcgis-assets');
  let basemap = null;
  if (CONFIG.basemap === 'arcgis') { esriConfig.apiKey = CONFIG.apiKey; basemap = CONFIG.arcgisStyleLight; }
  else if (CONFIG.basemap === 'osm') basemap = new Basemap({ baseLayers: [new WebTileLayer({ urlTemplate: 'https://tile.openstreetmap.org/{level}/{col}/{row}.png', copyright: '© OpenStreetMap contributors', title: 'Basemap' })] });
  const hexL = new GraphicsLayer({ title: 'Hexagons' }), exclL = new GraphicsLayer({ title: 'Excluded areas', visible: false }),
    saAll = new GraphicsLayer({ title: '15-min areas', visible: false }), saSel = new GraphicsLayer({ title: '15-min area' }),
    edgeL = new GraphicsLayer({ title: 'Built-up reach', visible: false }), mallsL = new GraphicsLayer({ title: 'Malls' }),
    candL = new GraphicsLayer({ title: 'Candidates', visible: false }), watchL = new GraphicsLayer({ title: 'Watchlist', visible: false }), selL = new GraphicsLayer({ title: 'Selection' });
  const map = new Map({ basemap, layers: [hexL, exclL, saAll, saSel, edgeL, watchL, mallsL, candL, selL] });
  const view = new MapView({ container, map, center: data.city.center, scale: zoomToScale(CONFIG.zoom), constraints: { minZoom: 8 },
    popup: { dockEnabled: false, collapseEnabled: false, viewModel: { includeDefaultActions: false } } });
  view.ui.move('zoom', 'top-right');
  if (!basemap) view.background = { color: [238, 238, 234] };

  // ---- hexes: symbol cache keyed by colour
  const symCache = new globalThis.Map();
  const sym = (rgb, a = 0.82) => { const k = rgb.join(',') + a; if (!symCache.has(k)) symCache.set(k, new SimpleFillSymbol({ color: [...rgb, a], outline: { color: [255, 255, 255, 0.25], width: 0.25 } })); return symCache.get(k); };
  const dim = new SimpleFillSymbol({ color: [150, 150, 150, 0.08], outline: { color: [255, 255, 255, 0.12], width: 0.2 } });
  const hexTpl = new PopupTemplate({ title: (e) => handlers.hexTitle(e.graphic.attributes.i), content: (e) => handlers.hexPopup(e.graphic.attributes.i), outFields: ['*'] });
  const hexG = data.hexes.map((h) => new Graphic({ geometry: polygon(h.geometry), attributes: { i: h.i }, symbol: dim, popupTemplate: hexTpl }));
  hexL.addMany(hexG);
  function setHexValues(values, { ramp = 'blues', domain, opacity = 0.82 } = {}) {
    let [lo, hi] = domain || [Math.min(...values.filter(Number.isFinite)), Math.max(...values.filter(Number.isFinite))];
    const span = hi - lo || 1, steps = 40;
    hexG.forEach((g, k) => { const v = values[k]; g.symbol = Number.isFinite(v) ? sym(rampColor(ramp, Math.round(((v - lo) / span) * steps) / steps), opacity) : dim; });
  }
  function setHexCategories(cats, colors) {
    hexG.forEach((g, k) => { const c = colors[cats[k]]; g.symbol = c ? sym(hex2rgb(c), 0.85) : dim; });
  }

  // ---- exclusions (hatched)
  (data.exclusions?.features || []).forEach((f) => exclL.add(new Graphic({ geometry: polygon(f.geometry), attributes: { name: f.properties.name, kind: f.properties.kind },
    symbol: { type: 'simple-fill', style: 'backward-diagonal', color: [192, 42, 42, 0.9], outline: { color: [192, 42, 42, 0.9], width: 1.2 } },
    popupTemplate: { title: 'Excluded: {kind}', content: '{name}' } })));

  // ---- 15-min areas
  const saG = data.sa.map((s) => ({ id: s.id, geom: polygon(s.geometry) }));
  saAll.addMany(saG.map((s) => new Graphic({ geometry: s.geom, symbol: { type: 'simple-fill', color: [0, 0, 0, 0], outline: { color: [90, 90, 90, 0.5], width: 0.8 } } })));
  function showSA(id) { saSel.removeAll(); const s = saG.find((x) => x.id === id); if (s) saSel.add(new Graphic({ geometry: s.geom, symbol: { type: 'simple-fill', color: [42, 120, 214, 0.06], outline: { color: [42, 120, 214, 1], width: 2 } } })); }

  // ---- malls
  const mallTpl = new PopupTemplate({ title: '{name}', content: (e) => handlers.mallPopup(e.graphic.attributes.id) });
  function setMalls(malls, sizeKey) {
    mallsL.removeAll();
    malls.forEach((m) => {
      const subj = m.role === 'subject', chk = false, size = subj ? 18 : sizeKey ? 8 + (m[sizeKey] / 100) * 8 : 9;
      const s = subj ? new SimpleMarkerSymbol({ style: 'diamond', size, color: '#2a78d6', outline: { color: 'white', width: 2 } })
        : new SimpleMarkerSymbol({ style: 'circle', size, color: chk ? [255, 255, 255, 0.92] : [58, 58, 56, 0.95], outline: { color: chk ? [82, 81, 78, 1] : 'white', width: chk ? 1.6 : 1.2 } });
      mallsL.add(new Graphic({ geometry: new Point({ longitude: m.lon, latitude: m.lat }), attributes: { id: m.id, name: m.name }, symbol: s, popupTemplate: mallTpl }));
    });
  }
  function selectMall(m) { selL.graphics.filter((g) => g.attributes?.mallsel).forEach((g) => selL.remove(g)); if (m) selL.add(new Graphic({ geometry: new Point({ longitude: m.lon, latitude: m.lat }), attributes: { mallsel: 1 }, symbol: new SimpleMarkerSymbol({ style: 'circle', size: 28, color: [0, 0, 0, 0], outline: { color: '#2a78d6', width: 2.5 } }) })); showSA(m?.id); }

  // ---- candidates / watchlist
  const starUrl = (n) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="-17 -17 34 34"><path d="M0,-15 L4.4,-4.6 15,-4.6 6.6,2.2 9.6,13 0,7.2 -9.6,13 -6.6,2.2 -15,-4.6 -4.4,-4.6Z" fill="#eb6834" stroke="white" stroke-width="2" stroke-linejoin="round"/><text y="4.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="11" fill="white">${n}</text></svg>`);
  function setCandidates(list) { candL.removeAll(); list.forEach((c, k) => candL.add(new Graphic({ geometry: new Point({ longitude: c.hex.cx, latitude: c.hex.cy }), attributes: { cand: k }, symbol: new PictureMarkerSymbol({ url: starUrl(k + 1), width: 30, height: 30 }) }))); }
  function setWatchlist(list) { watchL.removeAll(); list.forEach((w) => watchL.add(new Graphic({ geometry: new Point({ longitude: w.lon, latitude: w.lat }), symbol: new SimpleMarkerSymbol({ style: 'x', size: 11, color: '#eb6834', outline: { color: '#eb6834', width: 2.2 } }) }))); }

  // ---- built-up reach rays from the focus point
  function setEdges(rows, focus) {
    edgeL.removeAll();
    const ang = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 }, kx = 111.32 * Math.cos((focus.lat * Math.PI) / 180), ky = 110.57;
    rows.forEach((r) => {
      if (!Number.isFinite(r.edge_km)) return;
      const a = (ang[r.sector] * Math.PI) / 180, x = focus.lon + (r.edge_km * Math.sin(a)) / kx, y = focus.lat + (r.edge_km * Math.cos(a)) / ky;
      edgeL.add(new Graphic({ geometry: new Polyline({ paths: [[[focus.lon, focus.lat], [x, y]]], spatialReference: { wkid: 4326 } }), symbol: { type: 'simple-line', color: r.color, width: r.width || 3, cap: 'round' } }));
      edgeL.add(new Graphic({ geometry: new Point({ longitude: x, latitude: y }), symbol: { type: 'simple-marker', size: 7, color: r.color, outline: { color: 'white', width: 1 } } }));
    });
    edgeL.add(new Graphic({ geometry: new Point({ longitude: focus.lon, latitude: focus.lat }), symbol: { type: 'simple-marker', style: 'cross', size: 12, outline: { color: '#151515', width: 2 } } }));
  }
  function highlightHex(i) {
    selL.graphics.filter((g) => g.attributes?.hl).forEach((g) => selL.remove(g));
    if (i == null) return;
    selL.add(new Graphic({ geometry: polygon(data.hexes[i].geometry), attributes: { hl: 1 }, symbol: { type: 'simple-fill', color: [0, 0, 0, 0], outline: { color: '#eb6834', width: 3 } } }));
  }
  function showRings(i, ringIdx) {   // ringIdx: array of arrays of hex positions, ring 1..K
    selL.graphics.filter((g) => g.attributes?.ring).forEach((g) => selL.remove(g));
    if (i == null || !ringIdx) return;
    ringIdx.forEach((arr, k) => arr.forEach((j) => selL.add(new Graphic({ geometry: polygon(data.hexes[j].geometry), attributes: { ring: k + 1 },
      symbol: { type: 'simple-fill', color: [0, 0, 0, 0], outline: { color: [21, 21, 21, 0.9 - k * 0.18], width: 1.2, style: k % 2 ? 'dash' : 'solid' } } }))));
  }
  const optional = {};
  function setLayerVisible(key, on) {
    const L = { hex: hexL, saAll, cand: candL, watch: watchL, malls: mallsL, excl: exclL, edge: edgeL }[key];
    if (L) { L.visible = on; return; }
    const cfg = { transit: ['transit.geojson', { type: 'simple', symbol: { type: 'simple-marker', size: 4, color: [57, 135, 229, 0.8], outline: { width: 0 } } }, 'Transit stops'],
      brands: ['brand_outlets.geojson', { type: 'simple', symbol: { type: 'simple-marker', style: 'square', size: 6, color: [232, 123, 164, 0.9], outline: { color: 'white', width: 0.6 } } }, 'Brand outlets'] }[key];
    if (!cfg) return;
    if (!optional[key]) { optional[key] = new GeoJSONLayer({ url: abs(CONFIG.dataPath + data.city.slug + '/' + cfg[0]), renderer: cfg[1], title: cfg[2], popupTemplate: { title: '{name}' } }); map.add(optional[key], 6); }
    optional[key].visible = on;
  }
  view.on('click', async (e) => {
    const hit = await view.hitTest(e, { include: [mallsL, candL, hexL] });
    const r = hit.results.find((x) => x.graphic?.attributes);
    const a = r?.graphic.attributes || {};
    if (a.id) handlers.onMall(a.id); else if (a.cand !== undefined) handlers.onCand(a.cand); else if (a.i !== undefined) handlers.onHex(a.i);
  });
  await view.when();
  return { view, setHexValues, setHexCategories, setMalls, selectMall, setCandidates, setWatchlist, setEdges, highlightHex, showRings, setLayerVisible,
    goTo: (lon, lat, zoom = 13) => view.goTo({ center: [lon, lat], scale: zoomToScale(zoom) }, { duration: 700 }),
    setPadding: (left) => { view.padding = { left }; }, closePopup: () => view.closePopup?.(),
    setBasemapStyle(style) { if (CONFIG.basemap === 'arcgis') map.basemap = style; },
    setTheme(dark) { if (CONFIG.basemap === 'arcgis' && /light-gray|dark-gray/.test(map.basemap?.style?.id || map.basemap?.id || 'light-gray')) map.basemap = dark ? CONFIG.arcgisStyleDark : CONFIG.arcgisStyleLight; } };
}
