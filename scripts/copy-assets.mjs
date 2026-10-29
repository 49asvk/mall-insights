// Copies Calcite + ArcGIS runtime assets into /public so the app is fully self-hosted (no CDN needed at runtime).
// Non-English translation files are dropped to keep the deployed site small (~35 MB instead of ~110 MB).
import { cpSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
const jobs = [
  ['node_modules/@esri/calcite-components/dist/cdn/assets', 'public/calcite-assets/assets'],
  ['node_modules/@arcgis/core/assets', 'public/arcgis-assets'],
];
const LOCALE = /(?:_|\.)([a-z]{2}(?:-[a-z]{2,4})?)\.json$/i;
function prune(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { prune(p); continue; }
    const m = f.match(LOCALE);
    if (m && !/^en(-us)?$/i.test(m[1]) && /(t9n|messages|basemaps|_[a-z]{2}\.json)/i.test(p)) rmSync(p);
  }
}
for (const [src, dst] of jobs) {
  if (!existsSync(src)) { console.warn('skip (not found):', src); continue; }
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  prune(dst);
  console.log('copied', src, '->', dst);
}
