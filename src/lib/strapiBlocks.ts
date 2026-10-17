/**
 * Types for a project body as authored in Strapi, plus the conversion of rich
 * text to Markdown.
 *
 * Strapi stores a "blocks" field as a JSON document, and a project body as a
 * dynamic zone: an ordered array of components. This module owns the shape of
 * both, and turns the rich text into Markdown so the rest of the site can reuse
 * Astro's own Markdown pipeline (syntax highlighting, heading ids) instead of
 * hand-rolling an HTML renderer.
 */

/** A file from the Strapi media library, as nested in an API response. */
export interface StrapiMedia {
  id?: number;
  documentId?: string;
  url: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  /**
   * Set by `cms:sync` when the file is downloaded into the repo. The loader
   * prefers it, so the build never has to reach the CMS for an image.
   */
  localPath?: string;
}

/* ------------------------------------------------------------------ *
 * Rich text (the Strapi "blocks" field)
 * ------------------------------------------------------------------ */

export interface RichTextTextNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface RichTextLinkNode {
  type: "link";
  url: string;
  children?: RichTextInlineNode[];
}

export type RichTextInlineNode = RichTextTextNode | RichTextLinkNode;

export interface RichTextParagraphNode {
  type: "paragraph";
  children?: RichTextInlineNode[];
}

export interface RichTextHeadingNode {
  type: "heading";
  level: number;
  children?: RichTextInlineNode[];
}

export interface RichTextQuoteNode {
  type: "quote";
  children?: RichTextInlineNode[];
}

export interface RichTextCodeNode {
  type: "code";
  language?: string | null;
  children?: RichTextInlineNode[];
}

export interface RichTextImageNode {
  type: "image";
  image: StrapiMedia;
  children?: RichTextInlineNode[];
}

export interface RichTextListItemNode {
  type: "list-item";
  children?: Array<RichTextInlineNode | RichTextListNode>;
}

export interface RichTextListNode {
  type: "list";
  format?: "ordered" | "unordered";
  children?: Array<RichTextListItemNode | RichTextListNode>;
}

export type RichTextBlockNode =
  | RichTextParagraphNode
  | RichTextHeadingNode
  | RichTextQuoteNode
  | RichTextCodeNode
  | RichTextImageNode
  | RichTextListNode;

/* ------------------------------------------------------------------ *
 * Project body (the dynamic zone)
 * ------------------------------------------------------------------ */

export interface BenchmarkBar {
  id?: number;
  name?: string | null;
  /** Strapi returns a decimal as a string in some drivers. */
  value?: number | string | null;
  version?: string | null;
}

export interface BenchmarkDataset {
  id?: number;
  label?: string | null;
  unit?: string | null;
  note?: string | null;
  bars?: BenchmarkBar[] | null;
}

export interface FlowStep {
  id?: number;
  label?: string | null;
  note?: string | null;
}

export interface GlanceItem {
  id?: number;
  label?: string | null;
  value?: string | null;
}

export interface BlocksRichText {
  __component: "blocks.rich-text";
  id?: number;
  content?: RichTextBlockNode[] | null;
  /** Filled by the loader: the rich text rendered to HTML through Astro's Markdown pipeline. */
  html?: string;
}

export interface BlocksCallout {
  __component: "blocks.callout";
  id?: number;
  type?: "info" | "warning" | "success" | null;
  body?: RichTextBlockNode[] | null;
  /** Filled by the loader: the callout's rich text rendered to HTML. */
  bodyHtml?: string;
}

export interface BlocksDataTable {
  __component: "blocks.data-table";
  id?: number;
  caption?: string | null;
  headers?: string[] | null;
  rows?: string[][] | null;
  availability?: "full" | "partial" | null;
}

export interface BlocksImage {
  __component: "blocks.image";
  id?: number;
  image?: StrapiMedia | null;
  caption?: string | null;
  wide?: boolean | null;
}

export interface BlocksGallery {
  __component: "blocks.gallery";
  id?: number;
  title?: string | null;
  images?: StrapiMedia[] | null;
}

export interface BlocksBenchmark {
  __component: "blocks.benchmark";
  id?: number;
  source?: string | null;
  sourceUrl?: string | null;
  dataUpdatedAt?: string | null;
  datasets?: BenchmarkDataset[] | null;
}

export interface BlocksFlowDiagram {
  __component: "blocks.flow-diagram";
  id?: number;
  label?: string | null;
  steps?: FlowStep[] | null;
}

export interface BlocksProjectGlance {
  __component: "blocks.project-glance";
  id?: number;
  title?: string | null;
  items?: GlanceItem[] | null;
  stack?: string[] | null;
}

export interface BlocksTechBadge {
  __component: "blocks.tech-badge";
  id?: number;
  name?: string | null;
  reason?: string | null;
}

export type ProjectBodyBlock =
  | BlocksRichText
  | BlocksCallout
  | BlocksDataTable
  | BlocksImage
  | BlocksGallery
  | BlocksBenchmark
  | BlocksFlowDiagram
  | BlocksProjectGlance
  | BlocksTechBadge;

/* ------------------------------------------------------------------ *
 * Rich text -> Markdown
 * ------------------------------------------------------------------ */

export interface BlocksToMarkdownOptions {
  /**
   * Rewrites a media URL. Strapi returns library URLs relative to its own host,
   * so the caller supplies the prefix. Defaults to leaving them untouched.
   */
  resolveMediaUrl?: (url: string) => string;
}

/** Characters that would otherwise be interpreted as Markdown syntax. */
const escapeInline = (text: string): string => text.replace(/([\\*_[\]`])/g, "\\$1");

const renderInline = (nodes: RichTextInlineNode[] | undefined): string =>
  (nodes ?? []).map(renderInlineNode).join("");

const renderInlineNode = (node: RichTextInlineNode): string => {
  if (node?.type === "link") {
    const label = renderInline(node.children) || node.url;
    return `[${label}](${node.url})`;
  }

  if (node?.type !== "text") {
    return "";
  }

  const text = typeof node.text === "string" ? node.text : "";
  if (node.code) {
    // Code spans are literal, so the content must not be escaped.
    return `\`${text}\``;
  }

  let rendered = escapeInline(text);
  if (node.bold) rendered = `**${rendered}**`;
  if (node.italic) rendered = `*${rendered}*`;
  if (node.strikethrough) rendered = `~~${rendered}~~`;
  if (node.underline) rendered = `<u>${rendered}</u>`;
  return rendered;
};

const renderCode = (node: RichTextCodeNode): string => {
  // Concatenate raw text: inside a fence nothing should be re-escaped.
  const code = (node.children ?? [])
    .map((child) => (child?.type === "text" && typeof child.text === "string" ? child.text : ""))
    .join("");
  const fence = node.language ? `\`\`\`${node.language}` : "```";
  return `${fence}\n${code}\n\`\`\``;
};

const renderList = (node: RichTextListNode, indent = "", options: BlocksToMarkdownOptions): string => {
  const marker = node.format === "ordered" ? "1." : "-";

  return (node.children ?? [])
    .map((child) => {
      if (child?.type === "list") {
        return renderList(child, `${indent}  `, options);
      }
      if (child?.type !== "list-item") {
        return "";
      }

      const content = (child.children ?? [])
        .map((item) =>
          item?.type === "list"
            ? `\n${renderList(item, `${indent}  `, options)}`
            : renderInlineNode(item as RichTextInlineNode),
        )
        .join("");

      return `${indent}${marker} ${content}`;
    })
    .filter((line) => line !== "")
    .join("\n");
};

const renderBlockNode = (node: RichTextBlockNode, options: BlocksToMarkdownOptions): string => {
  if (!node || typeof node.type !== "string") {
    return "";
  }

  switch (node.type) {
    case "paragraph":
      return renderInline(node.children);

    case "heading": {
      const level = Number.isFinite(node.level) ? Math.min(Math.max(node.level, 1), 6) : 2;
      return `${"#".repeat(level)} ${renderInline(node.children)}`;
    }

    case "quote":
      return renderInline(node.children)
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n");

    case "code":
      return renderCode(node);

    case "image": {
      if (!node.image?.url) {
        return "";
      }
      const url = options.resolveMediaUrl ? options.resolveMediaUrl(node.image.url) : node.image.url;
      const alt = node.image.alternativeText ?? "";
      return `![${alt}](${url})`;
    }

    case "list":
      return renderList(node, "", options);

    default:
      return "";
  }
};

/**
 * Converts a Strapi rich-text document to Markdown.
 * Unknown or malformed nodes are skipped rather than throwing, so one bad block
 * cannot fail a whole build.
 */
export const blocksToMarkdown = (
  nodes: RichTextBlockNode[] | null | undefined,
  options: BlocksToMarkdownOptions = {},
): string =>
  (nodes ?? [])
    .map((node) => renderBlockNode(node, options))
    .filter((block) => block.trim() !== "")
    .join("\n\n");
