import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchStrapiProjects, mapStrapiProject, type StrapiProject } from "./strapi";

const strapiProject = (overrides: Partial<StrapiProject> = {}): StrapiProject => ({
  slug: "test",
  title: "CollaDoc",
  titleEn: null,
  description: "Real-time collaborative document editor",
  date: "2024-05-20",
  stack: ["React", "Redis"],
  tags: null,
  category: null,
  github: "https://github.com/yourname/colladoc",
  demo: "https://colladoc.vercel.app",
  video: null,
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapStrapiProject", () => {
  test("maps every scalar field it is given", () => {
    const metadata = mapStrapiProject(
      strapiProject({
        title: "ระบบนิทรรศการ",
        titleEn: "Exhibition Management System",
        description: "ผู้จัดงานคุมทุกอย่างจากเว็บเดียว",
        category: "Senior Project",
        github: "https://github.com/ChroNeo/ems",
        demo: "https://ems.example.com",
        video: "https://youtu.be/example",
      }),
    );

    expect(metadata).toEqual({
      title: "ระบบนิทรรศการ",
      titleEn: "Exhibition Management System",
      description: "ผู้จัดงานคุมทุกอย่างจากเว็บเดียว",
      category: "Senior Project",
      github: "https://github.com/ChroNeo/ems",
      demo: "https://ems.example.com",
      video: "https://youtu.be/example",
      date: new Date("2024-05-20"),
      stack: ["React", "Redis"],
    });
  });

  test("parses the date into a Date", () => {
    const metadata = mapStrapiProject(strapiProject({ date: "2026-04-01" }));

    expect(metadata.date).toBeInstanceOf(Date);
    expect(metadata.date?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  test("maps the stack and tags arrays", () => {
    const metadata = mapStrapiProject(
      strapiProject({ stack: ["React", "Docker"], tags: ["web", "line"] }),
    );

    expect(metadata.stack).toEqual(["React", "Docker"]);
    expect(metadata.tags).toEqual(["web", "line"]);
  });

  test("omits fields Strapi left empty so the frontmatter keeps them", () => {
    const metadata = mapStrapiProject({
      slug: "test",
      title: "CollaDoc",
      titleEn: null,
      description: "",
      date: null,
      stack: null,
      tags: null,
      category: "   ",
      github: null,
      demo: null,
      video: null,
    });

    expect(metadata).toEqual({ title: "CollaDoc" });
  });

  test("drops an unparseable date and empty array entries", () => {
    const metadata = mapStrapiProject(
      strapiProject({ date: "not-a-date", stack: ["", "React"], tags: [] }),
    );

    expect(metadata.date).toBeUndefined();
    expect(metadata.stack).toEqual(["React"]);
    expect(metadata.tags).toBeUndefined();
  });
});

describe("fetchStrapiProjects", () => {
  test("returns the projects from the API", async () => {
    const projects = [strapiProject()];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ data: projects })));

    await expect(fetchStrapiProjects("http://strapi.test")).resolves.toEqual(projects);
  });

  test("returns an empty list when the CMS has no projects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ data: [] })));

    await expect(fetchStrapiProjects("http://strapi.test")).resolves.toEqual([]);
  });

  test("returns null when the CMS is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:1337");
      }),
    );

    await expect(fetchStrapiProjects("http://strapi.test")).resolves.toBeNull();
  });

  test("returns null when the CMS answers with an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "boom" }, 500)));

    await expect(fetchStrapiProjects("http://strapi.test")).resolves.toBeNull();
  });
});
