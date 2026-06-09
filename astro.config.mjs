import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://expressrepairs.com.au',
  integrations: [react(), sitemap()],
  build: { format: 'directory' },
});
