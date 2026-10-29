import { defineConfig } from 'vite';
// base './' lets the built site run from any sub-path (e.g. GitHub Pages /mall-insights/)
// cssTarget 'esnext' keeps Calcite's native light-dark() colour tokens (otherwise they get down-levelled and break)
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 6000, cssTarget: 'esnext' } });
