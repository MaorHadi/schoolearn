import { LessonContent as LessonContentSchema, type LessonContent } from "~/schemas/content-blocks";

/** Thrown when stored lesson content does not match the block schema. */
export class LessonContentError extends Error {
  constructor(public readonly issues: unknown[]) {
    super("Invalid lesson content");
    this.name = "LessonContentError";
  }
}

/** Every read of Lesson.content goes through here. */
export function parseLessonContent(json: unknown): LessonContent {
  const result = LessonContentSchema.safeParse(json);
  if (!result.success) throw new LessonContentError(result.error.issues);
  return result.data;
}

/** Every write of Lesson.content goes through here. Throws on invalid input. */
export function serializeLessonContent(blocks: LessonContent): LessonContent {
  return LessonContentSchema.parse(blocks);
}
