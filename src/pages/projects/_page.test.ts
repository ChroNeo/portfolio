import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer as reactContainerRenderer } from "@astrojs/react/container-renderer";
import { getContainerRenderer as mdxContainerRenderer } from "@astrojs/mdx/container-renderer";
import { describe, expect, test } from "vitest";
import { getCollection } from "astro:content";
import ProjectPage from "./[project].astro";

const renderers = await loadRenderers([
  reactContainerRenderer(),
  mdxContainerRenderer(),
]);

const render = (entry: Awaited<ReturnType<typeof getCollection>>[number]) =>
  AstroContainer.create({ renderers }).then((container) =>
    container.renderToString(ProjectPage, { props: { project: entry } }),
  );

describe("[project] page", () => {
  test("renders the header, metadata and MDX body for a project", async () => {
    const projects = await getCollection("projects");
    const html = await render(projects[0]);

    expect(html).toContain(projects[0].data.title);
    expect(html).toContain(projects[0].data.description);
    expect(html).toContain("/portfolio/#projects");
    expect(html).toContain("prose");
  });

  test("shows the category badge, with a fallback when unset", async () => {
    const projects = await getCollection("projects");
    const withCategory = projects.find((entry) => entry.data.category);
    const withoutCategory = projects.find((entry) => !entry.data.category);
    expect(withCategory, "expected a project with a category").toBeDefined();
    expect(
      withoutCategory,
      "expected a project without a category",
    ).toBeDefined();

    const withHtml = await render(withCategory!);
    const withoutHtml = await render(withoutCategory!);

    expect(withHtml).toContain(withCategory!.data.category!);
    expect(withoutHtml).toContain(">Project<");
  });

  test("renders the English title and GitHub link when set", async () => {
    const projects = await getCollection("projects");
    const linked = projects.find(
      (entry) => entry.data.titleEn && entry.data.github,
    );
    expect(
      linked,
      "expected a project with an English title and a GitHub link",
    ).toBeDefined();

    const html = await render(linked!);

    expect(html).toContain(linked!.data.titleEn!);
    expect(html).toContain(`href="${linked!.data.github}"`);
  });

  test("renders the demo link only when the project sets one", async () => {
    const projects = await getCollection("projects");
    const entry = projects[0];
    const withDemo = {
      ...entry,
      data: { ...entry.data, demo: "https://example.com/demo" },
    } as typeof entry;

    const withHtml = await render(withDemo);
    const withoutHtml = await render(entry);

    expect(withHtml).toContain('href="https://example.com/demo"');
    expect(withHtml).toContain("Live demo");
    expect(withoutHtml).not.toContain("Live demo");
  });
});
