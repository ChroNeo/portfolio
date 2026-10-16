import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { z } from "astro/zod";
import { fetchStrapiProjects, mapStrapiProject } from "./lib/strapi";

/**
 * Loads projects from the local MDX files, then lets the Strapi CMS override
 * their metadata.
 *
 * The MDX files stay the source of the body, the images and the embedded
 * components; Strapi only takes over the frontmatter fields. Matching is by
 * slug, which is the MDX file name. When Strapi is unreachable the frontmatter
 * is used as-is, so builds and tests work without a running CMS.
 */
const strapiProjectsLoader = (): Loader => {
  const localLoader = glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/projects",
  });

  return {
    name: "strapi-projects",
    load: async (context) => {
      await localLoader.load(context);

      const remoteProjects = await fetchStrapiProjects();
      if (remoteProjects === null) {
        context.logger.warn(
          "Strapi is unreachable — using local frontmatter for projects.",
        );
        return;
      }

      const bySlug = new Map(remoteProjects.map((project) => [project.slug, project]));

      for (const [id, entry] of context.store.entries()) {
        const remote = bySlug.get(id);
        if (!remote) {
          context.logger.warn(`No Strapi entry for project "${id}" — using frontmatter.`);
          continue;
        }

        const metadata = mapStrapiProject(remote);

        context.store.set({
          ...entry,
          data: { ...entry.data, ...metadata },
          // The store skips a write whose digest is unchanged, so the digest has
          // to account for the merged metadata rather than the MDX source alone.
          digest: context.generateDigest(
            `${entry.digest ?? ""}|${JSON.stringify(metadata)}`,
          ),
        });
      }
    },
  };
};

const projects = defineCollection({
  loader: strapiProjectsLoader(),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      titleEn: z.string().optional(),
      description: z.string(),
      stack: z.array(z.string()),
      github: z.url().optional(),
      demo: z.url().optional(),
      video: z.url().optional(),
      thumbnail: image().optional(),
      date: z.date(),
      category: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { projects };
