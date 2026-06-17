import { defineConfig } from 'astro/config';

import { SITE_URL } from './src/config';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL, // from .env (SITE_URL); used for canonical URLs
  i18n: {
    defaultLocale: 'fr',
    // `lo` (Lorrain, a gag locale) is served at "/lorrain/"; its code stays
    // `lo` while the path avoids colliding with the real ISO `lo` (Lao).
    locales: ['fr', 'en', { path: 'lorrain', codes: ['lo'] }],
    routing: {
      // FR is served at "/", EN at "/en/". No redirect on the default locale.
      prefixDefaultLocale: false,
    },
  },
});
