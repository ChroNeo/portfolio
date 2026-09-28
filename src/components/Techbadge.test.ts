import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import TechBadge from "./Techbadge.astro";

describe("TechBadge", () => {
  test("renders the technology name and reason", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TechBadge, {
      props: {
        name: "Redis",
        reason: "Pub/sub across multiple Node instances",
      },
    });

    expect(html).toContain("Redis");
    expect(html).toContain("Pub/sub across multiple Node instances");
  });
});
