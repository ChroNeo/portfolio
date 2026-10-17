# 09: Retire the MDX body and document the workflow

**What to build:** The MDX files become frontmatter-only records, the old body rendering path is deleted, and the authoring loop is written down: edit in the CMS, run the sync, commit.

**Blocked by:** 08

**Status:** done (2026-10-17), with one step left to the repo owner

- [x] No MDX body is read at build time — it is rendered only when a project has no snapshot
- [x] Each project is an MDX record (frontmatter) plus a body snapshot
- [x] The authoring docs describe the loop: edit in the CMS, run `cms:sync`, commit, build
- [x] The docs state that a stale snapshot is the only way the repo and the CMS can disagree, and how to notice it
- [x] Tests, lint and the build all pass with the CMS stopped

**Left to the repo owner (deliberately not done):**
- Deleting the now-dead MDX bodies. Both files are committed, so this is recoverable, but `senior_project.mdx` has an uncommitted local edit that is no longer rendered, and discarding someone else's working change is not a call to make unilaterally.
- Deleting the original images that only the MDX bodies referenced (~3.7 MB), now duplicated by the downloaded copies.
