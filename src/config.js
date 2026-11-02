export const CONFIG = {
  title: 'Mall Insights',
  basemap: import.meta.env.VITE_BASEMAP || (import.meta.env.VITE_ARCGIS_API_KEY ? 'arcgis' : 'osm'),
  arcgisStyleLight: import.meta.env.VITE_BASEMAP_STYLE || 'arcgis/light-gray',
  basemapChoices: [['arcgis/light-gray', 'Light gray canvas'], ['arcgis/dark-gray', 'Dark gray canvas'], ['arcgis/streets', 'Streets'], ['arcgis/topographic', 'Topographic'], ['arcgis/navigation', 'Navigation'], ['arcgis/imagery', 'Imagery'], ['arcgis/outdoor', 'Outdoor']],
  arcgisStyleDark: 'arcgis/dark-gray',
  apiKey: import.meta.env.VITE_ARCGIS_API_KEY || '',
  zoom: 11,
  base: import.meta.env.BASE_URL,
  dataPath: import.meta.env.BASE_URL + 'data/',
};
