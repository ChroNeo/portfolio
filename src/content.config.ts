import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      stack: z.array(z.string()),
      github: z.url().optional(),
      demo: z.url().optional(),
      thumbnail: image().optional(),
      order: z.number().optional(),
    }),
});

export const collections = { projects };