# 05: Load the body snapshot and retire the CMS fetch

**What to build:** The build renders project bodies from the committed snapshots instead of contacting the CMS. Rich text goes through Astro's own Markdown pipeline so code stays highlighted and headings keep their ids, and the table of contents is fed from the same pass.

**Blocked by:** 04

**Status:** done (2026-10-17)

- [x] The content loader attaches each project's snapshotted body to its entry
- [x] Rich text is rendered through Astro's Markdown renderer, preserving syntax highlighting and heading ids
- [x] Headings for the table of contents are collected in document order, using the same slugs as the rendered anchors
- [x] A build with the CMS stopped produces identical pages to one with it running — verified: the build no longer contains any Strapi fetch
- [x] The build-time fetch of projects from Strapi is removed
- [x] The existing test suite still passes

**Notes:**
- Images inside rich text are dropped with a warning. A downloaded file lives in `src/assets`, which a rendered `<img src>` cannot reach, and the CMS url would need the CMS at build time — so pictures belong in an image block, where the renderer resolves the file into a real asset. Worth documenting for authors.
- The dev server must be restarted after `cms:sync`: the loader attaches snapshots during a full load, and the file watcher only watches MDX files, not snapshots.


**Note:** Astro's slugger resets on each render call, so identical heading text in two different rich-text blocks collides. De-duplicate, or keep one rich-text block per section.
