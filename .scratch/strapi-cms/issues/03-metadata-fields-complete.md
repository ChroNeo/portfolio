# 03: Complete the Strapi metadata override across all fields

**What to build:** The override that started with the title now covers the rest of a project's metadata: description, `titleEn`, category, date, the links, and the array fields stack and tags. Each field keeps the correct runtime type so the existing pages and cards render exactly as before.

**Blocked by:** 02

**Status:** done (2026-10-16)

- [x] Every project metadata field is sourced from Strapi when it is reachable, each with the correct runtime type (a date object for date, arrays for stack and tags)
- [x] The array and link fields render correctly on both the homepage project cards and the project detail page
- [x] When Strapi is unreachable, the fallback still produces a fully valid project for every field
- [x] The mapping logic for every field is covered by unit tests that do not require Strapi to be running
