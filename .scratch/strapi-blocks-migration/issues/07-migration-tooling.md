# 07: Tool the content migration

**What to build:** A one-off tool that reads the existing MDX documents and emits Strapi block content, uploading the referenced images to the Media Library and preserving their alt text, so the large document does not have to be retyped by hand.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Prose converts to rich-text blocks with headings, lists, tables, quotes and code intact
- [ ] Embedded components are recognised by name and become the matching block, with their props translated
- [ ] Referenced images are uploaded and rewritten to media references with alt text
- [ ] The output can be pushed to the CMS idempotently, so re-running does not duplicate entries
- [ ] A dry-run mode prints what would change without writing
