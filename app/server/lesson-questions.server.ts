import { LessonQuestionsSchema, type LessonQuestions } from "~/schemas/questions";
import { prisma } from "~/server/database.server";
import { withTransaction, type DatabaseClient } from "~/server/lesson-content.server";

/** Thrown when a stored question list (a draft) does not match the question schema. */
export class LessonQuestionsError extends Error {
  constructor(public readonly issues: unknown[]) {
    super("Invalid lesson questions");
    this.name = "LessonQuestionsError";
  }
}

/** Every read of Lesson.draftQuestions that must be valid goes through here. */
export function parseLessonQuestions(json: unknown): LessonQuestions {
  const result = LessonQuestionsSchema.safeParse(json);
  if (!result.success) throw new LessonQuestionsError(result.error.issues);
  return result.data;
}

/**
 * The only way to write Question / QuestionOption rows: the lesson's live quiz becomes exactly
 * `questions`, in that order. The rows are replaced, so question and option ids change; a quiz
 * submitted against the old ids is rejected by the lesson route.
 */
export async function saveLessonQuestions(
  lessonId: number,
  questions: LessonQuestions,
  client: DatabaseClient = prisma,
): Promise<void> {
  const parsed = parseLessonQuestions(questions);
  await withTransaction(client, async (transaction) => {
    await transaction.question.deleteMany({ where: { lessonId } });
    for (const [questionIndex, question] of parsed.entries()) {
      await transaction.question.create({
        data: {
          lessonId,
          type: question.type,
          prompt: question.prompt,
          sortOrder: questionIndex + 1,
          options: {
            create: question.options.map((option, optionIndex) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              sortOrder: optionIndex + 1,
            })),
          },
        },
      });
    }
  });
}
