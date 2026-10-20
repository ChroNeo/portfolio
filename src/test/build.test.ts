import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

  test("a production build emits a page per CMS project, linked from the homepage", async () => {
    execFileSync(process.execPath, [astroCli, "build"], {
      stdio: "pipe",
      timeout: 120_000,
    });

    expect(existsSync("dist/index.html")).toBe(true);

    const routes = readdirSync("dist/projects").sort();
    expect(routes.length).toBeGreaterThan(0);

    const home = readFileSync("dist/index.html", "utf8");
    for (const slug of routes) {
      expect(existsSync(`dist/projects/${slug}/index.html`)).toBe(true);
      expect(home).toContain(`/projects/${slug}`);
    }
  }, 120_000);
});
