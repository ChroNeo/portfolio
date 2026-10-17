# 09: Retire the MDX body and document the workflow

**What to build:** The MDX files become frontmatter-only records, the old body rendering path is deleted, and the authoring loop is written down: edit in the CMS, run the sync, commit.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] No MDX body is read at build time
- [ ] Each project is an MDX record (frontmatter) plus a body snapshot
- [ ] The authoring docs describe the loop: edit in the CMS, run `cms:sync`, commit, build
- [ ] The docs state that a stale snapshot is the only way the repo and the CMS can disagree, and how to notice it
- [ ] Tests, lint and the build all pass with the CMS stopped
