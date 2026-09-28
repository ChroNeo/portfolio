import { describe, expect, test } from "vitest";
import { getStaticPaths } from "./[project].astro";

describe("getStaticPaths", () => {
  test("generates one route per project keyed by `project`", async () => {
    const paths = await getStaticPaths();

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(Object.keys(path.params)).toEqual(["project"]);
      expect(path.params.project).toBeTruthy();
      expect(path.props.project.id).toBe(path.params.project);
    }
  });

  test("orders projects newest first by date", async () => {
    const paths = await getStaticPaths();
    const dates = paths.map((path) => path.props.project.data.date.valueOf());

    expect(dates.length).toBeGreaterThan(1);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
