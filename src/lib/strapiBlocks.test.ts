import { describe, expect, test } from "vitest";
import { blocksToMarkdown, type RichTextBlockNode } from "./strapiBlocks";

const text = (value: string, marks: Record<string, boolean> = {}) => ({
  type: "text" as const,
  text: value,
  ...marks,
});

const paragraph = (...children: unknown[]): RichTextBlockNode =>
  ({ type: "paragraph", children }) as RichTextBlockNode;

describe("blocksToMarkdown — inline", () => {
  test("renders plain paragraphs", () => {
    expect(blocksToMarkdown([paragraph(text("Hello world"))])).toBe("Hello world");
  });

  test("renders bold, italic, strikethrough and underline", () => {
    expect(blocksToMarkdown([paragraph(text("bold", { bold: true }))])).toBe("**bold**");
    expect(blocksToMarkdown([paragraph(text("italic", { italic: true }))])).toBe("*italic*");
    expect(blocksToMarkdown([paragraph(text("gone", { strikethrough: true }))])).toBe("~~gone~~");
    expect(blocksToMarkdown([paragraph(text("under", { underline: true }))])).toBe("<u>under</u>");
  });

  test("renders a code span literally, without escaping its content", () => {
    expect(blocksToMarkdown([paragraph(text("a * b", { code: true }))])).toBe("`a * b`");
  });

  test("renders links, falling back to the url as the label", () => {
    const link = (children: unknown[]) => ({ type: "link", url: "https://example.com", children });

    expect(blocksToMarkdown([paragraph(link([text("Example")]))])).toBe(
      "[Example](https://example.com)",
    );
    expect(blocksToMarkdown([paragraph(link([]))])).toBe("[https://example.com](https://example.com)");
  });

  test("escapes characters that would otherwise become Markdown syntax", () => {
    expect(blocksToMarkdown([paragraph(text("3 * 4 _ 5 [x] `y`"))])).toBe("3 \\* 4 \\_ 5 \\[x\\] \\`y\\`");
  });
});

describe("blocksToMarkdown — blocks", () => {
  test("renders headings at their level", () => {
    const heading = (level: number) => ({ type: "heading", level, children: [text("Title")] });

    expect(blocksToMarkdown([heading(2) as RichTextBlockNode])).toBe("## Title");
    expect(blocksToMarkdown([heading(3) as RichTextBlockNode])).toBe("### Title");
  });

  test("clamps an out-of-range heading level instead of emitting a broken heading", () => {
    expect(blocksToMarkdown([{ type: "heading", level: 9, children: [text("Deep")] }])).toBe("###### Deep");
    expect(blocksToMarkdown([{ type: "heading", level: 0, children: [text("Shallow")] }])).toBe("# Shallow");
  });

  test("renders unordered and ordered lists", () => {
    const list = (format: string, items: string[]): RichTextBlockNode =>
      ({
        type: "list",
        format,
        children: items.map((value) => ({ type: "list-item", children: [text(value)] })),
      }) as RichTextBlockNode;

    expect(blocksToMarkdown([list("unordered", ["one", "two"])])).toBe("- one\n- two");
    expect(blocksToMarkdown([list("ordered", ["first", "second"])])).toBe("1. first\n1. second");
  });

  test("renders a nested list with indentation", () => {
    const nested: RichTextBlockNode = {
      type: "list",
      format: "unordered",
      children: [
        { type: "list-item", children: [text("parent")] },
        {
          type: "list-item",
          children: [
            text("with child"),
            {
              type: "list",
              format: "unordered",
              children: [{ type: "list-item", children: [text("child")] }],
            },
          ],
        },
      ],
    };

    expect(blocksToMarkdown([nested])).toBe("- parent\n- with child\n  - child");
  });

  test("renders quotes, prefixing every line", () => {
    expect(blocksToMarkdown([{ type: "quote", children: [text("quoted")] }])).toBe("> quoted");
  });

  test("renders a fenced code block and keeps its language", () => {
    expect(
      blocksToMarkdown([
        { type: "code", language: "js", children: [text("const a = 1;")] },
      ]),
    ).toBe("```js\nconst a = 1;\n```");

    expect(blocksToMarkdown([{ type: "code", children: [text("plain")] }])).toBe(
      "```\nplain\n```",
    );
  });

  test("renders an image with its alt text", () => {
    const image = {
      type: "image",
      image: { url: "/uploads/shot.png", alternativeText: "A screenshot" },
    } as RichTextBlockNode;

    expect(blocksToMarkdown([image])).toBe("![A screenshot](/uploads/shot.png)");
  });

  test("rewrites media urls through the supplied resolver", () => {
    const image = {
      type: "image",
      image: { url: "/uploads/shot.png", alternativeText: "Shot" },
    } as RichTextBlockNode;

    expect(
      blocksToMarkdown([image], { resolveMediaUrl: (url) => `http://cms.test${url}` }),
    ).toBe("![Shot](http://cms.test/uploads/shot.png)");
  });

  test("separates blocks with a blank line", () => {
    expect(
      blocksToMarkdown([
        paragraph(text("First")),
        { type: "heading", level: 2, children: [text("Second")] } as RichTextBlockNode,
      ]),
    ).toBe("First\n\n## Second");
  });
});

describe("blocksToMarkdown — malformed input", () => {
  test("returns an empty string for missing content", () => {
    expect(blocksToMarkdown(null)).toBe("");
    expect(blocksToMarkdown(undefined)).toBe("");
    expect(blocksToMarkdown([])).toBe("");
  });

  test("skips unknown node types instead of throwing", () => {
    expect(blocksToMarkdown([{ type: "video" } as unknown as RichTextBlockNode])).toBe("");
  });

  test("skips nodes with missing children", () => {
    expect(blocksToMarkdown([{ type: "paragraph" } as RichTextBlockNode])).toBe("");
  });

  test("skips an image without a url", () => {
    expect(
      blocksToMarkdown([
        { type: "image", image: { url: "" } } as unknown as RichTextBlockNode,
      ]),
    ).toBe("");
  });

  test("ignores non-text children of a code block", () => {
    expect(
      blocksToMarkdown([
        {
          type: "code",
          language: "ts",
          children: [text("kept"), { type: "link", url: "x" }],
        } as RichTextBlockNode,
      ]),
    ).toBe("```ts\nkept\n```");
  });
});
