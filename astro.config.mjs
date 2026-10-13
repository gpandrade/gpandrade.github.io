// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site on GitHub Pages: served at the root, so no `base`.
export default defineConfig({
  site: 'https://gpandrade.github.io',
  integrations: [sitemap()],
  build: {
    // One small stylesheet; inline it so the first paint needs no second request.
    inlineStylesheets: 'always',
  },
});
