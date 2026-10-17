# 06: Pilot — one project authored in the CMS, rendered offline

**What to build:** The small existing project authored end to end in Strapi, synced into the repo, and rendered with the CMS switched off — proving the whole loop before the large document is touched.

**Blocked by:** 05

**Status:** done (2026-10-17)

- [x] The project's body is composed of blocks in the CMS
- [x] `cms:sync` writes its frontmatter, its body snapshot and its images
- [x] The page renders correctly with the CMS stopped
- [x] The rendered page matches what the MDX version produced
- [x] Tests, lint and the build all pass with the CMS stopped

**Verified:** the rendered page contains the CMS wording (`there is`) and not the MDX wording (`there's`), so it is genuinely rendering the snapshot rather than falling back. Headings, anchor ids, the table of contents, the tech badge and the callout all render, and rebuild identically with the CMS stopped.

