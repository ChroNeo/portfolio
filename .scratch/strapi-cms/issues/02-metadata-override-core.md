# 02: Strapi title overrides the site, with frontmatter fallback

**What to build:** The portfolio reads a project's title from Strapi instead of its local frontmatter. Editing the title in the Strapi admin and restarting the dev server changes what the site shows. When Strapi is unreachable, the site transparently falls back to the local frontmatter so builds and tests still pass. This ticket deliberately proves the whole pipeline with one scalar field before widening it.

**Blocked by:** 01

**Status:** done (2026-10-16)

**Blocked by:** 01

- [x] A Strapi fetch-and-mapping layer exists and is unit-tested without a running Strapi instance
- [x] With Strapi running, the project title shown on the site comes from Strapi, not frontmatter (verified by editing it in the admin and restarting the dev server)
- [x] With Strapi stopped or unreachable, the title falls back to frontmatter, and the production build and the existing test suite remain green
- [x] The Strapi base URL is configurable via an environment variable with a sensible local default, and an example env file documents it
- [x] The project body, images, and embedded content components are completely unaffected
