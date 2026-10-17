# 06: Pilot — one project authored in the CMS, rendered offline

**What to build:** The small existing project authored end to end in Strapi, synced into the repo, and rendered with the CMS switched off — proving the whole loop before the large document is touched.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The project's body is composed of blocks in the CMS
- [ ] `cms:sync` writes its frontmatter, its body snapshot and its images
- [ ] The page renders correctly with the CMS stopped
- [ ] The rendered page matches what the MDX version produced
- [ ] Tests, lint and the build all pass with the CMS stopped
