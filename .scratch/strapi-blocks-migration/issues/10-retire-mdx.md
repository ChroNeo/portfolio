# 10: Retire the MDX pipeline

**What to build:** The MDX files, their loader and their fallback are removed. The CMS is the only authoring surface, and tests and docs reflect that.

**Blocked by:** 06, 09

**Status:** ready-for-agent

- [ ] No content file is read at build time
- [ ] The projects collection comes only from the CMS or the snapshot
- [ ] Content tests run against fixtures or the snapshot, never a live CMS
- [ ] The authoring documentation describes the CMS-only workflow
- [ ] Tests, lint and the build all pass
