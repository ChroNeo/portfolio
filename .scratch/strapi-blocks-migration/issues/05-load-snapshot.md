# 05: Load the body snapshot and retire the CMS fetch

**What to build:** The build renders project bodies from the committed snapshots instead of contacting the CMS. Rich text goes through Astro's own Markdown pipeline so code stays highlighted and headings keep their ids, and the table of contents is fed from the same pass.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The content loader attaches each project's snapshotted body to its entry
- [ ] Rich text is rendered through Astro's Markdown renderer, preserving syntax highlighting and heading ids
- [ ] Headings for the table of contents are collected in document order, using the same slugs as the rendered anchors
- [ ] A build with the CMS stopped produces identical pages to one with it running
- [ ] The build-time fetch of projects from Strapi is removed
- [ ] The existing test suite still passes

**Note:** Astro's slugger resets on each render call, so identical heading text in two different rich-text blocks collides. De-duplicate, or keep one rich-text block per section.
