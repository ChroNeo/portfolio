/**
 * The Strapi API boundary.
 *
 * Content lives in the CMS and the build fetches it: there is no snapshot in the
 * repo. Everything the loader needs to reach Strapi and to ask for a project's
 * body lives here.
 */

const DEFAULT_STRAPI_URL = "http://localhost:1337";

/**
 * The Strapi base URL: the Astro/Vite env first, then the plain-Node env.
 *
 * `astro.config.mjs` and any script run outside Astro have no `import.meta.env`,
 * so reading it unguarded would throw before anything could report a problem.
 */
export const getStrapiUrl = (): string =>
  (import.meta.env?.STRAPI_URL as string | undefined) ??
  process.env.STRAPI_URL ??
  DEFAULT_STRAPI_URL;

/** The REST root the `@strapi/client` talks to. */
export const strapiApiUrl = (): string => `${getStrapiUrl().replace(/\/+$/, "")}/api`;

/**
 * An absolute URL for a media file.
 *
 * Strapi serves media urls relative to its own host (`/uploads/foo.png`), which
 * a browser cannot resolve on the deployed site.
 */
export const mediaUrl = (url: string): string =>
  url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `${getStrapiUrl().replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;

/** A project as returned by the Strapi REST API (already flattened from its `data` envelope). */
export interface StrapiProject {
  id: number;
  documentId: string;
  slug: string;
  title: string | null;
  titleEn: string | null;
  description: string | null;
  date: string | null;
  stack: string[] | null;
  tags: string[] | null;
  category: string | null;
  github: string | null;
  demo: string | null;
  video: string | null;
}

/** Every block component the body zone can hold. */
export const BODY_COMPONENTS = [
  "blocks.rich-text",
  "blocks.callout",
  "blocks.data-table",
  "blocks.image",
  "blocks.gallery",
  "blocks.benchmark",
  "blocks.flow-diagram",
  "blocks.project-glance",
  "blocks.tech-badge",
] as const;

/**
 * The populate query for a project body, in the shape `@strapi/client` wants.
 *
 * `populate=*` is not enough: it fills the zone and its own components but
 * silently drops media fields and components nested inside a component — a
 * benchmark would come back with its datasets but no bars, and an image block
 * with no url, and nothing would report an error. Every component is therefore
 * named explicitly, and the one with a second level of nesting is given a path
 * that reaches all the way down.
 */
export const projectPopulate = {
  body: {
    on: Object.fromEntries(
      BODY_COMPONENTS.map((component) => [
        component,
        component === "blocks.benchmark"
          ? { populate: { datasets: { populate: { bars: "*" } } } }
          : { populate: "*" },
      ]),
    ),
  },
  // `populate[thumbnail]=*` is rejected by Strapi 5 (it tries to populate a
  // `related` key media does not have); a scalar `true` just fills the media.
  thumbnail: true,
} as const;
