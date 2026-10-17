import { describe, expect, test } from "vitest";
import {
  applyMediaPaths,
  collectMedia,
  mediaFileName,
  planBodySync,
  serializeSnapshot,
  summarizeBodyPlan,
  type SnapshotSource,
} from "./cmsBodies";
import type { ProjectBodyBlock } from "./strapiBlocks";
import type { StrapiProjectWithBody } from "./strapi";

const project = (slug: string, body: unknown): StrapiProjectWithBody =>
  ({ slug, body, title: null } as unknown as StrapiProjectWithBody);

const CMS = "http://localhost:1337";

const bodyWithGallery = (): ProjectBodyBlock[] => [
  { __component: "blocks.rich-text", content: [{ type: "paragraph", children: [] }] },
  {
    __component: "blocks.gallery",
    title: "Screens",
    images: [
      { url: `${CMS}/uploads/checkin_qr.png`, alternativeText: "Check-in" },
      { url: `${CMS}/uploads/survey.png`, alternativeText: "Survey" },
    ],
  },
];

describe("mediaFileName", () => {
  test("takes the last path segment", () => {
    expect(mediaFileName(`${CMS}/uploads/checkin_qr.png`)).toBe("checkin_qr.png");
  });

  test("strips a query string", () => {
    expect(mediaFileName(`${CMS}/uploads/checkin_qr.png?updated_at=1`)).toBe("checkin_qr.png");
  });

  test("decodes percent-encoding", () => {
    expect(mediaFileName(`${CMS}/uploads/%E0%B8%A0%E0%B8%B2%E0%B8%9E.png`)).toBe("ภาพ.png");
  });

  test("returns an empty string for a url with no file", () => {
    expect(mediaFileName(`${CMS}/uploads/`)).toBe("");
    expect(mediaFileName("")).toBe("");
  });
});

describe("collectMedia", () => {
  test("finds media in galleries, image blocks and rich text", () => {
    const body: ProjectBodyBlock[] = [
      { __component: "blocks.image", image: { url: `${CMS}/uploads/hero.png` } },
      ...bodyWithGallery(),
      {
        __component: "blocks.rich-text",
        content: [{ type: "image", image: { url: `${CMS}/uploads/inline.png` } }],
      },
    ];

    const media = collectMedia(body, "demo");

    expect(media.map((reference) => reference.path)).toEqual([
      "src/assets/images/projects/demo/hero.png",
      "src/assets/images/projects/demo/checkin_qr.png",
      "src/assets/images/projects/demo/survey.png",
      "src/assets/images/projects/demo/inline.png",
    ]);
  });

  test("never treats a rich-text link as a file", () => {
    const body: ProjectBodyBlock[] = [
      {
        __component: "blocks.rich-text",
        content: [
          {
            type: "paragraph",
            children: [{ type: "link", url: "https://example.com", children: [] }],
          },
        ],
      },
    ];

    expect(collectMedia(body, "demo")).toEqual([]);
  });

  test("lists each file once, even when a body references it twice", () => {
    const body: ProjectBodyBlock[] = [
      { __component: "blocks.image", image: { url: `${CMS}/uploads/hero.png` } },
      { __component: "blocks.image", image: { url: `${CMS}/uploads/hero.png` } },
    ];

    expect(collectMedia(body, "demo")).toHaveLength(1);
  });
});

describe("applyMediaPaths", () => {
  test("adds the repo path to every media reference", () => {
    const body = bodyWithGallery();
    const media = collectMedia(body, "demo");
    const applied = applyMediaPaths(body, media);

    const gallery = applied[1] as { images: { localPath?: string }[] };
    expect(gallery.images.map((image) => image.localPath)).toEqual([
      "src/assets/images/projects/demo/checkin_qr.png",
      "src/assets/images/projects/demo/survey.png",
    ]);
  });

  test("leaves the original body untouched", () => {
    const body = bodyWithGallery();
    applyMediaPaths(body, collectMedia(body, "demo"));

    const gallery = body[1] as { images: { localPath?: string }[] };
    expect(gallery.images[0].localPath).toBeUndefined();
  });

  test("keeps the CMS url alongside the local path", () => {
    const body = bodyWithGallery();
    const applied = applyMediaPaths(body, collectMedia(body, "demo"));

    const gallery = applied[1] as { images: { url: string }[] };
    expect(gallery.images[0].url).toBe(`${CMS}/uploads/checkin_qr.png`);
  });
});

describe("serializeSnapshot", () => {
  test("is readable, stable and newline-terminated", () => {
    const body = [{ __component: "blocks.tech-badge", name: "Fastify", reason: "Fast" }];
    const text = serializeSnapshot(body);

    expect(text.endsWith("\n")).toBe(true);
    expect(text).toContain("\n  ");
    expect(text).toBe(serializeSnapshot(body));
  });
});

describe("planBodySync", () => {
  const existing = (slug: string, body: ProjectBodyBlock[]): SnapshotSource => ({
    slug,
    source: serializeSnapshot(applyMediaPaths(body, collectMedia(body, slug))),
  });

  test("writes a snapshot when there is none yet", () => {
    const body = bodyWithGallery();
    const plan = planBodySync([project("demo", body)], [{ slug: "demo", source: null }]);

    expect(plan[0].status).toBe("updated");
    expect(plan[0].nextSnapshot).toBe(serializeSnapshot(applyMediaPaths(body, collectMedia(body, "demo"))));
  });

  test("reports no change when the snapshot already matches", () => {
    const body = bodyWithGallery();
    const plan = planBodySync([project("demo", body)], [existing("demo", body)]);

    expect(plan[0].status).toBe("unchanged");
    expect(plan[0].nextSnapshot).toBeNull();
  });

  test("skips a project with no CMS entry", () => {
    const plan = planBodySync([], [{ slug: "demo", source: null }]);

    expect(plan[0]).toMatchObject({ status: "skipped", reason: "no-cms-entry" });
  });

  test("skips an empty body rather than writing a blank page", () => {
    const plan = planBodySync([project("demo", [])], [{ slug: "demo", source: null }]);

    expect(plan[0]).toMatchObject({ status: "skipped", reason: "empty-body", warnings: [] });
  });

  test("warns instead of deleting a snapshot when the CMS body empties", () => {
    const plan = planBodySync([project("demo", null)], [{ slug: "demo", source: "[{}]\n" }]);

    expect(plan[0].status).toBe("skipped");
    expect(plan[0].warnings[0]).toContain("kept the existing snapshot");
  });

  test("lists the media a snapshot needs, even when it is unchanged", () => {
    const body = bodyWithGallery();
    const plan = planBodySync([project("demo", body)], [existing("demo", body)]);

    expect(plan[0].media).toHaveLength(2);
  });

  test("orders entries by slug", () => {
    const plan = planBodySync(
      [project("b", bodyWithGallery()), project("a", bodyWithGallery())],
      [
        { slug: "b", source: null },
        { slug: "a", source: null },
      ],
    );

    expect(plan.map((entry) => entry.slug)).toEqual(["a", "b"]);
  });
});

describe("summarizeBodyPlan", () => {
  test("counts each status, the media and the warnings", () => {
    const body = bodyWithGallery();
    const plan = planBodySync(
      [project("a", body), project("b", []), project("c", null)],
      [
        { slug: "a", source: null },
        { slug: "b", source: null },
        { slug: "c", source: "[{}]\n" },
      ],
    );

    expect(summarizeBodyPlan(plan)).toEqual({
      checked: 3,
      updated: 1,
      unchanged: 0,
      skipped: 2,
      media: 2,
      warnings: 1,
    });
  });
});
