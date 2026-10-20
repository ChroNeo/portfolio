import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer as reactContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import type { CollectionEntry } from "astro:content";
import ProjectPage from "./[project].astro";
import { bareProject, makeProject, seniorProject } from "../../test/fixtures";

const renderers = await loadRenderers([reactContainerRenderer()]);

const render = (entry: CollectionEntry<"projects">) =>
  AstroContainer.create({ renderers }).then((container) =>
    container.renderToString(ProjectPage, { props: { project: entry } }),
  );

describe("[project] page", () => {
  test("renders the header, metadata and body for a project", async () => {
    const entry = makeProject({
      title: "Rendered Project",
      description: "Rendered description",
      body: [{ __component: "blocks.rich-text", html: "<p>Article text</p>" }],
      headings: [{ depth: 2, slug: "intro", text: "Intro" }],
    });
    const html = await render(entry);

    expect(html).toContain("Rendered Project");
    expect(html).toContain("Rendered description");
    expect(html).toContain("Article text");
    expect(html).toContain("/#projects");
    expect(html).toContain("prose");
  });

  test("shows the category badge, with a fallback when unset", async () => {
    const withHtml = await render(seniorProject);
    const withoutHtml = await render(bareProject);

    expect(withHtml).toContain("Senior Project");
    expect(withoutHtml).toContain(">Project<");
  });

  test("renders the English title and GitHub link when set", async () => {
    const html = await render(seniorProject);

    expect(html).toContain("Exhibition Management System");
    expect(html).toContain(`href="${seniorProject.data.github}"`);
  });

  test("renders the demo link only when the project sets one", async () => {
    const withDemo = makeProject({ demo: "https://example.com/demo" });
    const withHtml = await render(withDemo);
    const withoutHtml = await render(bareProject);

    expect(withHtml).toContain('href="https://example.com/demo"');
    expect(withHtml).toContain("Live demo");
    expect(withoutHtml).not.toContain("Live demo");
  });

  test("renders a thumbnail from the CMS when the project has one", async () => {
    const html = await render(seniorProject);

    expect(html).toContain("project-image");
    expect(html).toContain("senior.png");
  });

  test("builds the table of contents from the body headings", async () => {
    const entry = makeProject({
      body: [{ __component: "blocks.rich-text", html: '<h2 id="deck">The deck</h2>' }],
      headings: [{ depth: 2, slug: "deck", text: "The deck" }],
    });
    const html = await render(entry);

    expect(html).toContain("The deck");
    expect(html).toContain('href="#deck"');
  });
});
