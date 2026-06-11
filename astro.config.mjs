// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Update this once the production domain is known (used for canonical URLs).
  site: 'https://yavadeus.dev',
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: {
      // FR is served at "/", EN at "/en/". No redirect on the default locale.
      prefixDefaultLocale: false,
    },
  },
});
