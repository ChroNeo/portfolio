/**
 * Route generation for the project pages, kept out of the page component so the
 * ordering and route shape can be tested without a CMS round-trip (and because
 * Astro components may not have extra exports).
 */
import type { CollectionEntry } from "astro:content";

/** Every project's route, newest first. The slug is the URL segment. */
export const staticPathsFor = (projects: CollectionEntry<"projects">[]) =>
  [...projects]
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((project) => ({
      params: { project: project.data.slug },
      props: { project },
    }));
