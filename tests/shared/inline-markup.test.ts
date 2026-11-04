import { describe, expect, it } from "vitest";
import {
  parseInlineMarkup,
  quoteFromMarkup,
  quoteToMarkup,
  serializeInlineMarkup,
} from "~/shared/inline-markup";

describe("inline markup", () => {
  it("parses bold, italic, and highlight with nesting", () => {
    expect(parseInlineMarkup("plain **bold *both* bold** ==hi==")).toEqual([
      { text: "plain ", marks: [] },
      { text: "bold ", marks: ["bold"] },
      { text: "both", marks: ["bold", "italic"] },
      { text: " bold", marks: ["bold"] },
      { text: " ", marks: [] },
      { text: "hi", marks: ["highlight"] },
    ]);
  });

  it("honours backslash escapes and empty input", () => {
    expect(parseInlineMarkup("a \\*literal\\* b")).toEqual([{ text: "a *literal* b", marks: [] }]);
    expect(parseInlineMarkup("")).toEqual([]);
  });

  it("round-trips spans through serialize and parse", () => {
    const spans = [
      { text: "one ", marks: [] },
      { text: "two", marks: ["bold" as const] },
      { text: " 2*3=6", marks: ["bold" as const, "highlight" as const] },
      { text: " end", marks: [] },
    ];
    const markup = serializeInlineMarkup(spans);
    expect(markup).toBe("one **two== 2\\*3\\=6==** end");
    expect(parseInlineMarkup(markup)).toEqual(spans);
  });

  it("closes marks left open at the end", () => {
    expect(serializeInlineMarkup([{ text: "x", marks: ["italic"] }])).toBe("*x*");
  });
});

describe("quote markup", () => {
  it("turns highlight ranges into == markers and back", () => {
    const quote = {
      text: "In the beginning",
      highlights: [
        { start: 7, end: 16 },
        { start: 0, end: 2 },
      ],
    };
    const markup = quoteToMarkup(quote);
    expect(markup).toBe("==In== the ==beginning==");
    expect(quoteFromMarkup(markup)).toEqual({
      text: "In the beginning",
      highlights: [
        { start: 0, end: 2 },
        { start: 7, end: 16 },
      ],
    });
  });

  it("ignores empty highlights and closes an unterminated one at the end", () => {
    expect(quoteFromMarkup("a ==== b")).toEqual({ text: "a  b", highlights: [] });
    expect(quoteFromMarkup("a ==b")).toEqual({ text: "a b", highlights: [{ start: 2, end: 3 }] });
  });
});
