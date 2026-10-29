# Mall Insights web app

Vite + ArcGIS Maps SDK for JavaScript 5.1 + Calcite 5.2. All scores are recomputed in the browser from static files: **no Esri online services, no credits** (the default basemap is OpenStreetMap tiles; set `VITE_BASEMAP=arcgis` + `VITE_ARCGIS_API_KEY` for an Esri basemap, or `none`).

```bash
# Node 20.19+ or 22.12+
npm install                                   # also copies the Calcite / ArcGIS assets into public/ (self-hosted)
npm run sync-data -- ../cities/pune/data/processed/dashboard ../cities/hyderabad/data/processed/dashboard
npm run dev                                   # http://localhost:5173  (?city=pune / ?city=hyderabad)
npm run build && npm run preview              # static site in dist/ (any web server, GitHub Pages ...)
```

The tabs follow the city's **mode**:

| Descriptive (Pune) | Predictive (Hyderabad) | What it does |
|---|---|---|
| *Phoenix Marketcity* | *Ranking* | profile of the subject's 15-min area vs the other malls' median — **or** the ranking with explained weight sliders, rank changes vs default (▲▼) and rank stability |
| Land cover | Land cover | per-hexagon built-up share / land-use mix, year slider and **Play**; mall drive-time areas and distance rings over time |
| Growth | Growth | growth, neighbourhood pull, hotspots, growth type, forecast; click a hexagon to see its rings 1–4; built-up reach by direction (radar + map rays); how far to trust the forecast |
| Opportunity | Next mall | opportunity score with explained sliders and presets, exclusions on/off, rules, candidate zones, watchlist |
| Definitions | Definitions | every indicator in one or two lines, searchable |

**Sliders** say what each ingredient measures and what raising it favours; the live share of the total is shown next to each and as a coloured bar (always 100 %). Presets (*Default*, *Equal*, *Growth first* …) and the ▲▼ markers make the effect of a change visible at once.
