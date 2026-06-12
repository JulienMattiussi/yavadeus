import { defineConfig } from 'astro/config';

import { SITE_URL } from './src/config';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL, // from .env (SITE_URL); used for canonical URLs
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: {
      // FR is served at "/", EN at "/en/". No redirect on the default locale.
      prefixDefaultLocale: false,
    },
  },
});
