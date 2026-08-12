import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
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
