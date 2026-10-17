/**
 * The Strapi API boundary: project metadata, and project bodies with their
 * nested components populated.
 *
 * `cms:sync` reads both and writes them into the repo, so the CMS is an
 * authoring surface rather than a build dependency.
 */

import type { ProjectBodyBlock } from "./strapiBlocks.ts";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

/** A project as returned by the Strapi REST API (flattened from its `data` envelope). */
export interface StrapiProject {
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

/** The subset of the content schema that Strapi is allowed to override. */
export interface ProjectMetadata {
  title?: string;
  titleEn?: string;
  description?: string;
  date?: Date;
  stack?: string[];
  tags?: string[];
  category?: string;
  github?: string;
  demo?: string;
  video?: string;
}

/**
 * The Strapi base URL: the Astro/Vite env first, then the plain-Node env.
 *
 * `npm run cms:sync` runs outside Astro, where `import.meta.env` does not exist at
 * all — reading it unguarded throws under Node and would take the CLI down before
 * it could report anything.
 */
export const getStrapiUrl = (): string =>
  (import.meta.env?.STRAPI_URL as string | undefined) ??
  process.env.STRAPI_URL ??
  DEFAULT_STRAPI_URL;

/** Trims a value to `undefined` when it is missing, so it never clobbers the frontmatter. */
const asText = (value: string | null | undefined): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const asList = (value: string[] | null | undefined): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  return items.length > 0 ? items : undefined;
};

const asDate = (value: string | null | undefined): Date | undefined => {
  const text = asText(value);
  if (text === undefined) {
    return undefined;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * Maps a Strapi project onto the fields it may override.
 * Absent or empty values are omitted so the local frontmatter stays in charge
 * of them.
 */
export const mapStrapiProject = (project: Partial<StrapiProject>): ProjectMetadata => {
  const metadata: ProjectMetadata = {};

  const textFields = ["title", "titleEn", "description", "category", "github", "demo", "video"] as const;
  for (const field of textFields) {
    const value = asText(project[field]);
    if (value !== undefined) {
      metadata[field] = value;
    }
  }

  const date = asDate(project.date);
  if (date !== undefined) {
    metadata.date = date;
  }

  const stack = asList(project.stack);
  if (stack !== undefined) {
    metadata.stack = stack;
  }

  const tags = asList(project.tags);
  if (tags !== undefined) {
    metadata.tags = tags;
  }

  return metadata;
};

/**
 * Fetches every project from Strapi.
 *
 * Returns `null` when the CMS is unreachable or answers with an error, which
 * signals the caller to fall back to the local frontmatter.
 */
export const fetchStrapiProjects = async (
  url: string = getStrapiUrl(),
): Promise<StrapiProject[] | null> => {
  try {
    const response = await fetch(`${url}/api/projects?pagination[pageSize]=200`);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: StrapiProject[] };
    return payload.data ?? [];
  } catch {
    return null;
  }
};

/** A project as returned with its body zone populated. */
export interface StrapiProjectWithBody extends StrapiProject {
  body: ProjectBodyBlock[] | null;
}

/** Every block component the body zone can hold. */
const BODY_COMPONENTS = [
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
 * The populate query for a project body.
 *
 * `populate[body][populate]=*` is not enough: it fills the zone and its own
 * components but silently drops media fields and components nested inside a
 * component — a benchmark would come back with its datasets but no bars, and an
 * image block with no url, and nothing would report an error. Every component
 * is therefore named explicitly, and the one with a second level of nesting is
 * given a path that reaches all the way down.
 */
export const bodyPopulateQuery = (): string =>
  BODY_COMPONENTS.map((component) =>
    component === "blocks.benchmark"
      ? "populate[body][on][blocks.benchmark][populate][datasets][populate][bars]=*"
      : `populate[body][on][${component}][populate]=*`,
  ).join("&");

/**
 * Fetches every project with its body fully populated.
 * Returns `null` when the CMS is unreachable, matching `fetchStrapiProjects`.
 */
export const fetchStrapiProjectsWithBodies = async (
  url: string = getStrapiUrl(),
): Promise<StrapiProjectWithBody[] | null> => {
  try {
    const query = `pagination[pageSize]=200&${bodyPopulateQuery()}`;
    const response = await fetch(`${url}/api/projects?${query}`);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: StrapiProjectWithBody[] };
    return payload.data ?? [];
  } catch {
    return null;
  }
};
