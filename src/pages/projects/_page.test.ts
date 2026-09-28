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

  test("renders the English title and demo/GitHub links when set", async () => {
    const projects = await getCollection("projects");
    const linked = projects.find(
      (entry) => entry.data.titleEn && entry.data.github && entry.data.demo,
    );
    expect(
      linked,
      "expected a project with an English title, github and demo links",
    ).toBeDefined();

    const html = await render(linked!);

    expect(html).toContain(linked!.data.titleEn!);
    expect(html).toContain(`href="${linked!.data.github}"`);
    expect(html).toContain(`href="${linked!.data.demo}"`);
  });
});
