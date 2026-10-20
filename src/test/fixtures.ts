/**
 * Project fixtures for the unit tests.
 *
 * The collection itself comes from Strapi, and a unit test must not need a
 * running CMS — the build test is what proves the real content still loads.
 * These mirror the shape the loader produces, so a component test still exercises
 * every field it renders.
 */
import type { CollectionEntry } from "astro:content";
import type { ProjectBodyBlock } from "../lib/strapiBlocks";

interface Overrides {
  id?: string;
  slug?: string;
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
  thumbnail?: { url: string; width?: number; height?: number; alternativeText?: string | null } | undefined;
  body?: ProjectBodyBlock[];
  headings?: { depth: number; slug: string; text: string }[];
}

export const makeProject = (overrides: Overrides = {}): CollectionEntry<"projects"> => {
  const slug = overrides.slug ?? "test-project";

  return {
    id: `fixture-${slug}`,
    collection: "projects",
    data: {
      slug,
      title: overrides.title ?? "Test Project",
      titleEn: overrides.titleEn,
      description: overrides.description ?? "A short summary",
      stack: overrides.stack ?? ["React", "Fastify"],
      tags: overrides.tags ?? [],
      category: overrides.category,
      github: overrides.github,
      demo: overrides.demo,
      video: overrides.video,
      thumbnail: overrides.thumbnail,
      date: overrides.date ?? new Date("2024-01-01"),
      body: overrides.body ?? [],
      headings: overrides.headings ?? [],
    },
  } as CollectionEntry<"projects">;
};

/** A project with a picture, a category and an English title. */
export const seniorProject = makeProject({
  id: "one",
  slug: "senior_project",
  title: "Senior Project",
  titleEn: "Exhibition Management System",
  description: "An exhibition management system",
  stack: ["React", "Fastify"],
  category: "Senior Project",
  github: "https://github.com/example/senior",
  date: new Date("2026-04-01"),
  thumbnail: { url: "/uploads/senior.png", width: 1600, height: 900 },
});

/** A project with none of the optional fields. */
export const bareProject = makeProject({
  id: "two",
  slug: "bare",
  title: "Bare Project",
  description: "Only the required fields",
  date: new Date("2024-05-20"),
});

export const projects = [seniorProject, bareProject];
