/**
 * The content contract, checked against the real CMS.
 *
 * Unit tests run on fixtures; this file is the one place that asserts the
 * content actually in Strapi is what the site can render. It skips itself when
 * the CMS is unreachable, so `npm run test` still works offline — the build test
 * is what fails loudly when the CMS is needed and missing.
 */
import { describe, expect, test } from "vitest";
import { strapi } from "@strapi/client";
import { BODY_COMPONENTS, projectPopulate, strapiApiUrl } from "../lib/strapi";
import { hasTechIcon } from "../lib/techIcons";

interface Document {
  slug: string;
  stack: string[] | null;
  body: { __component: string }[] | null;
}

const load = async (): Promise<Document[] | null> => {
  try {
    const client = strapi({ baseURL: strapiApiUrl() });
    const response = await client.collection("projects").find({ populate: projectPopulate });
    return response.data as unknown as Document[];
  } catch {
    return null;
  }
};

const documents = await load();

describe.skipIf(documents === null)("CMS content contract", () => {
  test("there is at least one project to render", () => {
    expect(documents!.length).toBeGreaterThan(0);
  });

  test("every slug is unique and url-safe", () => {
    const slugs = documents!.map((document) => document.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
    }
  });

  test("every technology in a stack has an icon", () => {
    const tech = documents!.flatMap((document) => document.stack ?? []);

    expect(tech.length).toBeGreaterThan(0);
    for (const name of tech) {
      expect(hasTechIcon(name), `no icon mapped for "${name}"`).toBe(true);
    }
  });

  test("every body block is one the renderer knows", () => {
    const known = new Set<string>(BODY_COMPONENTS);

    for (const document of documents!) {
      for (const block of document.body ?? []) {
        expect(known.has(block.__component), `unknown block "${block.__component}"`).toBe(true);
      }
    }
  });
});
