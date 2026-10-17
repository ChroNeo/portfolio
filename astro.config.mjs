// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://ChroNeo.github.io',
  base: '/portfolio',
  integrations: [mdx(), react()],
  image: {
    // Media served by the Strapi CMS; fetched and optimised at build time.
    remotePatterns: [{ protocol: 'http', hostname: 'localhost', port: '1337' }],
  },
  vite: { 
    plugins: [tailwindcss()]
  }
});