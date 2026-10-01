import { describe, expect, it } from "vitest";
import {
  LessonContentError,
  parseLessonContent,
  serializeLessonContent,
} from "~/server/lesson-content.server";

describe("parseLessonContent", () => {
  it("returns typed blocks for valid stored JSON", () => {
    const blocks = parseLessonContent([{ id: "a", type: "heading", level: 1, text: "x" }]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("heading");
  });

  it("throws LessonContentError with issues for invalid stored JSON", () => {
    expect(() => parseLessonContent([{ id: "a", type: "video" }])).toThrow(LessonContentError);
    try {
      parseLessonContent("not an array");
    } catch (error) {
      expect(error).toBeInstanceOf(LessonContentError);
      expect(Array.isArray((error as LessonContentError).issues)).toBe(true);
    }
  });
});

describe("serializeLessonContent", () => {
  it("validates and returns the blocks for storage", () => {
    const out = serializeLessonContent([
      { id: "a", type: "paragraph", content: [{ text: "x", marks: [] }] },
    ]);
    expect(out).toHaveLength(1);
  });
});
