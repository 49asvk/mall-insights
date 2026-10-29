// Usage (one or several cities):
//   npm run sync-data -- "D:\...\cities\hyderabad\data\processed\dashboard" "D:\...\cities\pune\data\processed\dashboard"
// Each dashboard folder (written by notebook 08) is copied to public/data/<slug>/ and public/data/cities.json is refreshed.
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dirs = process.argv.slice(2).filter(Boolean);
if (!dirs.length) { console.error('Give the path(s) to the dashboard folder(s) written by notebook 08 (cities/<city>/data/processed/dashboard).'); process.exit(1); }
mkdirSync('public/data', { recursive: true });
const idxPath = 'public/data/cities.json';
let cities = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, 'utf8')) : [];
for (const src of dirs) {
  if (!existsSync(join(src, 'city.json'))) { console.error('No city.json in', src, '- run notebook 08 first.'); process.exit(1); }
  const city = JSON.parse(readFileSync(join(src, 'city.json'), 'utf8'));
  const dst = join('public/data', city.slug); mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(src)) { if (/\.(json|geojson|md)$/.test(f)) { cpSync(join(src, f), join(dst, f)); } }
  for (const f of ['hexes.geojson', 'malls.json', 'opportunity.json', 'dynamics_summary.json', 'landcover_rings.json', 'definitions.json', 'mall_sa15.geojson'])
    if (!existsSync(join(dst, f))) console.warn(city.slug + ': REQUIRED file missing:', f);
  cities = cities.filter((c) => c.slug !== city.slug).concat([{ slug: city.slug, name: city.name, mode: city.mode, subject: city.subject, synthetic: !!city.synthetic }]);
  console.log(city.slug, '->', dst);
}
cities.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(idxPath, JSON.stringify(cities, null, 1)); console.log('cities.json ->', cities.map((c) => c.slug).join(', '));
