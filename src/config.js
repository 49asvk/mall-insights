export const CONFIG = {
  title: 'Mall Insights',
  basemap: import.meta.env.VITE_BASEMAP || (import.meta.env.VITE_ARCGIS_API_KEY ? 'arcgis' : 'osm'),
  arcgisStyleLight: 'arcgis/light-gray',
  arcgisStyleDark: 'arcgis/dark-gray',
  apiKey: import.meta.env.VITE_ARCGIS_API_KEY || '',
  zoom: 11,
  base: import.meta.env.BASE_URL,
  dataPath: import.meta.env.BASE_URL + 'data/',
};
