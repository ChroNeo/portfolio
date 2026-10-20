// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// The CMS is fetched at build time, so Astro has to be allowed to optimise its
// images. Derived from the same env var the loader uses, so a self-hosted Strapi
// needs no second setting.
const strapi = new URL(process.env.STRAPI_URL ?? 'http://localhost:1337');

/** A remote pattern for the CMS host; the port only applies to a local instance. */
const strapiImageHost = {
  protocol: strapi.protocol.replace(':', ''),
  hostname: strapi.hostname,
  ...(strapi.port ? { port: strapi.port } : {}),
};

// Project bodies come from Strapi as rich text, not MDX. The integration is kept
// so Markdown/MDX pages can still be added as files.
// https://astro.build/config
export default defineConfig({
  // The live site; used for canonical/absolute URLs.
  site: 'https://www.chroneo.dev',
  image: {
    remotePatterns: [strapiImageHost],
  },
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
