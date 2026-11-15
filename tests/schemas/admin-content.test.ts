import { describe, expect, it } from "vitest";
import {
  BlocksFormSchema,
  LessonInputSchema,
  PublishFormSchema,
  SubjectInputSchema,
  SubjectPageIntentSchema,
} from "~/schemas/admin-content";

const validSubject = {
  slug: " My-Subject ",
  name: "Name",
  description: "",
  locale: "he",
  direction: "rtl",
  accentColor: "#112233",
  icon: "globe",
};

describe("SubjectInputSchema", () => {
  it("normalises the slug, blanks description to null, and drops unknown fields", () => {
    const parsed = SubjectInputSchema.parse({ ...validSubject, sortOrder: "2" });
    expect(parsed).toMatchObject({ slug: "my-subject", description: null, locale: "he" });
    expect(parsed).not.toHaveProperty("sortOrder");
    expect(parsed.defaultPassingScore).toBeNull();
    expect(
      SubjectInputSchema.parse({ ...validSubject, defaultPassingScore: "75" }).defaultPassingScore,
    ).toBe(75);
    expect(
      SubjectInputSchema.safeParse({ ...validSubject, defaultPassingScore: "101" }).success,
    ).toBe(false);
  });

  it("rejects bad slugs, colours, icons, and languages outside the list", () => {
    expect(SubjectInputSchema.safeParse({ ...validSubject, locale: "xx" }).success).toBe(false);
    expect(SubjectInputSchema.safeParse({ ...validSubject, slug: "a b" }).success).toBe(false);
    expect(SubjectInputSchema.safeParse({ ...validSubject, slug: "-a" }).success).toBe(false);
    expect(SubjectInputSchema.safeParse({ ...validSubject, accentColor: "red" }).success).toBe(
      false,
    );
    expect(SubjectInputSchema.safeParse({ ...validSubject, icon: "rocket" }).success).toBe(false);
  });
});

describe("LessonInputSchema", () => {
  it("treats an empty passing score as null and bounds it otherwise", () => {
    expect(LessonInputSchema.parse({ title: "L", passingScore: "" })).toEqual({
      title: "L",
      passingScore: null,
    });
    expect(LessonInputSchema.parse({ title: "L", passingScore: "70" }).passingScore).toBe(70);
    expect(LessonInputSchema.safeParse({ title: "L", passingScore: "101" }).success).toBe(false);
  });
});

describe("SubjectPageIntentSchema", () => {
  it("dispatches on intent", () => {
    expect(SubjectPageIntentSchema.parse({ intent: "move-lesson-up", lessonId: "4" })).toEqual({
      intent: "move-lesson-up",
      lessonId: 4,
    });
    expect(
      SubjectPageIntentSchema.parse({
        intent: "reorder-lesson",
        lessonId: "4",
        targetLessonId: "7",
      }),
    ).toEqual({ intent: "reorder-lesson", lessonId: 4, targetLessonId: 7 });
    expect(
      SubjectPageIntentSchema.safeParse({ intent: "reorder-section", sectionId: "4" }).success,
    ).toBe(false);
    expect(SubjectPageIntentSchema.safeParse({ intent: "explode" }).success).toBe(false);
  });
});

describe("BlocksFormSchema", () => {
  it("parses JSON blocks and rejects malformed JSON or blocks", () => {
    const blocks = [{ id: "a", type: "heading", level: 2, text: "Hi" }];
    expect(BlocksFormSchema.parse({ blocks: JSON.stringify(blocks) }).blocks).toEqual(blocks);
    expect(BlocksFormSchema.safeParse({ blocks: "{" }).success).toBe(false);
    expect(BlocksFormSchema.safeParse({ blocks: JSON.stringify([{ type: "x" }]) }).success).toBe(
      false,
    );
  });
});

describe("PublishFormSchema", () => {
  it("accepts one or many subject ids", () => {
    expect(PublishFormSchema.parse({ subjectId: "3" }).subjectId).toEqual([3]);
    expect(PublishFormSchema.parse({ subjectId: ["3", "5"] }).subjectId).toEqual([3, 5]);
    expect(PublishFormSchema.safeParse({}).success).toBe(false);
    expect(PublishFormSchema.safeParse({ subjectId: [] }).success).toBe(false);
  });
});
