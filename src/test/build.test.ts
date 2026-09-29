import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getCollection } from "astro:content";
import { describe, expect, test } from "vitest";

const astroCli = fileURLToPath(
  new URL("../../node_modules/astro/bin/astro.mjs", import.meta.url),
);

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

describe("build output", () => {
  test("the pages directory contains only pages or _-prefixed files", () => {
    for (const file of listFiles("src/pages")) {
      const name = file.split("/").pop() ?? "";

      expect(
        name.endsWith(".astro") || name.startsWith("_"),
        `"${file}" would be published as a route`,
      ).toBe(true);
    }
  });

  test("a production build emits exactly the expected routes", async () => {
    execFileSync(process.execPath, [astroCli, "build"], {
      stdio: "pipe",
      timeout: 120_000,
    });

    expect(existsSync("dist/index.html")).toBe(true);

    const projects = await getCollection("projects");
    expect(readdirSync("dist/projects").sort()).toEqual(
      projects.map((project) => project.id).sort(),
    );
    for (const project of projects) {
      expect(existsSync(`dist/projects/${project.id}/index.html`)).toBe(true);
    }
  }, 120_000);
});
