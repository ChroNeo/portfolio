/**
 * Pure helpers behind `npm run cms:sync`.
 *
 * Neo authors project metadata in the Strapi admin (locally) and then syncs it
 * into the MDX frontmatter, because the site is generated statically and CI never
 * reaches the CMS. This module decides *what* a sync changes and *how* the
 * frontmatter should be rewritten; it performs no I/O at all (no fs, no network).
 * `scripts/cms-sync.ts` reads and writes the files, and `cmsSync.test.ts` covers
 * the rules below.
 *
 * Rules:
 * 1. only the YAML frontmatter block is rewritten — never the MDX body;
 * 2. `thumbnail` is not a Strapi field, so it is never added, changed or removed;
 * 3. only keys from `STRAPI_FIELDS` are ever written, and no existing key is ever
 *    dropped, so the sync cannot delete frontmatter;
 * 4. a value that already matches is left alone, so a sync with no CMS changes
 *    leaves the file byte-identical (see `planSync`);
 * 5. when a value does change, only the place holding that value is rewritten, so
 *    the diff shows the edit instead of a reformatted block;
 * 6. the file's line endings are preserved (the MDX files are CRLF).
 */
import { parseDocument } from "yaml";
import { mapStrapiProject, type ProjectMetadata, type StrapiProject } from "./strapi.ts";

/** The frontmatter keys the CMS owns, in the order they are reported and written. */
export const STRAPI_FIELDS = [
  "title",
  "titleEn",
  "description",
  "date",
  "stack",
  "tags",
  "category",
  "github",
  "demo",
  "video",
] as const;

export type StrapiField = (typeof STRAPI_FIELDS)[number];

/** Fields the content schema validates with `z.url()` — a bad value would break the build. */
const URL_FIELDS: readonly string[] = ["github", "demo", "video"];

/** The YAML of a frontmatter block. Keys the CMS does not own are carried along untouched. */
export type FrontmatterData = Record<string, unknown>;

export type Eol = "\r\n" | "\n";

/** Where the YAML sits inside the file, so a rewrite can leave every other byte alone. */
export interface FrontmatterBlock {
  /** the YAML between the fences, without the fence lines or their line endings */
  yaml: string;
  /** the line ending the file uses — the file is written back with the same one */
  eol: Eol;
  /** offset of `yaml` in the source */
  offset: number;
  /** offset of the closing fence in the source */
  fence: number;
}

/**
 * Locates the frontmatter block at the top of an MDX file.
 * Returns null when the file does not open with a fence or the fence is never closed.
 */
export const readFrontmatter = (source: string): FrontmatterBlock | null => {
  const opening = /^---[ \t]*(\r\n|\n)/.exec(source);
  if (opening === null) {
    return null;
  }

  const offset = opening[0].length;
  // The closing fence has to be a line of its own, so `---` inside a value cannot
  // end the block. `m` makes `^` match each line start, including an empty block
  // whose fence sits directly on the line after the opening one.
  const closing = /^---[ \t]*(?=\r\n|\n|$)/gm;
  closing.lastIndex = offset;
  const match = closing.exec(source);
  if (match === null) {
    return null;
  }

  let yamlEnd = match.index;
  if (source.slice(yamlEnd - 2, yamlEnd) === "\r\n") {
    yamlEnd -= 2;
  } else if (source[yamlEnd - 1] === "\n") {
    yamlEnd -= 1;
  }

  return {
    yaml: source.slice(offset, yamlEnd),
    eol: opening[1] === "\r\n" ? "\r\n" : "\n",
    offset,
    fence: match.index,
  };
};

/**
 * Parses a frontmatter block into a plain object.
 * Throws when the YAML is invalid or is not a map, so the caller can skip the file
 * with a warning instead of writing something the build would reject.
 */
export const parseFrontmatter = (block: FrontmatterBlock): FrontmatterData => {
  const document = parseDocument(block.yaml);
  const problem = document.errors[0];
  if (problem !== undefined) {
    throw new Error(problem.message);
  }

  const data = document.toJS() as unknown;
  if (data === null || data === undefined) {
    return {};
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("frontmatter is not a YAML map");
  }

  return { ...(data as FrontmatterData) };
};

const toDateOnly = (value: Date): string =>
  Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);

/** Reads a frontmatter value as `YYYY-MM-DD`, or null when it is not a usable date. */
const asDateOnly = (value: unknown): string | null => {
  if (value instanceof Date) {
    const text = toDateOnly(value);
    return text === "" ? null : text;
  }
  if (typeof value === "string") {
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }
  return null;
};

/** True when the frontmatter already holds exactly this metadata value. */
const alreadyMatches = (existing: unknown, next: string | string[] | Date): boolean => {
  if (next instanceof Date) {
    const current = asDateOnly(existing);
    return current !== null && current === toDateOnly(next);
  }

  if (Array.isArray(next)) {
    return (
      Array.isArray(existing) &&
      existing.length === next.length &&
      existing.every((item, index) => item === next[index])
    );
  }

  return typeof existing === "string" && existing === next;
};

const isHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Writes one value the way these files already write it: `"text"`, `["a", "b"]`, `2026-04-01`. */
export const serializeValue = (value: unknown): string => {
  if (value instanceof Date) {
    return toDateOnly(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  }
  return JSON.stringify(value);
};

export interface MergeResult {
  /** the frontmatter with the CMS metadata applied (a new object) */
  data: FrontmatterData;
  /** the keys the CMS actually changes, in `STRAPI_FIELDS` order */
  changedKeys: StrapiField[];
  /** values that were skipped rather than written */
  warnings: string[];
}

/**
 * Merges the metadata Strapi owns into a frontmatter object.
 *
 * A field Strapi left blank is already missing from the metadata, so an absent
 * field always means "the frontmatter keeps its own value" — the CMS can add or
 * update a field but never blanks one out. A `github`/`demo`/`video` value that is
 * not an http(s) URL is skipped with a warning, because the content schema
 * validates those with `z.url()` and writing it would break the build.
 */
export const mergeMetadata = (
  frontmatter: FrontmatterData,
  metadata: ProjectMetadata,
): MergeResult => {
  const data: FrontmatterData = { ...frontmatter };
  const changedKeys: StrapiField[] = [];
  const warnings: string[] = [];

  for (const field of STRAPI_FIELDS) {
    const next = metadata[field];
    if (next === undefined) {
      continue;
    }

    if (URL_FIELDS.includes(field) && !isHttpUrl(next)) {
      warnings.push(`${field}: skipped "${String(next)}" — not an http(s) URL`);
      continue;
    }

    if (alreadyMatches(frontmatter[field], next)) {
      continue;
    }

    data[field] = next;
    changedKeys.push(field);
  }

  return { data, changedKeys, warnings };
};

interface RangedNode {
  range?: readonly [number, number, number];
}

/**
 * Rewrites only the values the metadata changed, in place.
 *
 * Every other byte of the file survives: the MDX body, `thumbnail`, the key order,
 * comments, and the line endings. A key the frontmatter does not have yet is
 * appended as a new line before the closing fence.
 */
export const writeFrontmatter = (
  source: string,
  block: FrontmatterBlock,
  merge: MergeResult,
): string => {
  const document = parseDocument(block.yaml);
  const edits: { start: number; end: number; text: string }[] = [];
  const additions: { field: StrapiField; text: string }[] = [];

  for (const field of merge.changedKeys) {
    const text = serializeValue(merge.data[field]);
    const node = document.get(field, true) as unknown as RangedNode | undefined;

    if (node?.range === undefined) {
      additions.push({ field, text });
    } else {
      edits.push({ start: node.range[0], end: node.range[1], text });
    }
  }

  // Last edit first, so the offsets of the edits before it stay valid.
  let yaml = block.yaml;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    yaml = `${yaml.slice(0, edit.start)}${edit.text}${yaml.slice(edit.end)}`;
  }

  if (additions.length > 0) {
    const separator = yaml.length === 0 || yaml.endsWith("\n") ? "" : block.eol;
    const lines = additions.map(({ field, text }) => `${field}: ${text}`).join(block.eol);
    yaml += `${separator}${lines}`;
  }

  // The gap between the YAML and the closing fence is normally the line ending; an
  // empty block has none, and needs one as soon as anything is written into it.
  const gap = source.slice(block.offset + block.yaml.length, block.fence);
  const separator = gap.length > 0 ? gap : block.eol;

  return `${source.slice(0, block.offset)}${yaml}${separator}${source.slice(block.fence)}`;
};

/** An MDX file as read from disk: the slug is its file name without the extension. */
export interface MdxSource {
  slug: string;
  source: string;
}

export type SyncStatus = "updated" | "unchanged" | "skipped";

export type SkipReason = "no-cms-entry" | "no-mdx-file" | "unreadable-frontmatter";

export interface SyncPlanEntry {
  slug: string;
  /** true when the CMS metadata changes the frontmatter */
  changed: boolean;
  /** the file to write, or null when nothing should be written */
  nextSource: string | null;
  warnings: string[];
  status: SyncStatus;
  reason?: SkipReason;
  /** the frontmatter keys the CMS changes, in `STRAPI_FIELDS` order */
  changedKeys: StrapiField[];
}

const skipped = (slug: string, reason: SkipReason, warnings: string[] = []): SyncPlanEntry => ({
  slug,
  changed: false,
  nextSource: null,
  warnings,
  status: "skipped",
  reason,
  changedKeys: [],
});

/**
 * Works out what a sync would do to each file, without touching anything.
 *
 * The plan holds one entry per MDX file plus one per CMS entry that has no MDX
 * file (`skipped` / `no-mdx-file`), and an entry with `nextSource === null` always
 * means "write nothing". Matching is by slug, which is the MDX file name.
 */
export const planSync = (
  strapiProjects: readonly StrapiProject[],
  mdxSources: readonly MdxSource[],
): SyncPlanEntry[] => {
  const bySlug = new Map<string, StrapiProject>();
  for (const project of strapiProjects) {
    const slug = project?.slug?.trim();
    if (slug !== undefined && slug !== "" && !bySlug.has(slug)) {
      bySlug.set(slug, project);
    }
  }

  const entries: SyncPlanEntry[] = [];
  const seen = new Set<string>();

  for (const mdx of [...mdxSources].sort((a, b) => a.slug.localeCompare(b.slug))) {
    seen.add(mdx.slug);

    const project = bySlug.get(mdx.slug);
    if (project === undefined) {
      entries.push(skipped(mdx.slug, "no-cms-entry"));
      continue;
    }

    const block = readFrontmatter(mdx.source);
    if (block === null) {
      entries.push(skipped(mdx.slug, "unreadable-frontmatter", ["no YAML frontmatter — left as-is"]));
      continue;
    }

    let merge: MergeResult;
    try {
      merge = mergeMetadata(parseFrontmatter(block), mapStrapiProject(project));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      entries.push(
        skipped(mdx.slug, "unreadable-frontmatter", [`unreadable frontmatter (${reason}) — left as-is`]),
      );
      continue;
    }

    const written = merge.changedKeys.length > 0 ? writeFrontmatter(mdx.source, block, merge) : null;
    // Belt and braces for rule 4: if the rewrite produced the same bytes, there is
    // nothing to report and nothing to write.
    const nextSource = written !== null && written !== mdx.source ? written : null;

    entries.push({
      slug: mdx.slug,
      changed: nextSource !== null,
      nextSource,
      warnings: merge.warnings,
      status: nextSource === null ? "unchanged" : "updated",
      changedKeys: nextSource === null ? [] : merge.changedKeys,
    });
  }

  for (const slug of [...bySlug.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(slug)) {
      entries.push(skipped(slug, "no-mdx-file"));
    }
  }

  return entries;
};

export interface SyncSummary {
  checked: number;
  updated: number;
  unchanged: number;
  skipped: number;
  warnings: number;
}

export const summarizePlan = (plan: readonly SyncPlanEntry[]): SyncSummary => ({
  checked: plan.length,
  updated: plan.filter((entry) => entry.status === "updated").length,
  unchanged: plan.filter((entry) => entry.status === "unchanged").length,
  skipped: plan.filter((entry) => entry.status === "skipped").length,
  warnings: plan.reduce((total, entry) => total + entry.warnings.length, 0),
});
