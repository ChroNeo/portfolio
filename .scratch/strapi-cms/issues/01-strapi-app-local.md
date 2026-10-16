# 01: Strapi app running locally with a seeded project type

**What to build:** A Strapi 5 CMS app that lives alongside the portfolio, runs locally, and exposes the metadata for portfolio projects over a REST API that anyone can read. An admin can log in, and the two existing projects are seeded so the API returns them.

**Blocked by:** None (can start immediately)

**Status:** done (2026-10-16)

- [x] The Strapi app runs locally using SQLite with no external database, and its admin panel is reachable and loginable after creating an admin user
- [x] A `project` collection type exists with fields: `slug` (unique, required), `title`, `titleEn`, `description`, `date`, `stack` (array), `tags` (array), `category`, `github`, `demo`, `video`
- [x] The seeded `slug` values match the existing project identifiers so they can be joined to the current content
- [x] Public (unauthenticated) read permission is enabled, and an unauthenticated GET to the projects REST endpoint returns both seeded projects
- [x] The app is committed without a nested git repository, and its generated artifacts (build output, tmp, env) are ignored
