# 02: Model block types and convert rich text to Markdown

**What to build:** A TypeScript representation of a project body, discriminated on the block component name, plus the pure conversion from Strapi rich-text JSON to Markdown so the rest of the site reuses Astro's own Markdown pipeline instead of a hand-written HTML renderer. Also exposes heading extraction for the table of contents.

**Blocked by:** 01

**Status:** done (2026-10-17)

- [x] A typed union covers every block component in the content model
- [x] Rich text converts to Markdown for paragraphs, headings, lists, quotes, code (with language), images, links, bold and italic
- [x] Code fences keep their language so syntax highlighting still works
- [x] Headings convert at the correct level and in document order. **Revised:** slug assignment moved to 04 — the loader takes headings from Astro's own Markdown renderer, so the anchor ids and the table of contents cannot drift apart. A slugger here would be a second source of truth.
- [x] Unit tests cover each node type and malformed input, with no CMS running
