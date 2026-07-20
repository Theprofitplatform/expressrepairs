import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://expressrepairs.com.au',
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/go/') && !page.includes('/staff/') && !page.includes('/shop/cart/') && !page.includes('/shop/thanks/') })],
  build: { format: 'directory' },
});
