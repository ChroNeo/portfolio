import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import ProjectBody from "./ProjectBody.astro";
import type { ProjectBodyBlock } from "../lib/strapiBlocks";

const render = async (blocks?: ProjectBodyBlock[] | null) => {
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  return container.renderToString(ProjectBody, { props: { blocks } });
};

/** One of every block type the content model can produce. */
const EVERY_BLOCK: ProjectBodyBlock[] = [
  {
    __component: "blocks.rich-text",
    html: '<h2 id="intro">Intro</h2><p>Body copy</p>',
  },
  {
    __component: "blocks.callout",
    type: "warning",
    bodyHtml: "<p>Careful now</p>",
  },
  {
    __component: "blocks.data-table",
    caption: "Test results",
    headers: ["Module", "Result"],
    rows: [
      ["Auth", "Pass"],
      ["Survey", "Pass"],
    ],
  },
  {
    __component: "blocks.image",
    image: {
      url: "http://localhost:1337/uploads/dashboard.png",
      alternativeText: "A screenshot of the dashboard",
      width: 1200,
      height: 800,
    },
    caption: "The dashboard",
  },
  {
    __component: "blocks.gallery",
    title: "Screens",
    images: [
      { url: "http://localhost:1337/uploads/first.png", alternativeText: "First screen" },
    ],
  },
  {
    __component: "blocks.benchmark",
    source: "fastify.dev",
    datasets: [
      {
        label: "Requests",
        unit: "req/s",
        note: "higher is better",
        bars: [{ name: "Fastify", value: 45000, version: "v5" }],
      },
    ],
  },
  {
    __component: "blocks.flow-diagram",
    label: "Architecture",
    steps: [{ label: "Client" }, { label: "Server", note: "Fastify" }],
  },
  {
    __component: "blocks.project-glance",
    title: "Overview",
    items: [{ label: "Type", value: "Web App" }],
    stack: ["React"],
  },
  {
    __component: "blocks.tech-badge",
    name: "Fastify",
    reason: "Fast and simple",
  },
];

describe("ProjectBody", () => {
  test("renders one of every block type", async () => {
    const html = await render(EVERY_BLOCK);

    expect(html).toContain("Intro");
    expect(html).toContain("Careful now");
    expect(html).toContain("Test results");
    expect(html).toContain("The dashboard");
    expect(html).toContain("Screens");
    expect(html).toContain("Architecture");
    expect(html).toContain("Overview");
    expect(html).toContain("Fast and simple");
  });

  test("injects pre-rendered rich text as markup, keeping heading anchors", async () => {
    const html = await render([
      { __component: "blocks.rich-text", html: '<h2 id="intro">Intro</h2>' },
    ]);

    expect(html).toContain('id="intro"');
    expect(html).not.toContain("&lt;h2");
  });

  test("renders the callout's rich body inside the callout", async () => {
    const html = await render([
      { __component: "blocks.callout", type: "info", bodyHtml: "<p>Inner note</p>" },
    ]);

    expect(html).toContain("Inner note");
  });

  test("renders every table cell and the caption", async () => {
    const html = await render([EVERY_BLOCK[2]]);

    expect(html).toContain("Module");
    expect(html).toContain("Auth");
    expect(html).toContain("Survey");
    expect(html).toContain("Pass");
    expect(html).toContain("Test results");
  });

  test("renders an image with its alt text and caption", async () => {
    const html = await render([EVERY_BLOCK[3]]);

    expect(html).toContain("<img");
    expect(html).toContain("A screenshot of the dashboard");
    expect(html).toContain("The dashboard");
  });

  test("renders benchmark values, flow steps and glance items", async () => {
    const html = await render([EVERY_BLOCK[5], EVERY_BLOCK[6], EVERY_BLOCK[7]]);

    expect(html).toContain("Requests");
    expect(html).toContain("45000");
    expect(html).toContain("Client");
    expect(html).toContain("Server");
    expect(html).toContain("Web App");
  });

  test("converts string benchmark values to numbers", async () => {
    const html = await render([
      {
        __component: "blocks.benchmark",
        datasets: [
          {
            label: "Latency",
            unit: "ms",
            note: "lower is better",
            bars: [{ name: "Fastify", value: "12.5", version: "v5" }],
          },
        ],
      },
    ]);

    expect(html).toContain("Latency");
    expect(html).toContain("12.5");
  });

  test("renders nothing for an empty or missing body", async () => {
    expect((await render([])).trim()).toBe("");
    expect((await render(null)).trim()).toBe("");
    expect((await render(undefined)).trim()).toBe("");
  });

  test("skips a block it does not recognise instead of failing the page", async () => {
    const html = await render([
      { __component: "blocks.unknown" } as unknown as ProjectBodyBlock,
      { __component: "blocks.rich-text", html: "<p>Survives</p>" },
    ]);

    expect(html).toContain("Survives");
  });

  test("skips an image block that has no image", async () => {
    const html = await render([
      { __component: "blocks.image", image: null },
      { __component: "blocks.rich-text", html: "<p>Still here</p>" },
    ]);

    expect(html).toContain("Still here");
  });
});
