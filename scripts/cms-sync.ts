/**
 * `npm run cms:sync` — pulls each project's content from the running Strapi CMS
 * into the repo, so that the site builds without the CMS.
 *
 * Two things are synced per project:
 *
 *  - the metadata, written into that project's MDX frontmatter;
 *  - the body, written into a `<slug>.body.json` snapshot beside it, along with
 *    the images that body references, downloaded into the repo.
 *
 * The site is generated statically, so CI never reaches the CMS: Neo authors in
 * the Strapi admin locally, runs this once, and commits the result. Matching is
 * by slug, which is the MDX file name; the MDX body is never touched.
 *
 * This is a local authoring tool. It is deliberately not part of the build, the
 * deploy workflow, or any other automation, and it writes nothing unless the CMS
 * answers: use `--dry-run` (`npm run cms:sync:dry`) to see the plan first.
 *
 * Run it with `node scripts/cms-sync.ts`; Node strips the types, which is why the
 * relative imports below carry their `.ts` extension.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import {
  planBodySync,
  snapshotName,
  summarizeBodyPlan,
  type BodySyncEntry,
  type MediaReference,
  type SnapshotSource,
} from "../src/lib/cmsBodies.ts";
import { planSync, summarizePlan, type MdxSource, type SyncPlanEntry } from "../src/lib/cmsSync.ts";
import { fetchStrapiProjectsWithBodies, getStrapiUrl } from "../src/lib/strapi.ts";

/** The content collection directory, resolved from this file so the cwd does not matter. */
const PROJECTS_DIR = new URL("../src/content/projects/", import.meta.url);
/** The repo root, for the repo-relative media paths the snapshots carry. */
const REPO_ROOT = new URL("../", import.meta.url);
const PROJECT_FILE = /\.(md|mdx)$/;

const SKIP_REASON: Record<string, string> = {
  "no-mdx-file": "no MDX file",
  "no-cms-entry": "no CMS entry",
  "unreadable-frontmatter": "unreadable frontmatter",
};

const BODY_SKIP_REASON: Record<string, string> = {
  "no-cms-entry": "no CMS entry",
  "empty-body": "empty body",
};

const STATUS_LABEL: Record<string, string> = {
  updated: "updated",
  unchanged: "unchanged",
  skipped: "skipped",
};

const describeEntry = (entry: SyncPlanEntry, dryRun: boolean): string => {
  const label = entry.status === "updated" && dryRun ? "would update" : STATUS_LABEL[entry.status];
  const note =
    entry.status === "updated"
      ? `(${entry.changedKeys.join(", ")})`
      : entry.status === "skipped"
        ? `- ${SKIP_REASON[entry.reason ?? ""] ?? "skipped"}`
        : "";

  return `  ${(label ?? entry.status).padEnd(13)}${entry.slug.padEnd(24)}${note}`.trimEnd();
};

const describeBodyEntry = (entry: BodySyncEntry, dryRun: boolean): string => {
  const label = entry.status === "updated" && dryRun ? "would update" : STATUS_LABEL[entry.status];
  const note =
    entry.status === "updated"
      ? `(${snapshotName(entry.slug)}, ${entry.media.length} media)`
      : entry.status === "skipped"
        ? `- ${BODY_SKIP_REASON[entry.reason ?? ""] ?? "skipped"}`
        : `(${entry.media.length} media)`;

  return `  ${(label ?? entry.status).padEnd(13)}${entry.slug.padEnd(24)}${note}`.trimEnd();
};

const describeWarnings = (entry: SyncPlanEntry | BodySyncEntry): string[] =>
  entry.warnings.map((warning) => `    ! ${entry.slug}: ${warning}`);

/** Reads a project's snapshot, or null when there is not one yet. */
const readSnapshot = async (slug: string): Promise<string | null> => {
  try {
    return await readFile(new URL(snapshotName(slug), PROJECTS_DIR), "utf8");
  } catch {
    return null;
  }
};

/**
 * Fetches one media file into the repo.
 * Returns "kept" when the file on disk is already byte-identical, so a sync with
 * no CMS changes rewrites nothing.
 */
const downloadMedia = async (
  media: MediaReference,
  baseUrl: string,
): Promise<"written" | "kept" | "failed"> => {
  const target = new URL(media.path, REPO_ROOT);

  try {
    // Strapi returns media urls relative to its own host, so they are resolved
    // against it here. An absolute url is left as it is.
    const response = await fetch(new URL(media.url, baseUrl).toString());
    if (!response.ok) {
      return "failed";
    }

    const next = Buffer.from(await response.arrayBuffer());

    try {
      const current = await readFile(target);
      if (current.equals(next)) {
        return "kept";
      }
    } catch {
      // Not there yet; write it below.
    }

    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, next);
    return "written";
  } catch {
    return "failed";
  }
};

const main = async (): Promise<number> => {
  const dryRun = process.argv.includes("--dry-run");
  const url = getStrapiUrl();

  const files = (await readdir(PROJECTS_DIR)).filter((file) => PROJECT_FILE.test(file)).sort();
  const sources: MdxSource[] = [];
  const paths = new Map<string, URL>();

  for (const file of files) {
    const slug = file.replace(PROJECT_FILE, "");
    if (paths.has(slug)) {
      console.warn(`cms:sync - two files share the slug "${slug}"; only ${file} is used.`);
    }
    paths.set(slug, new URL(file, PROJECTS_DIR));
    sources.push({ slug, source: await readFile(new URL(file, PROJECTS_DIR), "utf8") });
  }

  console.log(`cms:sync - CMS ${url}${dryRun ? " (dry run)" : ""}`);
  console.log(`cms:sync - ${sources.length} project file(s) in src/content/projects`);

  const projects = await fetchStrapiProjectsWithBodies(url);
  if (projects === null) {
    console.error(`cms:sync - the CMS at ${url} did not answer. Nothing was written.`);
    console.error(
      "cms:sync - start it with `npm run cms`, or point STRAPI_URL at a running instance.",
    );
    return 1;
  }

  const snapshots: SnapshotSource[] = [];
  for (const source of sources) {
    snapshots.push({ slug: source.slug, source: await readSnapshot(source.slug) });
  }

  const plan = planSync(projects, sources);
  const summary = summarizePlan(plan);
  const bodyPlan = planBodySync(projects, snapshots);
  const bodySummary = summarizeBodyPlan(bodyPlan);

  console.log("");
  console.log("cms:sync - metadata");
  for (const entry of plan) {
    console.log(describeEntry(entry, dryRun));
    for (const warning of describeWarnings(entry)) {
      console.log(warning);
    }
  }
  console.log(
    `  ${summary.checked} entry(s): ${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, ${summary.skipped} skipped, ${summary.warnings} warning(s)`,
  );

  console.log("");
  console.log("cms:sync - bodies");
  for (const entry of bodyPlan) {
    console.log(describeBodyEntry(entry, dryRun));
    for (const warning of describeWarnings(entry)) {
      console.log(warning);
    }
  }
  console.log(
    `  ${bodySummary.checked} entry(s): ${bodySummary.updated} updated, ` +
      `${bodySummary.unchanged} unchanged, ${bodySummary.skipped} skipped, ` +
      `${bodySummary.media} media, ${bodySummary.warnings} warning(s)`,
  );

  if (dryRun) {
    console.log("");
    console.log("cms:sync - dry run: nothing was written.");
    return 0;
  }

  let written = 0;
  for (const entry of plan) {
    const target = paths.get(entry.slug);
    if (entry.nextSource === null || target === undefined) {
      continue;
    }
    await writeFile(target, entry.nextSource);
    written += 1;
  }

  const media = { written: 0, kept: 0, failed: 0 };
  for (const entry of bodyPlan) {
    for (const reference of entry.media) {
      const result = await downloadMedia(reference, url);
      media[result] += 1;
      if (result === "failed") {
        console.warn(`cms:sync - could not download ${reference.url}`);
      }
    }
    if (entry.nextSnapshot === null) {
      continue;
    }
    await writeFile(new URL(snapshotName(entry.slug), PROJECTS_DIR), entry.nextSnapshot);
    written += 1;
  }

  console.log("");
  console.log(
    `cms:sync - media: ${media.written} downloaded, ${media.kept} already present` +
      (media.failed > 0 ? `, ${media.failed} failed` : ""),
  );
  console.log(
    written === 0
      ? "cms:sync - already in sync, nothing to write."
      : `cms:sync - wrote ${written} file(s); commit them to update the content.`,
  );
  return media.failed > 0 ? 1 : 0;
};

process.exitCode = await main();
