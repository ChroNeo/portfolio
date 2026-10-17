# 04: Extend cms:sync to export bodies and media

**What to build:** `cms:sync` already copies metadata into MDX frontmatter. Extend it so it also snapshots each project's body — the full block structure — into a committed file next to the MDX, and downloads the images that body references into the repo. After this, the build needs nothing but files.

**Blocked by:** 01, 03

**Status:** done (2026-10-17)

- [x] A body snapshot is written per project, committed, and kept beside that project's MDX file
- [x] The snapshot holds the complete block structure with nested components fully populated (benchmark datasets and bars included)
- [x] Referenced images are downloaded into the repo and the snapshot points at those local files
- [x] A dry run reports what would change and writes nothing
- [x] Re-running with no CMS changes leaves every file byte-identical
- [x] The sync does not touch the MDX body

**Findings worth keeping:**
- Strapi returns media URLs **relative to its own host** (`/uploads/x.jpg`), so they must be resolved against the CMS URL before downloading. Plain `fetch(url)` fails.
- The deep populate is not optional: `populate[body][populate]=*` drops nested components and media URLs silently. Verified end to end — a benchmark came back with 2 bars (name, value, version) only because the query names every component.
- Strapi re-encodes uploads, so a re-downloaded file is not byte-identical to the original that was uploaded. Comparing against the file on disk (rather than the source) is what keeps re-runs from rewriting.


**Note:** downloading media is what lets the build stay offline while images still go through Astro's optimiser. Without it, "no CMS at build" and "optimised images" cannot both hold.
