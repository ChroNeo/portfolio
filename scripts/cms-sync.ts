/**
 * `npm run cms:sync` — pulls each project's metadata from the running Strapi CMS and
 * writes the changed values into that project's MDX frontmatter.
 *
 * The site is generated statically, so CI never reaches the CMS: Neo authors the
 * metadata in the Strapi admin locally, runs this once, and commits the result.
 * Matching is by slug, which is the MDX file name; the MDX body is never touched.
 *
 * This is a local authoring tool. It is deliberately not part of the build, the
 * deploy workflow, or any other automation, and it writes nothing unless the CMS
 * answers: use `--dry-run` (`npm run cms:sync:dry`) to see the plan first.
 *
 * Run it with `node scripts/cms-sync.ts`; Node strips the types, which is why the
 * relative imports below carry their `.ts` extension.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { planSync, summarizePlan, type MdxSource, type SyncPlanEntry } from "../src/lib/cmsSync.ts";
import { fetchStrapiProjects, getStrapiUrl } from "../src/lib/strapi.ts";

/** The content collection directory, resolved from this file so the cwd does not matter. */
const PROJECTS_DIR = new URL("../src/content/projects/", import.meta.url);
const PROJECT_FILE = /\.(md|mdx)$/;

const SKIP_REASON: Record<string, string> = {
  "no-mdx-file": "no MDX file",
  "no-cms-entry": "no CMS entry",
  "unreadable-frontmatter": "unreadable frontmatter",
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

const describeWarnings = (entry: SyncPlanEntry): string[] =>
  entry.warnings.map((warning) => `    ! ${entry.slug}: ${warning}`);

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

  const projects = await fetchStrapiProjects(url);
  if (projects === null) {
    console.error(`cms:sync - the CMS at ${url} did not answer. Nothing was written.`);
    console.error(
      "cms:sync - start it with `npm run cms`, or point STRAPI_URL at a running instance.",
    );
    return 1;
  }

  const plan = planSync(projects, sources);
  const summary = summarizePlan(plan);

  console.log("");
  for (const entry of plan) {
    console.log(describeEntry(entry, dryRun));
    for (const warning of describeWarnings(entry)) {
      console.log(warning);
    }
  }
  console.log("");
  console.log(
    `cms:sync - ${summary.checked} entry(s): ${summary.updated} updated, ` +
      `${summary.unchanged} unchanged, ${summary.skipped} skipped, ${summary.warnings} warning(s)`,
  );

  if (dryRun) {
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

  console.log(
    written === 0
      ? "cms:sync - already in sync, nothing to write."
      : `cms:sync - wrote ${written} file(s); commit them to update the metadata.`,
  );
  return 0;
};

process.exitCode = await main();
