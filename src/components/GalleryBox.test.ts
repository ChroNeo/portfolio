import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import { describe, expect, test } from "vitest";
import GalleryBox from "./GalleryBox.astro";
import problemImage from "../assets/images/projects/problem.png";

const items = [
  { src: problemImage, alt: "ภาพที่หนึ่ง", caption: "คำอธิบายหนึ่ง" },
  { src: problemImage, alt: "ภาพที่สอง" },
  { src: problemImage, alt: "ภาพที่สาม", caption: "คำอธิบายสาม" },
];

const renderGallery = (props: { items: typeof items }) =>
  AstroContainer.create().then((container) => {
    container.addServerRenderer({ renderer: reactRenderer });
    return container.renderToString(GalleryBox, { props });
  });

describe("GalleryBox", () => {
  test("renders a slide for every item", async () => {
    const html = await renderGallery({ items });

    for (const item of items) {
      expect(html).toContain(item.alt);
    }
  });

  test("renders captions when provided", async () => {
    const html = await renderGallery({ items });

    expect(html).toContain("คำอธิบายหนึ่ง");
    expect(html).toContain("คำอธิบายสาม");
  });

  test("renders navigation controls and one dot per item", async () => {
    const html = await renderGallery({ items });

    expect(html).toContain("gallery-prev");
    expect(html).toContain("gallery-next");
    expect(html.match(/gallery-dot/g)?.length).toBe(items.length);
  });

  test("counter shows the first slide out of the total", async () => {
    const html = await renderGallery({ items });

    expect(html).toContain(`1 / ${items.length}`);
  });

  test("hides controls when there is a single item", async () => {
    const html = await renderGallery({ items: [items[0]] });

    expect(html).not.toContain("gallery-prev");
    expect(html).not.toContain("gallery-next");
    expect(html).not.toContain("gallery-counter");
  });
});
