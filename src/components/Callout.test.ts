import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Callout from "./Callout.astro";

const renderCallout = (type?: "info" | "warning" | "success") =>
  AstroContainer.create().then((container) =>
    container.renderToString(Callout, {
      ...(type ? { props: { type } } : {}),
      slots: { default: "Heads up, this is a note." },
    }),
  );

describe("Callout", () => {
  test("renders slot content for the default type", async () => {
    const html = await renderCallout();

    expect(html).toContain("Heads up, this is a note.");
  });

  test("renders slot content for every callout type", async () => {
    for (const type of ["info", "warning", "success"] as const) {
      const html = await renderCallout(type);

      expect(html).toContain("Heads up, this is a note.");
    }
  });
});
