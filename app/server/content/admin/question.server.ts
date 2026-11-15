import { LessonQuestionsSchema, type LessonQuestions } from "~/schemas/questions";
import { prisma } from "~/server/database.server";

/**
 * Admin reader and draft writer for a lesson's questions. The live Question rows are written
 * only by publishing (publish.server.ts -> saveLessonQuestions).
 */

/**
 * The questions as the editor sees them: the draft when there is a valid one, otherwise the
 * live quiz. A draft that no longer matches the schema is reported as `draftInvalid` instead of
 * failing the page, so the admin can save a good draft over it.
 */
export async function getQuestionsForAdmin(lessonId: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      draftQuestions: true,
      section: {
        select: {
          title: true,
          subject: {
            select: { id: true, name: true, direction: true, accentColor: true, icon: true },
          },
        },
      },
      questions: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          prompt: true,
          options: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: { id: true, text: true, isCorrect: true },
          },
        },
      },
    },
  });
  if (!lesson) return null;

  const hasDraft = lesson.draftQuestions !== null;
  const draft = hasDraft ? LessonQuestionsSchema.safeParse(lesson.draftQuestions) : null;
  const live: LessonQuestions = lesson.questions.map((question) => ({
    id: `question-${question.id}`,
    type: question.type,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: `option-${option.id}`,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));
  const { draftQuestions: _draftQuestions, questions: _questions, ...rest } = lesson;
  return {
    ...rest,
    questions: draft?.success ? draft.data : live,
    hasDraft,
    draftInvalid: draft !== null && !draft.success,
  };
}

/** Validate and store an unpublished edit of the questions. False when the lesson is gone. */
export async function saveQuestionsDraft(
  lessonId: number,
  questions: LessonQuestions,
): Promise<boolean> {
  const draftQuestions = LessonQuestionsSchema.parse(questions);
  const { count } = await prisma.lesson.updateMany({
    where: { id: lessonId },
    data: { draftQuestions },
  });
  return count === 1;
}
