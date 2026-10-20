import { describe, expect, test } from "vitest";
import { staticPathsFor } from "./_staticPaths";
import { bareProject, projects, seniorProject } from "../../test/fixtures";

describe("getStaticPaths", () => {
  test("generates one route per project keyed by `project`", () => {
    const paths = staticPathsFor(projects);

    expect(paths.length).toBe(projects.length);
    for (const path of paths) {
      expect(Object.keys(path.params)).toEqual(["project"]);
      expect(path.params.project).toBeTruthy();
      expect(path.props.project.data.slug).toBe(path.params.project);
    }
  });

  test("orders projects newest first by date", () => {
    const paths = staticPathsFor([bareProject, seniorProject]);
    const dates = paths.map((path) => path.props.project.data.date.valueOf());

    expect(dates.length).toBeGreaterThan(1);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test("does not mutate the collection it is given", () => {
    const original = [bareProject, seniorProject];
    staticPathsFor(original);

    expect(original).toEqual([bareProject, seniorProject]);
  });
});
