import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import TableOfContents from "./TableOfContents.astro";

const headings = [
  { depth: 2, text: "Problem", slug: "problem" },
  { depth: 3, text: "Details", slug: "details" },
];

const renderers = await loadRenderers([getContainerRenderer()]);

const render = (items: typeof headings) =>
  AstroContainer.create({ renderers }).then((container) =>
    container.renderToString(TableOfContents, { props: { headings: items } }),
  );

describe("TableOfContents", () => {
  test("renders an anchor for every heading", async () => {
    const html = await render(headings);

    expect(html).toContain('href="#problem"');
    expect(html).toContain('href="#details"');
    expect(html).toContain('id="toc-problem"');
    expect(html).toContain('id="toc-details"');
  });

  test("exposes each heading's depth on both the mobile and desktop tables", async () => {
    const html = await render(headings);

    expect(html.match(/data-depth="2"/g)).toHaveLength(2);
    expect(html.match(/data-depth="3"/g)).toHaveLength(2);
  });

  test("renders no entries when there are no headings", async () => {
    const html = await render([]);

    expect(html).not.toContain("data-depth=");
    expect(html).not.toContain('href="#');
  });
});
