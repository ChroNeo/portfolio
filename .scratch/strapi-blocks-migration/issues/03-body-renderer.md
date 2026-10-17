# 03: Render a project body from blocks

**What to build:** A renderer that turns the stored body into the same page as today — prose in the existing typography container, callouts with rich content, tables, optimized images, galleries, benchmark chart, flow diagram, project glance and tech badges — composed in whatever order the editor arranged.

**Blocked by:** 02

**Status:** done (2026-10-17)

- [x] Every block type renders its corresponding existing component, with no changes to those components' props
- [x] Tables render with the site's styling (new table component)
- [x] Headings keep the anchor ids the loader supplies (verified the rendered markup is injected raw, not escaped). The ids matching the table of contents is the loader's half, in 04.
- [x] A fixture-based test renders one of every block type without a CMS (10 tests)
- [x] An empty body degrades gracefully — `null`, `undefined` and `[]` all render nothing

**Incidental:** tests configure Astro's no-op image service so CMS media URLs are not fetched during the suite, and the Astro config allows remote images from the CMS host so they are downloaded and optimised at build time.
