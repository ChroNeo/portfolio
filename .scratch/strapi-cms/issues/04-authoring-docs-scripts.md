# 04: Documented authoring workflow and convenience scripts

**What to build:** A reproducible workflow for adding or editing a project now that metadata lives in Strapi. From the repo root, one command starts the CMS, and the docs explain how the two sources fit together — plus the gotcha that the dev server must be restarted to pick up admin edits.

**Blocked by:** 03

**Status:** done (2026-10-16)

- [x] A convenience script run from the repo root starts the Strapi app
- [x] The README explains: how to start the CMS, that a new project needs both an MDX entry and a Strapi entry sharing the same slug, that Strapi wins when reachable and frontmatter is the fallback, and that the dev server must be restarted after admin edits
- [x] The project structure documentation lists the CMS app and the Strapi integration module
- [x] Following the docs from a clean checkout, a new contributor can add a project and see it appear on the site
