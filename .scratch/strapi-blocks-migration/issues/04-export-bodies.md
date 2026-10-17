# 04: Extend cms:sync to export bodies and media

**What to build:** `cms:sync` already copies metadata into MDX frontmatter. Extend it so it also snapshots each project's body — the full block structure — into a committed file next to the MDX, and downloads the images that body references into the repo. After this, the build needs nothing but files.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] A body snapshot is written per project, committed, and kept beside that project's MDX file
- [ ] The snapshot holds the complete block structure with nested components fully populated (benchmark datasets and bars included)
- [ ] Referenced images are downloaded into the repo and the snapshot points at those local files
- [ ] A dry run reports what would change and writes nothing
- [ ] Re-running with no CMS changes leaves every file byte-identical
- [ ] The sync does not touch the MDX body

**Note:** downloading media is what lets the build stay offline while images still go through Astro's optimiser. Without it, "no CMS at build" and "optimised images" cannot both hold.
