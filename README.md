# Mall Insights web app

Vite + ArcGIS Maps SDK for JavaScript 5.1 + Calcite 5.2.

The tabs follow the city's **mode**:

| Descriptive (Pune) | Predictive (Hyderabad) | What it does |
|---|---|---|
| *Phoenix Marketcity* | *Ranking* | profile of the subject's 15-min area vs the other malls' median — **or** the ranking with explained weight sliders, rank changes vs default (▲▼) and rank stability |
| Land cover | Land cover | per-hexagon built-up share / land-use mix, year slider and **Play**; mall drive-time areas and distance rings over time |
| Growth | Growth | growth, neighbourhood pull, hotspots, growth type, forecast; click a hexagon to see its rings 1–4; built-up reach by direction (radar + map rays); how far to trust the forecast |
| Opportunity | Next mall | opportunity score with explained sliders and presets, exclusions on/off, rules, candidate zones, watchlist |
| Definitions | Definitions | every indicator in one or two lines, searchable |

**Sliders** say what each ingredient measures and what raising it favours; the live share of the total is shown next to each and as a coloured bar (always 100 %). Presets (*Default*, *Equal*, *Growth first* …) and the ▲▼ markers make the effect of a change visible at once.
