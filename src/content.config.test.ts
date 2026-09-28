import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { collections } from "./content.config";

const schema = collections.projects
  .schema as (ctx: { image: () => unknown }) => {
  safeParse: (value: unknown) => { success: boolean };
};

const parse = (value: unknown) =>
  schema({ image: () => z.string() }).safeParse(value);

const validProject = {
  title: "Test Project",
  description: "A short summary",
  stack: ["React", "Fastify"],
  date: new Date("2024-01-01"),
};

describe("projects collection schema", () => {
  test("accepts a valid project", () => {
    expect(parse(validProject).success).toBe(true);
  });

  test("defaults tags to an empty array", () => {
    const result = parse(validProject) as {
      success: boolean;
      data: { tags: string[] };
    };

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([]);
  });

  test.each(["title", "description", "stack", "date"])(
    "rejects a project missing %s",
    (field) => {
      const rest: Record<string, unknown> = { ...validProject };
      delete rest[field];

      expect(parse(rest).success).toBe(false);
    },
  );

  test.each(["github", "demo", "video"])(
    "rejects a malformed %s URL",
    (field) => {
      expect(parse({ ...validProject, [field]: "not-a-url" }).success).toBe(
        false,
      );
    },
  );
});
