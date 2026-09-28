import { describe, expect, test } from "vitest";
import { SiFastify, SiJavascript, SiReact } from "react-icons/si";
import { getCollection } from "astro:content";
import { getTechIcon, hasTechIcon } from "./techIcons";

describe("getTechIcon", () => {
  test("returns the mapped icon for a known technology", () => {
    expect(getTechIcon("React")).toBe(SiReact);
    expect(getTechIcon("Fastify")).toBe(SiFastify);
  });

  test("falls back to the JavaScript icon for unknown technologies", () => {
    expect(getTechIcon("SomeUnknownTech")).toBe(SiJavascript);
    expect(getTechIcon("")).toBe(SiJavascript);
  });
});

describe("hasTechIcon", () => {
  test("reports support for known technologies only", () => {
    expect(hasTechIcon("React")).toBe(true);
    expect(hasTechIcon("SomeUnknownTech")).toBe(false);
    expect(hasTechIcon("")).toBe(false);
  });

  test("every stack entry used in content is supported", async () => {
    const projects = await getCollection("projects");
    const stacks = projects.flatMap((project) => project.data.stack);

    expect(stacks.length).toBeGreaterThan(0);
    for (const tech of stacks) {
      expect(hasTechIcon(tech), `no icon mapped for "${tech}"`).toBe(true);
    }
  });
});
