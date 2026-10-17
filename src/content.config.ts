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
      const remoteProjects = await fetchStrapiProjects();

      if (remoteProjects === null) {
        context.logger.warn(
          "Strapi is unreachable — using local frontmatter for projects.",
        );
        await localLoader.load(context);
        return;
      }

      const bySlug = new Map(remoteProjects.map((project) => [project.slug, project]));
      const scopedStore = context.store;

      // Overriding at the store boundary keeps dev in step with builds: the
      // glob loader re-syncs entries from disk when a file changes, and that
      // write goes through here too, so the CMS metadata is re-applied instead
      // of being silently replaced by the frontmatter.
      const store: typeof scopedStore = {
        ...scopedStore,
        set: (entry) => {
          const remote = bySlug.get(entry.id);
          const metadata = remote ? mapStrapiProject(remote) : {};

          if (Object.keys(metadata).length === 0) {
            return scopedStore.set(entry);
          }

          return scopedStore.set({
            ...entry,
            data: { ...entry.data, ...metadata },
            // The store skips a write whose digest is unchanged, so the digest
            // has to account for the merged metadata, not the MDX source alone.
            digest: context.generateDigest(
              `${entry.digest ?? ""}|${JSON.stringify(metadata)}`,
            ),
          });
        },
      };

      await localLoader.load({ ...context, store });

      for (const id of scopedStore.keys()) {
        if (!bySlug.has(id)) {
          context.logger.warn(
            `No Strapi entry for project "${id}" — using frontmatter.`,
          );
        }
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
