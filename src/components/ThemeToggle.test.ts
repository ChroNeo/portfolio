import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { describe, expect, test } from "vitest";
import ThemeToggle from "./ThemeToggle.astro";

const render = async () => {
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  return container.renderToString(ThemeToggle);
};

describe("ThemeToggle", () => {
  test("renders an accessible toggle button", async () => {
    const html = await render();

    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('aria-label="Toggle theme"');
  });

  test("renders both a light and a dark icon", async () => {
    const html = await render();

    expect(html).toContain("dark:hidden");
    expect(html).toContain("dark:block");
  });
});
