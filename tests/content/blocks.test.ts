import { describe, expect, it } from "vitest";
import { ContentBlock, LessonContent } from "~/schemas/content-blocks";

const ok = (block: unknown) =>
  expect(ContentBlock.safeParse(block).success, JSON.stringify(block)).toBe(true);
const bad = (block: unknown) =>
  expect(ContentBlock.safeParse(block).success, JSON.stringify(block)).toBe(false);

describe("ContentBlock", () => {
  it("accepts each block type", () => {
    ok({ id: "a", type: "heading", level: 2, text: "Hi" });
    ok({ id: "b", type: "paragraph", content: [{ text: "x", marks: ["bold", "highlight"] }] });
    ok({
      id: "c",
      type: "quote",
      text: "hello world",
      reference: "Ref 1:1",
      sourceLabel: "Source",
      highlights: [{ start: 0, end: 5 }],
    });
    ok({ id: "d", type: "image", assetId: 1, alt: "desc" });
    ok({ id: "d2", type: "image", assetId: 1, alt: "desc", caption: "cap" });
    ok({ id: "e", type: "list", ordered: true, items: [[{ text: "one" }]] });
  });

  it("applies defaults for marks and highlights", () => {
    const paragraph = ContentBlock.parse({ id: "b", type: "paragraph", content: [{ text: "x" }] });
    expect(paragraph.type === "paragraph" && paragraph.content[0]?.marks).toEqual([]);
    const quote = ContentBlock.parse({ id: "c", type: "quote", text: "t" });
    expect(quote.type === "quote" && quote.highlights).toEqual([]);
  });

  it("accepts a per-block dir override and rejects bad values", () => {
    ok({ id: "a", type: "heading", level: 1, text: "x", dir: "ltr" });
    ok({ id: "a", type: "heading", level: 1, text: "x", dir: "rtl" });
    bad({ id: "a", type: "heading", level: 1, text: "x", dir: "auto" });
  });

  it("rejects unknown type, missing id, missing alt, bad heading level, bad mark", () => {
    bad({ id: "z", type: "video", url: "x" });
    bad({ type: "heading", level: 1, text: "x" });
    bad({ id: "d", type: "image", assetId: 1, alt: "" });
    bad({ id: "d", type: "image", assetId: 0, alt: "x" });
    bad({ id: "a", type: "heading", level: 4, text: "x" });
    bad({ id: "b", type: "paragraph", content: [{ text: "x", marks: ["underline"] }] });
  });

  it("rejects highlight ranges that are inverted or exceed the text", () => {
    bad({ id: "c", type: "quote", text: "short", highlights: [{ start: 3, end: 2 }] });
    bad({ id: "c", type: "quote", text: "short", highlights: [{ start: 0, end: 99 }] });
    bad({ id: "c", type: "quote", text: "short", highlights: [{ start: -1, end: 2 }] });
    ok({ id: "c", type: "quote", text: "short", highlights: [{ start: 0, end: 5 }] });
  });

  it("LessonContent requires an array", () => {
    expect(LessonContent.safeParse({}).success).toBe(false);
    expect(LessonContent.safeParse([]).success).toBe(true);
    expect(
      LessonContent.safeParse([{ id: "a", type: "heading", level: 1, text: "x" }]).success,
    ).toBe(true);
  });
});
