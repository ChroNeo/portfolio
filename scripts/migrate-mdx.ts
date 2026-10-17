/**
 * `node scripts/migrate-mdx.ts <file.mdx> [--dry-run]` — one-off migration tool.
 *
 * Reads a hand-written MDX project document, converts it into a Strapi project
 * body, uploads the images it references to the Media Library, and writes the
 * body onto the matching project entry. The MDX file itself is never modified:
 * the body reaches the repo through `npm run cms:sync` afterwards.
 *
 * Credentials come from the environment:
 *   STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD   (an admin login), or
 *   STRAPI_TOKEN                                 (an API token with upload rights)
 *
 * Run it with `--dry-run` first: it prints the migration report and writes
 * nothing anywhere.
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMdx, readImageImports, toProjectBody, type ConversionResult, type MediaMeta } from "../src/lib/mdxToBlocks.ts";
import { getStrapiUrl } from "../src/lib/strapi.ts";
import type { ProjectBodyBlock, StrapiMedia } from "../src/lib/strapiBlocks.ts";

const REPO_ROOT = new URL("../", import.meta.url);

const usage = (): never => {
  console.error("usage: node scripts/migrate-mdx.ts <path/to/project.mdx> [--dry-run]");
  process.exit(2);
};

/**
 * Removes the leading YAML frontmatter.
 *
 * The MDX parser has no notion of frontmatter: left in, the block becomes a
 * thematic break followed by a paragraph, and the metadata ends up rendered as
 * body content.
 */
export const stripFrontmatter = (source: string): string => {
  const match = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  return match === null ? source : source.slice(match[0].length);
};

const file = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
if (file === undefined) {
  usage();
}

const dryRun = process.argv.includes("--dry-run");
const url = getStrapiUrl();

/* ---------------------------------------------------------------- auth */

const adminToken = async (): Promise<string> => {
  const token = process.env.STRAPI_TOKEN;
  if (token !== undefined && token !== "") {
    return token;
  }

  const email = process.env.STRAPI_ADMIN_EMAIL;
  const password = process.env.STRAPI_ADMIN_PASSWORD;
  if (email === undefined || password === undefined) {
    console.error(
      "migrate - set STRAPI_TOKEN, or STRAPI_ADMIN_EMAIL and STRAPI_ADMIN_PASSWORD.",
    );
    process.exit(1);
  }

  const response = await fetch(`${url}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    console.error(`migrate - admin login failed (${response.status}).`);
    process.exit(1);
  }

  const payload = (await response.json()) as { data?: { token?: string } };
  const issued = payload.data?.token;
  if (issued === undefined) {
    console.error("migrate - admin login returned no token.");
    process.exit(1);
  }
  return issued;
};

/* ---------------------------------------------------------------- upload */

const upload = async (path: string, token: string): Promise<number> => {
  const name = basename(path);

  // Re-running the migration must not pile up copies in the Media Library, so an
  // existing file with the same name is reused.
  const existing = await fetch(
    `${url}/upload/files?filters[name][$eq]=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (existing.ok) {
    const payload = (await existing.json()) as unknown;
    // Strapi 5 paginates this endpoint; older shapes return a bare array.
    const files: { id?: number; name?: string }[] = Array.isArray(payload)
      ? (payload as { id?: number; name?: string }[])
      : (((payload as { results?: unknown[] }).results ?? []) as { id?: number; name?: string }[]);
    const match = files.find((file) => file.name === name);
    if (match?.id !== undefined) {
      return match.id;
    }
  }

  const absolute = new URL(path, REPO_ROOT);
  const bytes = await readFile(absolute);

  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(bytes)]), name);

  const response = await fetch(`${url}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`upload failed for ${path} (${response.status})`);
  }

  const payload = (await response.json()) as { id?: number }[] | { id?: number };
  const first = Array.isArray(payload) ? payload[0] : payload;
  if (first?.id === undefined) {
    throw new Error(`upload of ${path} returned no id`);
  }
  return first.id;
};

/** Sets the alt text and caption on an uploaded file, so accessibility survives. */
const describe = async (id: number, meta: MediaMeta, token: string): Promise<void> => {
  // The admin route takes the editable metadata under `fileInfo`; a bare body is
  // accepted with a 200 and silently ignored.
  const response = await fetch(`${url}/upload/files/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fileInfo: {
        alternativeText: meta.alternativeText ?? null,
        caption: meta.caption ?? null,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`could not set the metadata of media ${id} (${response.status})`);
  }
};

/** Replaces the media placeholders the converter produced with real media ids. */
const withMediaIds = (
  blocks: ProjectBodyBlock[],
  ids: Map<string, number>,
): ProjectBodyBlock[] =>
  blocks.map((block): ProjectBodyBlock => {
    if (block.__component === "blocks.image") {
      return { ...block, image: idOf(block.image, ids) };
    }
    if (block.__component === "blocks.gallery") {
      return {
        ...block,
        images: (block.images ?? []).map((image) => idOf(image, ids)),
      };
    }
    return block;
  });

const idOf = (media: StrapiMedia | null | undefined, ids: Map<string, number>): StrapiMedia => {
  const path = media?.url ?? "";
  const id = ids.get(path);
  if (id === undefined) {
    throw new Error(`no uploaded media for "${path}"`);
  }
  // The admin API takes a bare id for a media field.
  return id as unknown as StrapiMedia;
};

/* ---------------------------------------------------------------- main */

const main = async (): Promise<number> => {
  const absolute = new URL(file as string, `file:///${process.cwd().replace(/\\/g, "/")}/`);
  const source = await readFile(absolute, "utf8");
  const mdxDir = new URL("./", absolute);

  const resolvePath = (path: string): string => {
    const resolved = new URL(path, mdxDir);
    return relative(fileURLToPath(REPO_ROOT), fileURLToPath(resolved)).replace(/\\/g, "/");
  };

  const body = stripFrontmatter(source);
  const bindings = readImageImports(body, resolvePath);
  const tree = parseMdx(body);
  const result: ConversionResult = toProjectBody(tree, { bindings, resolvePath });

  console.log(`migrate - ${file}`);
  console.log(`migrate - ${bindings.size} image import(s)`);
  console.log(`migrate - ${result.blocks.length} block(s), ${result.media.length} image(s)`);
  console.log("");

  const counts = new Map<string, number>();
  for (const block of result.blocks) {
    counts.set(block.__component, (counts.get(block.__component) ?? 0) + 1);
  }
  for (const [name, count] of [...counts].sort()) {
    console.log(`  ${String(count).padStart(3)}  ${name}`);
  }

  if (result.warnings.length > 0) {
    console.log("");
    console.log("migrate - warnings");
    for (const warning of result.warnings) {
      console.log(`  ! ${warning.message}`);
    }
  }

  if (dryRun) {
    const target = new URL("../.migrate-dry-run.json", import.meta.url);
    await writeFile(target, `${JSON.stringify(result.blocks, null, 2)}\n`);
    console.log("");
    console.log(`migrate - dry run: wrote ${fileURLToPath(target)} and nothing else.`);
    return 0;
  }

  const token = await adminToken();

  const ids = new Map<string, number>();
  for (const item of result.media) {
    const id = await upload(item.path, token);
    ids.set(item.path, id);
    await describe(id, item, token);
  }
  console.log(`migrate - ${ids.size} image(s) in the Media Library`);

  const blocks = withMediaIds(result.blocks, ids);

  const slug = basename(file as string).replace(/\.(md|mdx)$/, "");
  const list = await fetch(`${url}/api/projects?filters[slug][$eq]=${slug}`);
  const found = (await list.json()) as { data?: { documentId?: string }[] };
  const documentId = found.data?.[0]?.documentId;
  if (documentId === undefined) {
    console.error(`migrate - no CMS entry with slug "${slug}".`);
    return 1;
  }

  const response = await fetch(
    `${url}/content-manager/collection-types/api::project.project/${documentId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ body: blocks }),
    },
  );

  if (!response.ok) {
    console.error(`migrate - could not write the body (${response.status}).`);
    return 1;
  }

  console.log("");
  console.log(`migrate - wrote ${blocks.length} block(s) to "${slug}".`);
  console.log("migrate - now run `npm run cms:sync` to pull it into the repo.");
  return 0;
};

process.exitCode = await main();
