import { readFile } from "node:fs/promises";
import { defineCollection } from "astro:content";
import { glob, type Loader, type LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import { snapshotName } from "./lib/cmsBodies";
import {
  blocksToMarkdown,
  type ProjectBodyBlock,
  type RichTextBlockNode,
} from "./lib/strapiBlocks";

export interface BodyHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * Reads a project's body snapshot, written by `npm run cms:sync`.
 * Returns null when the project has none — a project without a body is valid.
 */
const readSnapshot = async (
  context: LoaderContext,
  slug: string,
): Promise<ProjectBodyBlock[] | null> => {
  const path = new URL(`src/content/projects/${snapshotName(slug)}`, context.config.root);

  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(parsed) ? (parsed as ProjectBodyBlock[]) : null;
  } catch {
    return null;
  }
};

/**
 * Rich text is handed to Astro's own Markdown renderer, which is what keeps
 * syntax highlighting and heading ids identical to the rest of the site.
 *
 * Images inside rich text are dropped: a downloaded image lives in `src/assets`,
 * which a rendered `<img src>` cannot reach, and the CMS url would need the CMS
 * at build time. The content model has a dedicated image block for pictures.
 */
const renderRichText = async (
  nodes: RichTextBlockNode[] | null | undefined,
  context: LoaderContext,
  where: string,
): Promise<{ html: string; headings: BodyHeading[] }> => {
  const blocks = nodes ?? [];
  const images = blocks.filter((node) => node?.type === "image").length;

  if (images > 0) {
    context.logger.warn(
      `${where}: dropped ${images} inline image(s) — use an Image block instead, so they can be optimised.`,
    );
  }

  const markdown = blocksToMarkdown(blocks.filter((node) => node?.type !== "image"));
  const rendered = await context.renderMarkdown(markdown);

  return {
    html: rendered.html,
    headings: (rendered.metadata?.headings ?? []) as BodyHeading[],
  };
};

/**
 * Loads projects from the local MDX files, then attaches the body that
 * `cms:sync` snapshotted beside each one.
 *
 * The MDX file carries the frontmatter; the snapshot carries the article. Both
 * are committed, so the build never reaches for the CMS — the CMS is an
 * authoring surface, and `cms:sync` is the bridge.
 */
const projectsLoader = (): Loader => {
  const localLoader = glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/projects",
  });

  return {
    name: "projects",
    load: async (context) => {
      await localLoader.load(context);

      for (const [id, entry] of context.store.entries()) {
        const snapshot = await readSnapshot(context, id);
        if (snapshot === null) {
          continue;
        }

        const body: ProjectBodyBlock[] = [];
        const headings: BodyHeading[] = [];

        for (const block of snapshot) {
          if (block.__component === "blocks.rich-text") {
            const rendered = await renderRichText(block.content, context, `${id} rich text`);
            headings.push(...rendered.headings);
            body.push({ ...block, html: rendered.html });
            continue;
          }

          if (block.__component === "blocks.callout") {
            const rendered = await renderRichText(block.body, context, `${id} callout`);
            body.push({ ...block, bodyHtml: rendered.html });
            continue;
          }

          body.push(block);
        }

        context.store.set({
          ...entry,
          data: { ...entry.data, body, headings },
          // The store skips a write whose digest is unchanged, so the digest has
          // to account for the snapshot rather than the MDX file alone.
          digest: context.generateDigest(
            `${entry.digest ?? ""}|${JSON.stringify(body)}`,
          ),
        });
      }
    },
  };
};

const projects = defineCollection({
  loader: projectsLoader(),
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
      // Filled in by the loader from the project's body snapshot.
      body: z.array(z.custom<ProjectBodyBlock>()).default([]),
      headings: z
        .array(z.object({ depth: z.number(), slug: z.string(), text: z.string() }))
        .default([]),
    }),
});

export const collections = { projects };
