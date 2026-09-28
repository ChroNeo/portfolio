import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import { getCollection } from "astro:content";
import Project from "./Project.astro";

const render = async () => {
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  return container.renderToString(Project);
};

describe("Project", () => {
  test("renders a card with a link for every project", async () => {
    const projects = await getCollection("projects");
    const html = await render();

    expect(html).toContain("PROJECTS");
    expect(html).toContain("<img");
    expect(html.match(/\/portfolio\/projects\//g)?.length).toBe(
      projects.length,
    );

    for (const project of projects) {
      expect(html).toContain(`/portfolio/projects/${project.id}`);
      expect(html).toContain(project.data.title);
    }
  });

  test("renders each technology in a project stack", async () => {
    const projects = await getCollection("projects");
    const html = await render();

    for (const project of projects) {
      for (const tech of project.data.stack) {
        expect(html).toContain(tech);
      }
    }
  });
});
