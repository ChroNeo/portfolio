import { describe, expect, test } from "vitest";
import { getStrapiUrl, mediaUrl, projectPopulate, strapiApiUrl } from "./strapi";

describe("getStrapiUrl", () => {
  test("falls back to the local CMS when nothing is configured", () => {
    expect(getStrapiUrl()).toBe("http://localhost:1337");
  });

  test("builds the REST root without doubling the slash", () => {
    expect(strapiApiUrl()).toBe("http://localhost:1337/api");
  });
});

describe("mediaUrl", () => {
  test("resolves a CMS-relative upload against the CMS host", () => {
    expect(mediaUrl("/uploads/shot.png")).toBe(
      "http://localhost:1337/uploads/shot.png",
    );
  });

  test("leaves an absolute url alone", () => {
    expect(mediaUrl("https://cdn.example.com/shot.png")).toBe(
      "https://cdn.example.com/shot.png",
    );
  });
});

describe("projectPopulate", () => {
  test("names every body component explicitly", () => {
    const on = projectPopulate.body.on as Record<string, unknown>;

    expect(Object.keys(on)).toEqual(
      expect.arrayContaining([
        "blocks.rich-text",
        "blocks.callout",
        "blocks.image",
        "blocks.gallery",
        "blocks.benchmark",
      ]),
    );
  });

  test("reaches the nested benchmark bars", () => {
    const on = projectPopulate.body.on as Record<string, unknown>;

    expect(on["blocks.benchmark"]).toEqual({
      populate: { datasets: { populate: { bars: "*" } } },
    });
  });

  test("populates the thumbnail media", () => {
    expect(projectPopulate.thumbnail).toBe(true);
  });
});
