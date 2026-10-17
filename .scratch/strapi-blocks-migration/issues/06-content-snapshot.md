# 06: Make builds reproducible without a live CMS

**What to build:** A content snapshot exported from the CMS and committed to the repo, used automatically when the CMS is unreachable, so CI and static hosting never depend on a Strapi instance being up.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] An export command writes the complete project content — metadata and body, including media URLs — to a committed file
- [ ] The loader prefers the live CMS and falls back to the snapshot
- [ ] A build with no CMS running produces the same pages as one with it
- [ ] The export step is documented so the snapshot cannot silently go stale unnoticed
