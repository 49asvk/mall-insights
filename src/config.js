// Central place to tweak the app. Environment overrides: create a .env file with VITE_BASEMAP=arcgis and VITE_ARCGIS_API_KEY=...
export const CONFIG = {
  title: 'Mall Insights',
  // 'osm'    -> OpenStreetMap raster tiles (no Esri credits; fine for demos, mind OSM's tile usage policy)
  // 'arcgis' -> ArcGIS basemap style below (needs an API key; basemap tiles are the only thing that touches Esri's cloud)
  // 'none'   -> blank background
  basemap: import.meta.env.VITE_BASEMAP || 'osm',
  arcgisStyleLight: 'arcgis/light-gray',
  arcgisStyleDark: 'arcgis/dark-gray',
  apiKey: import.meta.env.VITE_ARCGIS_API_KEY || '',
  zoom: 11,
  base: import.meta.env.BASE_URL,
  dataPath: import.meta.env.BASE_URL + 'data/',
};
