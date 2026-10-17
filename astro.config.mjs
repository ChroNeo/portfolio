// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the real Vercel domain (used for canonical URLs only)
  site: 'https://portfolio-chroneo.vercel.app',
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
