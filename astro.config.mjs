import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  site: 'https://www.dobbo.ca',
  base: '/valheim/',
  outDir: './dist/valheim',
  trailingSlash: 'always',
  integrations: [solid()],
});
