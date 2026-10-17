# 08: Verify visual parity

**What to build:** Confidence that the migrated pages match the originals before the old body is removed for good.

**Blocked by:** 07

**Status:** done (2026-10-17)

- [x] Every section present in the original appears in the migrated page
- [x] No image is missing, duplicated or degraded (38 images either way)
- [x] Tables, the benchmark chart and the flow diagram are visually equivalent
- [x] The table of contents matches the rendered headings
- [x] Regressions fixed or explicitly accepted

**Method:** the same page was built twice — once from the MDX, once from the snapshot — and compared:

| metric | MDX | snapshot |
| --- | --- | --- |
| size | 161.6 KB | 171.8 KB |
| words | 1565 | 1567 |
| images | 38 | 38 |
| alt text | 36 | 36 |
| tables | 7 | 7 |
| code blocks | 2 | 2 |
| h2 | 7 | 7 |

**Three defects this found, all fixed:** list and blockquote text was being dropped entirely (323 words); gallery alt text never reached the Media Library; and the YAML frontmatter was being parsed as body content.

**Accepted limitations:**
- The benchmark block is empty, so the chart still renders the component's built-in data. Faithful to the source (`<BenchmarkChart />` took no props) but not yet CMS-editable.
- The original images remain in the repo beside their downloaded copies (~3.7 MB duplicated), pending the cleanup in 09.

