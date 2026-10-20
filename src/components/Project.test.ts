import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import Project from "./Project.astro";
import { bareProject, projects, seniorProject } from "../test/fixtures";

const render = async (entries = projects) => {
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  return container.renderToString(Project, { props: { projects: entries } });
};

describe("Project", () => {
  test("renders a card with a link for every project", async () => {
    const html = await render();

    expect(html).toContain("PROJECTS");
    expect(html.match(/\/projects\//g)?.length).toBe(projects.length);

    for (const project of projects) {
      expect(html).toContain(`/projects/${project.data.slug}`);
      expect(html).toContain(project.data.title);
    }
  });

  test("renders a thumbnail when the project has one, and a placeholder otherwise", async () => {
    const html = await render();

    expect(html).toContain("<img");
    expect(html).toContain("senior.png");
    expect(html).toContain("thumbnail");
  });

  test("renders each technology in a project stack", async () => {
    const html = await render([bareProject]);

    for (const tech of bareProject.data.stack) {
      expect(html).toContain(tech);
    }
  });

  test("renders the English title only when the project sets one", async () => {
    const withEn = await render([seniorProject]);
    const withoutEn = await render([bareProject]);

    expect(withEn).toContain("Exhibition Management System");
    expect(withoutEn).not.toContain("Exhibition Management System");
  });
});
