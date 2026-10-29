# Pune: what the indicators mean

Mode: **descriptive** — subject: **Phoenix Marketcity**. Land cover 2019–2025 (start = [2019, 2020], latest = [2024, 2025]); forecast 2025 → 2028.

Descriptive mode profiles one mall's area. There is **no composite score and no ranking of malls**; other malls appear only as context.

## Per hexagon — land cover and growth

| Indicator | Field | Unit | What it means | How it is calculated |
|---|---|---|---|---|
| **Built-up share (year)** | `bu_<year>` | % of hex | How much of the hexagon is built up in that year. | Pixels classified "Built area" / all valid pixels in the hexagon (clouds and no-data excluded). |
| **Land-use mix (year)** | `mix_<year>` | 0-1 | How mixed the land cover is: 0 = one cover type only, 1 = all eight types in equal parts. | Shannon entropy of the 8 land-cover class shares, divided by ln 8. |
| **Built-up share, start** | `bu_early` | % of hex | Built-up share at the start of the study period. | Mean of the first two years (config lulc.early). |
| **Built-up share, latest** | `bu_late` | % of hex | Built-up share now. | Mean of the last two years (config lulc.late). |
| **Built-up growth** | `built_change_pp` | percentage points | How much the built-up share rose over the study period. | bu_late - bu_early, in percentage points. |
| **Built-up trend** | `built_trend_pp_yr` | pp per year | Typical yearly rise of the built-up share, robust to single odd years. | Theil-Sen slope (median of all pairwise yearly slopes) of the yearly built-up share. |
| **Land-use mix change** | `mix_change` | 0-1 | Negative = the area is becoming more uniform (e.g. farmland turning into continuous city). | mix_late - mix_early (same two-year means as built-up). |
| **Open land left** | `open_land` | % of hex | Share of the hexagon that is neither built up nor water in the latest year - room left to build. | 1 - built share - water share (latest year). |
| **Neighbour growth, ring k** | `ring<k>_change_pp` | percentage points | Average built-up growth of the hexagons exactly k steps away (ring 1 = the 6 touching hexes; at H3 level 8 rings 1-4 lie on average about 0.9 / 1.7 / 2.5 / 3.3 km away). | Mean of built_change_pp over the ring-k hexagons. |
| **Neighbourhood growth pull** | `growth_pull_pp` | percentage points | How strongly the surroundings (rings 1-4, closest counting most) are building up. | Weighted mean of ring 1..4 growth with weights 1, 1/2, 1/3, 1/4. |
| **Growth hotspot score** | `hotspot_z` | z-score | Is this hexagon part of a statistically unusual cluster of fast (positive) or slow (negative) growth? | Getis-Ord Gi* of built_change_pp over the hexagon and its rings 1-2 (same statistic as Pro's Hot Spot Analysis; no FDR correction). |
| **Growth hotspot class** | `hotspot_bin` | -3..3 | 3 / 2 / 1 = growth hot spot at 99 / 95 / 90 % confidence, negative = cold spot, 0 = not significant. | |z| >= 2.576 / 1.960 / 1.645, as Pro's Gi_Bin field. |
| **Newly built-up area** | `new_built_share` | % of hex | Land that became built up between the start and the latest years (built in both latest years, in neither start year). | 30 m cells, patches under 2 cells dropped as noise. |
| **Type of new built-up** | `infill_km2 / edge_km2 / leapfrog_km2` | km2 | Infill fills gaps inside existing built-up; edge extends it outward; leapfrog is detached new development (sprawl). | Landscape Expansion Index (Liu et al. 2010): share of the one-cell ring around each new patch that was already built: >50 % infill, >0 edge, 0 leapfrog. |
| **Growth type** | `growth_type` | class | One-word summary of what is happening in the hexagon. | If new built-up >= grow_pp % of the hex: its dominant type (Infill / Edge / Leapfrog growth). Otherwise: "Growth frontier" when growth pull >= frontier_pp and open land >= open_min; else "Built-up, stable" (built share >= built_core) or "Open land, stable". |
| **Forecast built-up growth** | `fc_gain_pp` | percentage points | Expected rise of the built-up share over the next few years if recent patterns continue. | Gradient-boosted model trained on past hex transitions: own built-up share and recent change, land-use mix, open-land types, rings 1-4 built-up and change, distances to malls, centre, roads, rail. No population data is used. |
| **Forecast range** | `fc_low_pp / fc_high_pp` | percentage points | Likely low and high end of the forecast (10th and 90th percentile models). | Quantile gradient-boosting models, same inputs. |
| **Population** | `pop` | people | Residents in the hexagon (Business Analyst current year). | TOTPOP_CY. |
| **Purchasing power** | `spend` | INR | Total purchasing power of residents. Treat with caution: modelled values can be unrealistic in special areas such as cantonments. | PP_CY. |
| **Projected population growth** | `pop_growth_proj` | % | Shown for information only; NOT used in any score (the projections are close to linear). | TOT_P_2030 / TOT_P_2026 - 1. |
| **Distance to nearest mall** | `dist_mall_km` | km | Straight-line distance to the nearest listed mall. | Hex centroid to mall point. |
| **Malls within 15 minutes** | `n_malls_15min` | count | How many listed malls can reach this hexagon within a 15-minute drive. | Hex centroid inside each mall's 15-min polygon. |
| **Mall gap** | `gap` | 0-1 | Distance to the nearest mall, capped at 8 km; cut to 30 % if the hexagon is already inside some mall's 15-minute area. | min(dist, 8) / 8 x (0.3 if covered). |
| **Transit access** | `transit` | weighted stops | Bus stops plus rail/metro stations within 1 km (a station counts 5). | Sum of stop weights within 1 km of the hex centroid. |
| **Excluded area** | `excluded` | yes/no | Hexagons ruled out for a new mall (military land, cantonment, or areas you excluded). | >= min_overlap of the hex area inside an exclusion polygon, or listed in exclude.hex_ids. |
| **Land-use mix, start / latest** | `mix_early / mix_late` | 0-1 | Land-use mix averaged over the start / latest two years. | Mean of mix_<year>. |
| **Land-cover class shares (latest year)** | `crops_late / rangeland_late / trees_late / bare_late / water_late` | share | What the hexagon is made of in the latest year besides built-up. | Class pixels / valid pixels. |
| **Neighbour built-up share, ring k** | `ring<k>_built_late` | share | How built up the ring-k neighbours are now. | Mean of bu_late over the ring-k hexagons. |
| **Forecast built-up share** | `fc_built_share` | share | Built-up share expected at the end of the forecast horizon. | Latest (two-year mean) built-up share + fc_gain_pp. |
| **Newly built-up area** | `new_km2` | km2 | Area that became built up (sum of infill, edge and leapfrog). | infill_km2 + edge_km2 + leapfrog_km2. |
| **Hexagon area** | `hex_km2` | km2 | Area of the hexagon. | Polygon area in the metric CRS. |
| **Land-cover data coverage** | `valid_share` | share | Lowest share of valid (not cloud / no-data) pixels over the years; below 0.5 a year is left blank, below 0.7 the hexagon is not scored. | Valid pixels / all pixels, minimum over years. |
| **Why excluded** | `exclude_reason` | text | Military land (OSM), cantonment (OSM), your exclude.geojson or your hex id list. | First rule that matched. |
| **Nearest mall** | `nearest_mall` | name | Name of the nearest listed mall. | - |

## Around the focus point

| Indicator | Field | Unit | What it means | How it is calculated |
|---|---|---|---|---|
| **Built-up reach by direction** | `edge_km` | km | How far, in each of 8 compass directions, the continuous built-up area stretches from the focus point (subject mall or city centre) before it drops below 50 %. | Built-up share of 2 km distance bands within each 45-degree sector, crossing point of 50 % interpolated; "beyond" = still above 50 % at the edge of the study area. |

## Per hexagon — opportunity score and its parts

| Indicator | Field | Unit | What it means | How it is calculated |
|---|---|---|---|---|
| **Opportunity score** | `opportunity` | 0-100 | Where a new mall would find people, growth and few competitors. Only for hexagons that are already somewhat urban, populated and not excluded. | Weighted mean of percentiles among eligible hexagons: people, spending, built-up growth (observed), forecast growth, neighbourhood pull, mall gap, transit. Weights are the sliders in the app. |
| **People** | `s_people` | percentile | Population of the hexagon. | Percentile of pop. |
| **Spending power** | `s_spending` | percentile | Purchasing power (low default weight - see caveat). | Percentile of spend. |
| **Recent built-up growth** | `s_growth_now` | percentile | Observed growth over the study period. | Percentile of built_change_pp. |
| **Forecast growth** | `s_growth_next` | percentile | Expected growth over the forecast horizon. | Percentile of fc_gain_pp. |
| **Neighbourhood pull** | `s_pull` | percentile | Growth in the surrounding rings. | Percentile of growth_pull_pp. |
| **Mall gap** | `s_gap` | percentile | Distance from existing malls. | Percentile of gap. |
| **Transit** | `s_transit` | percentile | Public-transport access. | Percentile of transit. |
| **Eligible for the opportunity score** | `eligible` | yes/no | Built-up >= 20 %, population >= 1,500, data coverage >= 0.7 and not excluded (defaults; see city.yaml eligibility). | All rules true. |

## Per mall — inside its 15-minute drive area

| Indicator | Field | Unit | What it means | How it is calculated |
|---|---|---|---|---|
| **People within 15 min** | `pop` | people | Residents of the hexagons inside the mall's 15-minute drive area. | Sum of hex pop (hex centroid inside the polygon). |
| **Purchasing power per person** | `spend_pc` | INR | Average purchasing power of those residents. | Sum of spend / sum of pop. |
| **Shared catchment** | `overlap_share` | % | Share of the mall's 15-minute population that another listed mall can also reach in 15 minutes. | Population of hexes also inside another mall's polygon / pop. |
| **Nearest other mall** | `nearest_other_km` | km | Straight-line distance to the closest other listed mall. | - |
| **Brand outlets per 100k people** | `brand_per_100k` | outlets | Stand-alone outlets of the malls' tenant brands in the 15-minute area, per 100,000 residents. | POIs matched to tenant brands by name, inside the polygon / (pop / 100,000). |
| **Built-up share now (catchment)** | `built_late` | % | How built up the 15-minute area is. | Mean of bu_late over its hexagons. |
| **Built-up growth (catchment)** | `built_change_pp` | pp | Rise of the built-up share in the 15-minute area over the study period. | Mean of hex built_change_pp. |
| **Forecast growth (catchment)** | `fc_gain_pp` | pp | Expected further rise over the forecast horizon. | Mean of hex fc_gain_pp. |
| **Growth hotspot share** | `hot_share` | % | Share of the 15-minute area's hexagons that are growth hot spots (95 % confidence or more). | hotspot_bin >= 2. |
| **Tenant mix score (absolute)** | `A_abs` | 0-100 | Quality of the mall's own tenant mix on a fixed scale (not compared with other malls). | 100 x (0.30 category variety + 0.25 rating quality + 0.25 premium share + 0.20 anchor coverage). Variety = entropy of category-group shares / ln(9 groups); premium share scores 100 at 30 % premium brands; anchors = share of 6 anchor types present (department store, supermarket, electronics, entertainment, food court, luxury); rating quality = Bayesian-shrunk star rating, used only if at least 30 % of every listed mall's stores have ratings, otherwise its weight is shared out among the other three. |
| **Purchasing power (catchment)** | `spend` | INR | Total purchasing power of the residents of the 15-minute area. | Sum of hex spend. |
| **Population density** | `density` | people per km2 | Residents per km2 of the 15-minute area. | pop / (hexagons x hexagon area). |
| **Transit access (catchment)** | `transit` | weighted stops | Average transit access of the hexagons in the 15-minute area. | Mean of hex transit. |
| **Other malls per hexagon** | `other_malls_per_hex` | count | On average, how many other listed malls also reach each hexagon of the 15-minute area. | Mean over hexagons of (malls reaching it - 1). |
| **Brand outlets in catchment** | `brand_outlets` | count | Stand-alone outlets of the tenant brands inside the 15-minute area. | POIs inside the polygon. |
| **Neighbourhood growth pull (catchment)** | `growth_pull_pp` | pp | Average neighbourhood growth pull of the hexagons in the 15-minute area. | Mean of hex growth_pull_pp. |
| **Excluded share of catchment** | `excluded_share` | share | Share of the 15-minute area's hexagons that are excluded areas (military land, cantonment ...). | Mean of hex excluded. |
| **Growth-type mix of the catchment** | `gt_infill / gt_edge / gt_leapfrog / gt_growth / gt_built_up / gt_open` | share | Share of the 15-minute area's hexagons by growth type (growth = growth frontier, built_up = built-up stable, open = open land stable). | Counts of growth_type / hexagons. |
| **Hexagons in catchment** | `n_hex` | count | Number of hexagons whose centre lies in the 15-minute area. | - |

## Weights used in this run

Opportunity score: people 20 %, spending 10 %, growth_now 15 %, growth_next 15 %, pull 10 %, gap 20 %, transit 10 %

## Data sources

* Land cover: Esri Sentinel-2 10 m Land Use/Land Cover, one raster per year.
* Population, purchasing power: Esri Business Analyst (offline) enrichment in ArcGIS Pro.
* Drive-time areas: ArcGIS Pro Network Analyst (local network dataset).
* Brand outlets: Esri Business Analyst POIs (your JSON export).
* Transit, roads, military land / cantonments, unlisted malls: OpenStreetMap.