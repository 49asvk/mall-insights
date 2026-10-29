// Must run BEFORE any Calcite component is imported, otherwise components fetch icons/translations from the wrong place.
import { setAssetPath } from '@esri/calcite-components';
import { CONFIG } from './config.js';
setAssetPath(new URL(CONFIG.base + 'calcite-assets/', document.baseURI).href);
