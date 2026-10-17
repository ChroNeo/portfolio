# 01: Define the project body content model

**What to build:** A Strapi model that lets an editor compose a whole project page, not just its metadata: a `body` dynamic zone on the project type plus the block components for prose, callouts, tables, images, galleries, benchmarks, flow diagrams, project glance and tech badges. Publishing becomes draft/publish so work-in-progress entries never reach a build.

**Blocked by:** None (can start immediately)

**Status:** done (2026-10-17) — except draft/publish, deliberately deferred to 04/10

- [x] The project type gains a `body` dynamic zone
- [ ] Draft/publish is enabled — **deferred**: flipping it on a content type with live entries risks unpublishing them; do it when the CMS is the source of truth (04/10)
- [x] Every block component from the plan exists with its fields: rich text, callout, table, image, gallery, benchmark (+ dataset, + bar), flow diagram (+ step), project glance (+ item), tech badge
- [x] An arbitrary mix of blocks composes and round-trips (verified by creating an entry with all seven non-media block types via the API; the admin form is generated from the same schema)
- [x] The public API returns a populated body zone including nested components

**Note for 04:** one level of populate is not enough. Nested components (benchmark → datasets → bars) need explicit per-component populate, e.g. `populate[body][on][blocks.benchmark][populate][datasets][populate][bars]=*`. `populate[body][populate]=*` silently returns the nested objects without their fields.
