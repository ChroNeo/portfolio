import { describe, expect, test } from "vitest";
import { collections } from "./content.config";

const schema = collections.projects.schema as {
  safeParse: (value: unknown) => { success: boolean };
};

const parse = (value: unknown) => schema.safeParse(value);

const validProject = {
  slug: "test-project",
  title: "Test Project",
  description: "A short summary",
  stack: ["React", "Fastify"],
  date: "2024-01-01",
};

describe("projects collection schema", () => {
  test("accepts a valid project, coercing the CMS date", () => {
    const result = parse(validProject) as {
      success: boolean;
      data: { date: Date };
    };

    expect(result.success).toBe(true);
    expect(result.data.date).toBeInstanceOf(Date);
  });

  test("defaults tags to an empty array and nullable relations to undefined", () => {
    const result = parse({
      ...validProject,
      tags: null,
      category: null,
      github: null,
      thumbnail: null,
    }) as {
      success: boolean;
      data: { tags: string[]; category?: string; github?: string; thumbnail?: unknown };
    };

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([]);
    expect(result.data.category).toBeUndefined();
    expect(result.data.github).toBeUndefined();
    expect(result.data.thumbnail).toBeUndefined();
  });

  test.each(["slug", "title", "description", "date"])(
    "rejects a project missing %s",
    (field) => {
      const rest: Record<string, unknown> = { ...validProject };
      delete rest[field];

      expect(parse(rest).success).toBe(false);
    },
  );

  test("defaults a missing stack to an empty array", () => {
    const rest: Record<string, unknown> = { ...validProject };
    delete rest.stack;

    expect(parse(rest).success).toBe(true);
  });

  test.each(["github", "demo", "video"])(
    "rejects a malformed %s URL",
    (field) => {
      expect(parse({ ...validProject, [field]: "not-a-url" }).success).toBe(
        false,
      );
    },
  );
});
