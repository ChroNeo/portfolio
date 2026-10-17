# 04: Drive projects and routes from the CMS

**What to build:** The projects collection is fed by the CMS, so a published entry is a page and its body arrives already transformed. The existing MDX files remain only as a transitional fallback for when the CMS is unreachable.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Route generation creates one route per published CMS entry, keyed by its slug
- [ ] The loader maps metadata and the transformed body into the collection
- [ ] The body is fetched with nested components fully populated (see the note below)
- [ ] Draft entries are excluded from builds
- [ ] With the CMS unreachable the site still builds from the MDX fallback
- [ ] The existing test suite still passes

**Note on headings:** collect them from Astro's Markdown renderer per rich-text block, in document order, so the table of contents uses the same slugs as the rendered anchors. Caveat: the slugger resets on each render call, so the same heading text in two different rich-text blocks collides — de-duplicate, or keep one rich-text block per section.
**Note on populate:** one level is not enough. Nested components (benchmark → datasets → bars) need explicit per-component populate, e.g. `populate[body][on][blocks.benchmark][populate][datasets][populate][bars]=*`. `populate[body][populate]=*` silently returns the nested objects without their fields.
