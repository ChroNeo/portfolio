import { defineCollection, z } from "astro:content";
import type { Loader, LoaderContext } from "astro/loaders";
import { strapiLoader } from "strapi-community-astro-loader";
import { projectPopulate, strapiApiUrl, type StrapiProject } from "./lib/strapi";
import {
  blocksToMarkdown,
  type ProjectBodyBlock,
  type RichTextBlockNode,
  type StrapiMedia,
} from "./lib/strapiBlocks";

export interface BodyHeading {
  depth: number;
  slug: string;
  text: string;
}

/** A project as Strapi returns it, with its body zone populated. */
export interface StrapiProjectDocument extends StrapiProject {
  body?: ProjectBodyBlock[] | null;
  thumbnail?: StrapiMedia | null;
}

/**
 * Rich text is handed to Astro's own Markdown renderer, which is what keeps
 * syntax highlighting and heading ids identical to the rest of the site.
 *
 * Images inside rich text are dropped: the content model has a dedicated image
 * block, which can be laid out and captioned properly.
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
      `${where}: dropped ${images} inline image(s) — use an Image block instead, so they can be laid out.`,
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
 * Turns one CMS document into what the pages read: the body zone with its rich
 * text pre-rendered, plus the headings the table of contents needs.
 */
const renderBody = async (
  document: StrapiProjectDocument,
  context: LoaderContext,
  slug: string,
): Promise<{ body: ProjectBodyBlock[]; headings: BodyHeading[] }> => {
  const body: ProjectBodyBlock[] = [];
  const headings: BodyHeading[] = [];

  for (const block of document.body ?? []) {
    if (block.__component === "blocks.rich-text") {
      const rendered = await renderRichText(block.content, context, `${slug} rich text`);
      headings.push(...rendered.headings);
      body.push({ ...block, html: rendered.html });
      continue;
    }

    if (block.__component === "blocks.callout") {
      const rendered = await renderRichText(block.body, context, `${slug} callout`);
      body.push({ ...block, bodyHtml: rendered.html });
      continue;
    }

    body.push(block);
  }

  return { body, headings };
};

/**
 * The Strapi collection loader, wrapped so rich text is rendered through Astro's
 * Markdown pipeline.
 *
 * `strapiLoader` fetches and paginates the content type; the wrapper only adds
 * the two derived fields the pages expect, then recomputes the digest so the
 * Content Layer cache notices a change.
 */
const projectsLoader = (): Loader => {
  const strapi = strapiLoader({
    contentType: "project",
    clientConfig: { baseURL: strapiApiUrl() },
    params: { populate: projectPopulate },
  });

  return {
    name: "projects",
    load: async (context) => {
      await strapi.load(context);

      for (const [id, entry] of context.store.entries()) {
        const document = entry.data as unknown as StrapiProjectDocument;
        const slug = document.slug ?? id;
        const { body, headings } = await renderBody(document, context, slug);
        const data = { ...document, body, headings };

        context.store.set({
          id,
          data,
          // The store skips a write whose digest is unchanged, so the digest has
          // to account for the rendered body rather than the CMS document alone.
          digest: context.generateDigest(JSON.stringify(data)),
        });
      }
    },
  };
};

/** A media field, as a project may not have one. */
const media = z
  .object({
    url: z.string(),
    width: z.number().nullish(),
    height: z.number().nullish(),
    alternativeText: z.string().nullish(),
    caption: z.string().nullish(),
  })
  .nullish()
  .transform((value) => value ?? undefined);

const text = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);

/** Strapi sends a date field as `YYYY-MM-DD`. */
const list = z
  .array(z.string())
  .nullish()
  .transform((value) => value ?? []);

const projects = defineCollection({
  loader: projectsLoader(),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    titleEn: text,
    description: z.string(),
    stack: list,
    github: z
      .url()
      .nullish()
      .transform((value) => value ?? undefined),
    demo: z
      .url()
      .nullish()
      .transform((value) => value ?? undefined),
    video: z
      .url()
      .nullish()
      .transform((value) => value ?? undefined),
    thumbnail: media,
    date: z.coerce.date(),
    category: text,
    tags: list,
    // Filled in by the loader from the CMS body.
    body: z.array(z.custom<ProjectBodyBlock>()).default([]),
    headings: z
      .array(z.object({ depth: z.number(), slug: z.string(), text: z.string() }))
      .default([]),
  }),
});

export const collections = { projects };
