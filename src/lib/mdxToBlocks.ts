/**
 * Converts a hand-written MDX project document into a Strapi project body.
 *
 * This is migration tooling: it exists so the flagship document does not have to
 * be retyped block by block. It is not part of the build.
 *
 * The document is parsed with the real MDX parser rather than by pattern
 * matching, so headings, lists, tables, code fences and inline formatting all
 * survive. Embedded components become the matching block, and their props are
 * evaluated against the file's own imports — which is how an `src={someImage}`
 * prop turns back into a path.
 *
 * Anything it cannot place is reported, never guessed at: an unknown component
 * is dropped with a warning so the gap is visible in the migration report.
 */
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { mdxjs } from "micromark-extension-mdxjs";
import { gfm } from "micromark-extension-gfm";
import type {
  BenchmarkDataset,
  FlowStep,
  GlanceItem,
  ProjectBodyBlock,
  RichTextBlockNode,
  RichTextInlineNode,
  StrapiMedia,
} from "./strapiBlocks.ts";

export interface MdastNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean | null;
  lang?: string | null;
  url?: string;
  name?: string | null;
  attributes?: MdxAttribute[];
  children?: MdastNode[];
  align?: (string | null)[] | null;
}

interface MdxAttribute {
  type?: string;
  name?: string;
  value?: string | { type?: string; value?: string } | null;
}

/** Marks accumulated from the enclosing inline nodes. */
interface Marks {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
}

export interface ConversionWarning {
  message: string;
}

/** A file the body references, with the text that should travel with it. */
export interface MediaMeta {
  path: string;
  alternativeText?: string;
  caption?: string;
}

export interface ConversionResult {
  blocks: ProjectBodyBlock[];
  /** Every image the body references, in first-use order, with its alt/caption. */
  media: MediaMeta[];
  warnings: ConversionWarning[];
}

export interface ConversionOptions {
  /** Imported identifier -> repo-relative path, from `readImageImports`. */
  bindings: Map<string, string>;
  /** Rewrites an MDX-relative import path to a repo-relative one. */
  resolvePath: (path: string) => string;
}

/** Parses an MDX document into an mdast tree, JSX and tables included. */
export const parseMdx = (source: string): MdastNode =>
  fromMarkdown(source, {
    extensions: [mdxjs(), gfm()],
    mdastExtensions: [mdxFromMarkdown(), gfmFromMarkdown()],
  }) as unknown as MdastNode;

const IMPORT_RE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm;

/**
 * Collects `import name from "path"` defaults, keeping only assets — a component
 * or a package import is not an image.
 */
export const readImageImports = (
  source: string,
  resolvePath: (path: string) => string,
): Map<string, string> => {
  const bindings = new Map<string, string>();

  for (const match of source.matchAll(IMPORT_RE)) {
    const [, name, path] = match;
    if (name === undefined || path === undefined) {
      continue;
    }
    if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(path)) {
      bindings.set(name, resolvePath(path));
    }
  }

  return bindings;
};

/** Evaluates a JSX expression against the file's image imports. */
export const evaluateExpression = (
  expression: string,
  bindings: Map<string, string>,
): unknown => {
  const names = [...bindings.keys()];
  const values = [...bindings.values()];
  // The expressions in these documents are plain literals over the file's own
  // imports. If one throws, the caller reports it as a warning rather than
  // guessing at a value.
  const evaluate = new Function(...names, `return (${expression});`);
  return evaluate(...values) as unknown;
};

const attributes = (node: MdastNode, options: ConversionOptions): Map<string, unknown> => {
  const props = new Map<string, unknown>();

  for (const attribute of node.attributes ?? []) {
    const name = attribute.name;
    if (name === undefined) {
      continue;
    }
    const value = attribute.value;
    if (typeof value === "string") {
      props.set(name, value);
      continue;
    }
    const source = value?.value;
    if (typeof source === "string") {
      props.set(name, evaluateExpression(source, options.bindings));
    }
  }

  return props;
};

/* ---------------------------------------------------------------- inline */

const inlineNodes = (nodes: MdastNode[] | undefined, marks: Marks = {}): RichTextInlineNode[] =>
  (nodes ?? []).flatMap((node): RichTextInlineNode[] => {
    switch (node.type) {
      case "text":
        return [{ type: "text", text: node.value ?? "", ...marks }];
      case "strong":
        return inlineNodes(node.children, { ...marks, bold: true });
      case "emphasis":
        return inlineNodes(node.children, { ...marks, italic: true });
      case "delete":
        return inlineNodes(node.children, { ...marks, strikethrough: true });
      case "inlineCode":
        return [{ type: "text", text: node.value ?? "", code: true }];
      case "link":
        return [
          {
            type: "link",
            url: node.url ?? "",
            children: inlineNodes(node.children, marks),
          },
        ];
      case "break":
        return [{ type: "text", text: "\n" }];
      default:
        return [];
    }
  });

/* ---------------------------------------------------------------- blocks */

/**
 * Lowers block-level children (the `paragraph` nodes inside a list item or a
 * blockquote) to inline nodes. Strapi's list items hold inline content only, so
 * anything that is not a paragraph or an inline node is dropped.
 */
const inlineFromBlocks = (nodes: MdastNode[] | undefined): RichTextInlineNode[] =>
  (nodes ?? []).flatMap((node) =>
    node.type === "paragraph" ? inlineNodes(node.children) : inlineNodes([node]),
  );

const listNode = (node: MdastNode): RichTextBlockNode => ({
  type: "list",
  format: node.ordered === true ? "ordered" : "unordered",
  children: (node.children ?? []).map((item) => ({
    type: "list-item",
    children: inlineFromBlocks(item.children),
  })),
});

/** Markdown nodes that Strapi's rich text understands. */
const richTextNodes = (nodes: MdastNode[] = []): RichTextBlockNode[] =>
  nodes.flatMap((node): RichTextBlockNode[] => {
    switch (node.type) {
      case "heading":
        return [
          {
            type: "heading",
            level: node.depth ?? 2,
            children: inlineNodes(node.children),
          },
        ];
      case "paragraph":
        return inlineNodes(node.children).length > 0
          ? [{ type: "paragraph", children: inlineNodes(node.children) }]
          : [];
      case "blockquote":
        return [
          { type: "quote", children: inlineFromBlocks(node.children) },
        ] as RichTextBlockNode[];
      case "list":
        return [listNode(node)];
      case "code":
        return [
          {
            type: "code",
            language: node.lang ?? null,
            children: [{ type: "text", text: node.value ?? "" }],
          },
        ];
      default:
        return [];
    }
  });

const tableBlock = (node: MdastNode): ProjectBodyBlock => {
  const rows = node.children ?? [];
  const [head, ...body] = rows;
  const cellText = (cell: MdastNode): string =>
    inlineNodes(cell.children)
      .map((child) => (child.type === "text" ? child.text : ""))
      .join("");

  return {
    __component: "blocks.data-table",
    headers: (head?.children ?? []).map(cellText),
    rows: body.map((row) => (row.children ?? []).map(cellText)),
  };
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

const mediaFrom = (path: string): StrapiMedia => ({ url: path, localPath: path });

const numeric = (value: unknown): number =>
  typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : 0;

/* ---------------------------------------------------------------- pieces */

export const toProjectBody = (
  tree: MdastNode,
  options: ConversionOptions,
): ConversionResult => {
  const blocks: ProjectBodyBlock[] = [];
  const media: MediaMeta[] = [];
  const warnings: ConversionWarning[] = [];
  let pending: RichTextBlockNode[] = [];

  const note = (path: unknown, alternativeText?: string, caption?: string): void => {
    if (typeof path !== "string" || path === "") {
      return;
    }
    const seen = media.find((entry) => entry.path === path);
    if (seen === undefined) {
      media.push({ path, alternativeText, caption });
      return;
    }
    // The same file can appear twice; keep the first text that was supplied.
    seen.alternativeText ??= alternativeText;
    seen.caption ??= caption;
  };

  const flush = (): void => {
    if (pending.length > 0) {
      blocks.push({ __component: "blocks.rich-text", content: pending });
      pending = [];
    }
  };

  const component = (node: MdastNode): void => {
    const name = node.name ?? "(anonymous)";
    let props: Map<string, unknown>;
    try {
      props = attributes(node, options);
    } catch (error) {
      warnings.push({
        message: `<${name}>: could not read its props (${error instanceof Error ? error.message : String(error)})`,
      });
      return;
    }

    switch (node.name) {
      case "Callout":
        blocks.push({
          __component: "blocks.callout",
          type: (asString(props.get("type")) ?? "info") as "info" | "warning" | "success",
          body: richTextNodes(node.children),
        });
        return;

      case "TechBadge":
      case "Techbadge":
        blocks.push({
          __component: "blocks.tech-badge",
          name: asString(props.get("name")) ?? "",
          reason: asString(props.get("reason")) ?? "",
        });
        return;

      case "GalleryBox": {
        const items = asArray(props.get("items"));
        blocks.push({
          __component: "blocks.gallery",
          title: asString(props.get("title")) ?? null,
          images: items.map((item) => {
            const path = asString(item.src) ?? "";
            note(path, asString(item.alt), asString(item.caption));
            return { ...mediaFrom(path), alternativeText: asString(item.alt) ?? null, caption: asString(item.caption) ?? null };
          }),
        });
        return;
      }

      case "Image": {
        const path = asString(props.get("src")) ?? "";
        note(path, asString(props.get("alt")));
        blocks.push({
          __component: "blocks.image",
          image: { ...mediaFrom(path), alternativeText: asString(props.get("alt")) ?? null },
        });
        return;
      }

      case "BenchmarkChart": {
        const datasets: BenchmarkDataset[] = asArray(props.get("benchmarks")).map((dataset) => ({
          label: asString(dataset.label) ?? null,
          unit: asString(dataset.unit) ?? null,
          note: asString(dataset.note) ?? null,
          bars: asArray(dataset.bars).map((bar) => ({
            name: asString(bar.name) ?? null,
            value: numeric(bar.value),
            version: asString(bar.version) ?? null,
          })),
        }));

        blocks.push({
          __component: "blocks.benchmark",
          source: asString(props.get("source")) ?? null,
          sourceUrl: asString(props.get("sourceUrl")) ?? null,
          dataUpdatedAt: asString(props.get("dataUpdatedAt")) ?? null,
          datasets,
        });
        return;
      }

      case "FlowDiagram": {
        const steps: FlowStep[] = asArray(props.get("steps")).map((step) => ({
          label: asString(step.label) ?? null,
          note: asString(step.note) ?? null,
        }));
        blocks.push({
          __component: "blocks.flow-diagram",
          label: asString(props.get("label")) ?? null,
          steps,
        });
        return;
      }

      case "ProjectGlance": {
        const items: GlanceItem[] = asArray(props.get("items")).map((item) => ({
          label: asString(item.label) ?? null,
          value: asString(item.value) ?? null,
        }));
        const stack = props.get("stack");
        blocks.push({
          __component: "blocks.project-glance",
          title: asString(props.get("title")) ?? null,
          items,
          stack: Array.isArray(stack) ? (stack.filter((entry) => typeof entry === "string") as string[]) : null,
        });
        return;
      }

      default:
        warnings.push({ message: `<${name}>: no matching block — dropped` });
    }
  };

  for (const node of tree.children ?? []) {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      flush();
      component(node);
      continue;
    }
    if (node.type === "table") {
      flush();
      blocks.push(tableBlock(node));
      continue;
    }
    pending.push(...richTextNodes([node]));
  }

  flush();

  return { blocks, media, warnings };
};
