import { describe, expect, test } from "vitest";
import { mapStrapiProject, type StrapiProject } from "./strapi";
import {
  mergeMetadata,
  parseFrontmatter,
  planSync,
  readFrontmatter,
  serializeValue,
  summarizePlan,
  writeFrontmatter,
  type Eol,
  type MergeResult,
  type MdxSource,
} from "./cmsSync";

/** Builds an MDX file the way the repo stores them: a fence, the YAML, then the body. */
const buildMdx = (
  lines: string[],
  eol: Eol = "\r\n",
  body: string[] = ["# Title", "", "Body."],
): string => ["---", ...lines, "---", ...body].join(eol);

const strapiProject = (overrides: Partial<StrapiProject> = {}): StrapiProject => ({
  slug: "test",
  title: "CollaDoc",
  titleEn: null,
  description: "Real-time collaborative document editor",
  date: "2024-05-20",
  stack: ["React", "Socket.io", "Redis", "PostgreSQL"],
  tags: null,
  category: null,
  github: "https://github.com/yourname/colladoc",
  demo: "https://colladoc.vercel.app",
  video: null,
  ...overrides,
});

/** The frontmatter of the repo's `test.mdx`, whose CMS entry is `TEST_CMS`. */
const TEST_LINES = [
  'title: "CollaDoc"',
  'description: "Real-time collaborative document editor"',
  'stack: ["React", "Socket.io", "Redis", "PostgreSQL"]',
  'github: "https://github.com/yourname/colladoc"',
  'demo: "https://colladoc.vercel.app"',
  "date: 2024-05-20",
  'thumbnail: "../../assets/images/projects/test.jpg"',
];

/** The repo's `senior_project.mdx`: a multi-line flow stack, a Thai title, a thumbnail. */
const SENIOR_LINES = [
  'title: "ระบบการจัดการนิทรรศการและการมีส่วนร่วม"',
  'titleEn: "Exhibition Management System"',
  'description: "ผู้จัดงานคุมทุกอย่างจากเว็บเดียว"',
  "stack:",
  "  [",
  '    "React",',
  '    "TypeScript",',
  '    "Fastify",',
  '    "Node.js",',
  '    "MySQL",',
  '    "LINE Messaging API",',
  '    "Docker",',
  "  ]",
  'github: "https://github.com/ChroNeo/exhibitions-management-system"',
  "date: 2026-04-01",
  'thumbnail: "../../assets/images/projects/test.jpg"',
  'category: "Senior Project"',
];

const TEST_BODY = ["# CollaDoc", "", "Body text that must never change."];

const TEST_MDX = buildMdx(TEST_LINES, "\r\n", TEST_BODY);
const SENIOR_MDX = buildMdx(SENIOR_LINES, "\r\n", ["# Senior", "", "Thai body."]);

/** The CMS entries as they are live today — the ones a sync must find nothing to do with. */
const TEST_CMS = strapiProject();
const SENIOR_CMS = strapiProject({
  slug: "senior_project",
  title: "ระบบการจัดการนิทรรศการและการมีส่วนร่วม",
  titleEn: "Exhibition Management System",
  description: "ผู้จัดงานคุมทุกอย่างจากเว็บเดียว",
  date: "2026-04-01",
  stack: ["React", "TypeScript", "Fastify", "Node.js", "MySQL", "LINE Messaging API", "Docker"],
  category: "Senior Project",
  github: "https://github.com/ChroNeo/exhibitions-management-system",
  demo: null,
});

/** A CMS entry with every project's own field left blank, for tests about adding keys. */
const bareCms = (overrides: Partial<StrapiProject> = {}): StrapiProject =>
  strapiProject({
    title: null,
    titleEn: null,
    description: null,
    date: null,
    stack: null,
    tags: null,
    category: null,
    github: null,
    demo: null,
    video: null,
    ...overrides,
  });

const blockOf = (source: string) => {
  const block = readFrontmatter(source);
  if (block === null) {
    throw new Error("fixture has no frontmatter");
  }
  return block;
};

const mergeOf = (source: string, project: StrapiProject): MergeResult =>
  mergeMetadata(parseFrontmatter(blockOf(source)), mapStrapiProject(project));

const sources = (...files: MdxSource[]): MdxSource[] => files;

describe("readFrontmatter", () => {
  test("finds the block, its line ending and where the fences sit", () => {
    const block = blockOf(TEST_MDX);

    expect(block.eol).toBe("\r\n");
    expect(block.offset).toBe(5);
    expect(block.yaml).toBe(TEST_LINES.join("\r\n"));
    expect(block.yaml.endsWith("\r")).toBe(false);
    expect(TEST_MDX.slice(block.fence, block.fence + 3)).toBe("---");
  });

  test("finds an LF block without inventing carriage returns", () => {
    const block = blockOf(buildMdx(TEST_LINES, "\n"));

    expect(block.eol).toBe("\n");
    expect(block.yaml).toBe(TEST_LINES.join("\n"));
  });

  test("reads a file whose frontmatter ends at the last line", () => {
    expect(blockOf(['---', 'title: "Test"', "---"].join("\r\n")).yaml).toBe('title: "Test"');
  });

  test("reads an empty block, whose fences sit on consecutive lines", () => {
    const block = blockOf("---\r\n---\r\n\r\nBody");

    expect(block.yaml).toBe("");
    expect(block.eol).toBe("\r\n");
    expect(block.fence).toBe(5);
  });

  test("returns null when there is no opening fence", () => {
    expect(readFrontmatter("# Title\n\nBody")).toBeNull();
    expect(readFrontmatter(" ---\ntitle: x\n---\n")).toBeNull();
  });

  test("returns null when the fence is never closed", () => {
    expect(readFrontmatter("---\ntitle: x\n\nBody")).toBeNull();
  });
});

describe("parseFrontmatter", () => {
  test("parses scalars, lists and the plain date", () => {
    expect(parseFrontmatter(blockOf(TEST_MDX))).toEqual({
      title: "CollaDoc",
      description: "Real-time collaborative document editor",
      stack: ["React", "Socket.io", "Redis", "PostgreSQL"],
      github: "https://github.com/yourname/colladoc",
      demo: "https://colladoc.vercel.app",
      date: "2024-05-20",
      thumbnail: "../../assets/images/projects/test.jpg",
    });
  });

  test("parses the multi-line flow list", () => {
    expect(parseFrontmatter(blockOf(SENIOR_MDX)).stack).toEqual([
      "React",
      "TypeScript",
      "Fastify",
      "Node.js",
      "MySQL",
      "LINE Messaging API",
      "Docker",
    ]);
  });

  test("returns an empty object for an empty block", () => {
    expect(parseFrontmatter(blockOf("---\r\n---\r\n\r\nBody"))).toEqual({});
  });

  test("throws on invalid YAML so the caller can skip the file", () => {
    expect(() => parseFrontmatter(blockOf("---\r\ntitle: [1, 2\r\n---\r\n"))).toThrow();
  });

  test("throws when the block is a list rather than a map", () => {
    expect(() => parseFrontmatter(blockOf("---\r\n- a\r\n- b\r\n---\r\n"))).toThrow(/not a YAML map/);
  });
});

describe("mergeMetadata", () => {
  test("changes nothing when the CMS already matches the frontmatter", () => {
    const merge = mergeOf(SENIOR_MDX, SENIOR_CMS);

    expect(merge.changedKeys).toEqual([]);
    expect(merge.warnings).toEqual([]);
    expect(merge.data.stack).toEqual(SENIOR_CMS.stack);
    expect(merge.data.thumbnail).toBe("../../assets/images/projects/test.jpg");
  });

  test("reports the keys the CMS changes, in field order", () => {
    const merge = mergeOf(
      TEST_MDX,
      strapiProject({ description: "New description", date: "2024-06-01" }),
    );

    expect(merge.changedKeys).toEqual(["description", "date"]);
    expect(merge.data.date).toBeInstanceOf(Date);
  });

  test("compares dates by day, so a CMS timestamp is not a change", () => {
    const merge = mergeOf(TEST_MDX, strapiProject({ date: "2024-05-20T00:00:00.000Z" }));

    expect(merge.changedKeys).toEqual([]);
  });

  test("adds keys the frontmatter does not have yet", () => {
    const merge = mergeOf(TEST_MDX, strapiProject({ tags: ["web", "line"], category: "Demo" }));

    expect(merge.changedKeys).toEqual(["tags", "category"]);
    expect(merge.data.tags).toEqual(["web", "line"]);
  });

  test("ignores the fields Strapi left blank", () => {
    const merge = mergeOf(
      TEST_MDX,
      strapiProject({ title: null, titleEn: null, demo: null, tags: null }),
    );

    expect(merge.changedKeys).toEqual([]);
    expect(merge.data.demo).toBe("https://colladoc.vercel.app");
    expect(merge.data).toHaveProperty("thumbnail");
  });

  test("compares lists by value and order", () => {
    const same = mergeOf(TEST_MDX, strapiProject({ stack: ["React", "Socket.io", "Redis", "PostgreSQL"] }));
    const reordered = mergeOf(TEST_MDX, strapiProject({ stack: ["PostgreSQL", "React"] }));
    const longer = mergeOf(
      TEST_MDX,
      strapiProject({ stack: ["React", "Socket.io", "Redis", "PostgreSQL", "Extra"] }),
    );

    expect(same.changedKeys).toEqual([]);
    expect(reordered.changedKeys).toEqual(["stack"]);
    expect(longer.changedKeys).toEqual(["stack"]);
  });

  test("never touches thumbnail, which Strapi does not own", () => {
    const merge = mergeOf(SENIOR_MDX, { ...SENIOR_CMS, title: "New title" });

    expect(merge.data.thumbnail).toBe("../../assets/images/projects/test.jpg");
    expect(merge.changedKeys).not.toContain("thumbnail");
  });

  test("skips a github/demo/video value that is not an http(s) URL", () => {
    const merge = mergeOf(
      TEST_MDX,
      strapiProject({
        github: "github.com/yourname/colladoc",
        demo: "javascript:alert(1)",
        video: "https://youtu.be/example",
      }),
    );

    expect(merge.changedKeys).toEqual(["video"]);
    expect(merge.warnings).toHaveLength(2);
    expect(merge.warnings[0]).toContain("github");
    expect(merge.warnings[1]).toContain("demo");
    expect(merge.data.github).toBe("https://github.com/yourname/colladoc");
  });

  test("accepts http and https", () => {
    const merge = mergeOf(
      TEST_MDX,
      strapiProject({ demo: "http://colladoc.test", video: "https://youtu.be/x" }),
    );

    expect(merge.changedKeys).toEqual(["demo", "video"]);
    expect(merge.warnings).toEqual([]);
  });
});

describe("serializeValue", () => {
  test("quotes text the way the files already do, keeping Thai as-is", () => {
    expect(serializeValue("CollaDoc")).toBe('"CollaDoc"');
    expect(serializeValue("ระบบการจัดการนิทรรศการ")).toBe('"ระบบการจัดการนิทรรศการ"');
  });

  test("writes a date as the frontmatter's plain YYYY-MM-DD", () => {
    expect(serializeValue(new Date("2026-04-01"))).toBe("2026-04-01");
  });

  test("writes a list in flow style", () => {
    expect(serializeValue(["React", "Socket.io"])).toBe('["React", "Socket.io"]');
  });
});

describe("writeFrontmatter", () => {
  test("rewrites only the value that changed and keeps every other byte", () => {
    const merge = mergeOf(TEST_MDX, strapiProject({ description: "A new description" }));
    const written = writeFrontmatter(TEST_MDX, blockOf(TEST_MDX), merge);
    const expected = buildMdx(
      TEST_LINES.map((line) =>
        line.startsWith("description:") ? 'description: "A new description"' : line,
      ),
      "\r\n",
      TEST_BODY,
    );

    expect(written).toBe(expected);
    expect(written).toContain('thumbnail: "../../assets/images/projects/test.jpg"');
    expect(written).toContain("Body text that must never change.");
  });

  test("keeps CRLF files CRLF", () => {
    const merge = mergeOf(TEST_MDX, strapiProject({ title: "Renamed" }));
    const written = writeFrontmatter(TEST_MDX, blockOf(TEST_MDX), merge);

    expect(written).toContain("\r\n");
    expect(written).not.toMatch(/(^|[^\r])\n/);
  });

  test("keeps LF files LF", () => {
    const source = buildMdx(TEST_LINES, "\n");
    const written = writeFrontmatter(source, blockOf(source), mergeOf(source, strapiProject({ title: "Renamed" })));

    expect(written).not.toContain("\r");
    expect(written).toContain('title: "Renamed"');
  });

  test("replaces a multi-line list without touching the lines around it", () => {
    const merge = mergeOf(SENIOR_MDX, { ...SENIOR_CMS, stack: ["React", "Docker"] });
    const written = writeFrontmatter(SENIOR_MDX, blockOf(SENIOR_MDX), merge);

    expect(written).toContain('stack:\r\n  ["React", "Docker"]\r\n');
    expect(written).toContain("date: 2026-04-01");
    expect(written).toContain('category: "Senior Project"');
    expect(parseFrontmatter(blockOf(written)).stack).toEqual(["React", "Docker"]);
  });

  test("appends a new key just before the closing fence", () => {
    const merge = mergeOf(TEST_MDX, strapiProject({ tags: ["web", "line"] }));
    const written = writeFrontmatter(TEST_MDX, blockOf(TEST_MDX), merge);

    expect(written).toBe(buildMdx([...TEST_LINES, 'tags: ["web", "line"]'], "\r\n", TEST_BODY));
  });

  test("adds a key to an empty frontmatter block", () => {
    const source = "---\r\n---\r\n\r\nBody";
    const written = writeFrontmatter(
      source,
      blockOf(source),
      mergeOf(source, bareCms({ title: "Fresh" })),
    );

    expect(written).toBe('---\r\ntitle: "Fresh"\r\n---\r\n\r\nBody');
  });

  test("returns the source untouched when nothing changed", () => {
    const merge = mergeOf(SENIOR_MDX, SENIOR_CMS);

    expect(writeFrontmatter(SENIOR_MDX, blockOf(SENIOR_MDX), merge)).toBe(SENIOR_MDX);
  });
});

describe("planSync", () => {
  test("does nothing when the CMS data is the frontmatter's own data", () => {
    const plan = planSync([TEST_CMS], sources({ slug: "test", source: TEST_MDX }));

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      slug: "test",
      status: "unchanged",
      changed: false,
      nextSource: null,
      changedKeys: [],
      warnings: [],
    });
  });

  test("does nothing for the repo's senior_project entry either", () => {
    const plan = planSync([SENIOR_CMS], sources({ slug: "senior_project", source: SENIOR_MDX }));

    expect(plan[0]?.nextSource).toBeNull();
    expect(plan[0]?.status).toBe("unchanged");
  });

  test("plans a write for the values the CMS changed", () => {
    const plan = planSync(
      [{ ...TEST_CMS, title: "CollaDoc 2", date: "2024-06-01" }],
      sources({ slug: "test", source: TEST_MDX }),
    );

    expect(plan[0]?.status).toBe("updated");
    expect(plan[0]?.changedKeys).toEqual(["title", "date"]);
    expect(plan[0]?.nextSource).toContain('title: "CollaDoc 2"');
    expect(plan[0]?.nextSource).toContain("date: 2024-06-01");
  });

  test("is idempotent: its own output reports no further change", () => {
    const cms = { ...TEST_CMS, title: "CollaDoc 2", tags: ["web"] };
    const first = planSync([cms], sources({ slug: "test", source: TEST_MDX }));
    const written = first[0]?.nextSource ?? "";
    const second = planSync([cms], sources({ slug: "test", source: written }));

    expect(written).not.toBe("");
    expect(second[0]).toMatchObject({ status: "unchanged", changed: false, nextSource: null });
  });

  test("keeps everything from the closing fence onwards byte-identical", () => {
    const plan = planSync([{ ...TEST_CMS, title: "CollaDoc 2" }], sources({ slug: "test", source: TEST_MDX }));
    const written = plan[0]?.nextSource ?? "";

    expect(written.slice(blockOf(written).fence)).toBe(TEST_MDX.slice(blockOf(TEST_MDX).fence));
    expect(written).toContain("Body text that must never change.");
  });

  test("skips a CMS entry that has no MDX file instead of creating one", () => {
    const plan = planSync(
      [strapiProject({ slug: "project", title: "test" })],
      sources({ slug: "test", source: TEST_MDX }),
    );

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ slug: "test", status: "skipped", reason: "no-cms-entry" });
    expect(plan[1]).toMatchObject({
      slug: "project",
      status: "skipped",
      reason: "no-mdx-file",
      nextSource: null,
    });
  });

  test("skips an MDX file that has no CMS entry and leaves it alone", () => {
    const source = buildMdx(['title: "Test"', 'description: "TEst"', "date: 2024-05-20"]);
    const plan = planSync([TEST_CMS], sources({ slug: "projects", source }));

    expect(plan[0]).toMatchObject({
      slug: "projects",
      status: "skipped",
      reason: "no-cms-entry",
      nextSource: null,
      changedKeys: [],
    });
  });

  test("skips a file with no frontmatter, with a warning", () => {
    const plan = planSync([TEST_CMS], sources({ slug: "test", source: "# Just a body\n" }));

    expect(plan[0]).toMatchObject({ status: "skipped", reason: "unreadable-frontmatter" });
    expect(plan[0]?.warnings[0]).toContain("no YAML frontmatter");
  });

  test("skips a file whose frontmatter does not parse, with a warning", () => {
    const plan = planSync(
      [TEST_CMS],
      sources({ slug: "test", source: "---\r\ntitle: [1, 2\r\n---\r\n" }),
    );

    expect(plan[0]).toMatchObject({ status: "skipped", reason: "unreadable-frontmatter" });
    expect(plan[0]?.warnings[0]).toContain("unreadable frontmatter");
  });

  test("orders the plan by slug for a stable report", () => {
    const plan = planSync(
      [strapiProject({ slug: "bbb" }), strapiProject({ slug: "aaa" })],
      sources(
        { slug: "bbb", source: TEST_MDX },
        { slug: "aaa", source: buildMdx(TEST_LINES, "\r\n", ["# A"]) },
      ),
    );

    expect(plan.map((entry) => entry.slug)).toEqual(["aaa", "bbb"]);
  });
});

describe("summarizePlan", () => {
  test("counts the plan", () => {
    const plan = planSync(
      [{ ...TEST_CMS, title: "CollaDoc 2" }, strapiProject({ slug: "project", title: "test" })],
      sources(
        { slug: "test", source: TEST_MDX },
        { slug: "projects", source: buildMdx(["title: \"Test\""]) },
      ),
    );

    expect(summarizePlan(plan)).toEqual({
      checked: 3,
      updated: 1,
      unchanged: 0,
      skipped: 2,
      warnings: 0,
    });
  });
});
