/**
 * Pure helpers behind the body half of `npm run cms:sync`.
 *
 * The build never reaches the CMS, so a sync snapshots each project's body into
 * a committed file beside its MDX, and downloads the images that body
 * references into the repo. This module decides what a snapshot contains and
 * what a sync would change; it performs no I/O at all.
 *
 * Rules:
 * 1. the MDX body is never touched — a snapshot is a separate file;
 * 2. a snapshot is only written when its content actually changes, so a sync
 *    with no CMS changes leaves every file byte-identical;
 * 3. every media reference gains a repo-relative `localPath`, so the build never
 *    reaches the CMS for an image;
 * 4. the JSON is written the same way every time, so diffs stay readable.
 */
import type { StrapiMedia } from "./strapiBlocks.ts";
import type { StrapiProjectWithBody } from "./strapi.ts";

/** Where CMS media is downloaded to, relative to the repo root. */
export const MEDIA_ROOT = "src/assets/images/projects";

/** The committed file holding a project's body, beside its MDX file. */
export const snapshotName = (slug: string): string => `${slug}.body.json`;

export interface MediaReference {
  /** the absolute URL the CMS serves the file from */
  url: string;
  /** the repo-relative path the file belongs at */
  path: string;
}

/**
 * True for a media object.
 *
 * A rich-text link node also carries a `url`, so `type` is checked: a link is
 * not a file, and downloading one would be a nasty surprise.
 */
const isMedia = (value: unknown): value is StrapiMedia => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { type?: unknown; url?: unknown };
  return typeof candidate.url === "string" && candidate.url !== "" && candidate.type !== "link";
};

const walk = (value: unknown, visit: (media: StrapiMedia) => void): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visit);
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (isMedia(value)) {
    visit(value);
    return;
  }
  for (const child of Object.values(value)) {
    walk(child, visit);
  }
};

/** The file name a media URL ends with, decoded and with any query stripped. */
export const mediaFileName = (url: string): string => {
  const path = url.split("?")[0] ?? url;
  // A url that ends in a separator points at a directory, not a file.
  if (path === "" || path.endsWith("/")) {
    return "";
  }
  const last = path.split("/").pop() ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

/** Every media file a body references, in document order, without duplicates. */
export const collectMedia = (body: unknown, slug: string): MediaReference[] => {
  const found = new Map<string, MediaReference>();

  walk(body, (media) => {
    if (found.has(media.url)) {
      return;
    }
    const file = mediaFileName(media.url);
    if (file === "") {
      return;
    }
    found.set(media.url, { url: media.url, path: `${MEDIA_ROOT}/${slug}/${file}` });
  });

  return [...found.values()];
};

/** A copy of the body with every media reference pointing at its repo path. */
export const applyMediaPaths = <T>(body: T, references: readonly MediaReference[]): T => {
  const byUrl = new Map(references.map((reference) => [reference.url, reference.path]));
  const copy = structuredClone(body) as T;

  walk(copy, (media) => {
    const path = byUrl.get(media.url);
    if (path !== undefined) {
      media.localPath = path;
    }
  });

  return copy;
};

/** The snapshot text: stable and readable, so a diff shows the edit and nothing else. */
export const serializeSnapshot = (body: unknown): string => `${JSON.stringify(body, null, 2)}\n`;

/** A snapshot as it currently sits on disk, or null when there is none yet. */
export interface SnapshotSource {
  slug: string;
  source: string | null;
}

export type BodySyncStatus = "updated" | "unchanged" | "skipped";

export type BodySkipReason = "no-cms-entry" | "empty-body";

export interface BodySyncEntry {
  slug: string;
  status: BodySyncStatus;
  reason?: BodySkipReason;
  /** the file to write, or null when nothing should be written */
  nextSnapshot: string | null;
  /** media the body references; the caller makes sure each file exists */
  media: MediaReference[];
  warnings: string[];
}

const skipped = (
  slug: string,
  reason: BodySkipReason,
  warnings: string[] = [],
): BodySyncEntry => ({
  slug,
  status: "skipped",
  reason,
  nextSnapshot: null,
  media: [],
  warnings,
});

/**
 * Works out what a sync would do to each project's body snapshot.
 *
 * One entry per MDX file, in slug order. An entry whose `nextSnapshot` is null
 * always means "write nothing". A body that is empty in the CMS is skipped
 * rather than written, because an empty snapshot would render a blank page; when
 * one already exists that is worth knowing about, so it warns instead of
 * quietly deleting the file.
 */
export const planBodySync = (
  projects: readonly StrapiProjectWithBody[],
  snapshots: readonly SnapshotSource[],
): BodySyncEntry[] => {
  const bySlug = new Map<string, StrapiProjectWithBody>();
  for (const project of projects) {
    const slug = project?.slug?.trim();
    if (slug !== undefined && slug !== "" && !bySlug.has(slug)) {
      bySlug.set(slug, project);
    }
  }

  return [...snapshots]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((snapshot): BodySyncEntry => {
      const project = bySlug.get(snapshot.slug);
      if (project === undefined) {
        return skipped(snapshot.slug, "no-cms-entry");
      }

      const body = project.body;
      if (!Array.isArray(body) || body.length === 0) {
        return skipped(
          snapshot.slug,
          "empty-body",
          snapshot.source === null
            ? []
            : ["the CMS has no body for this project — kept the existing snapshot"],
        );
      }

      const media = collectMedia(body, snapshot.slug);
      const nextSnapshot = serializeSnapshot(applyMediaPaths(body, media));
      const changed = nextSnapshot !== snapshot.source;

      return {
        slug: snapshot.slug,
        status: changed ? "updated" : "unchanged",
        nextSnapshot: changed ? nextSnapshot : null,
        media,
        warnings: [],
      };
    });
};

export interface BodySyncSummary {
  checked: number;
  updated: number;
  unchanged: number;
  skipped: number;
  media: number;
  warnings: number;
}

export const summarizeBodyPlan = (plan: readonly BodySyncEntry[]): BodySyncSummary => ({
  checked: plan.length,
  updated: plan.filter((entry) => entry.status === "updated").length,
  unchanged: plan.filter((entry) => entry.status === "unchanged").length,
  skipped: plan.filter((entry) => entry.status === "skipped").length,
  media: plan.reduce((total, entry) => total + entry.media.length, 0),
  warnings: plan.reduce((total, entry) => total + entry.warnings.length, 0),
});
