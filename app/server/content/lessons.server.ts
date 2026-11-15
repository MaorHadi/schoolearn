import { data } from "react-router";
import { t } from "~/i18n";
import { extractAssetIds } from "~/schemas/content-blocks";
import type { QuestionType } from "~/schemas/questions";
import { prisma } from "~/server/database.server";
import { LessonContentError, parseLessonContent } from "~/server/lesson-content.server";
import { getSubjectBySlugForUser } from "~/server/content/subjects.server";
import { getSubjectTree } from "~/server/progress/unlock.server";
import { assetUrlMap } from "~/server/storage/assets.server";
import { isLessonUnlocked } from "~/shared/unlock";

/**
 * Load a lesson for display. Throws React Router `data()` responses:
 * 404 when the subject is not enrolled/active or the lesson is not in it,
 * 403 when the lesson is still locked, 500 when stored content fails validation.
 */
export async function getLessonForUser(userId: number, slug: string, lessonId: number) {
  const subject = await getSubjectBySlugForUser(userId, slug);
  if (!subject) throw data(t("error.notFound"), { status: 404 });

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      publishedAt: { not: null },
      section: { subjectId: subject.id, publishedAt: { not: null } },
    },
    include: {
      section: true,
      // No `isCorrect`: this goes to the browser. The answer key is getLessonAnswerKey().
      questions: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          prompt: true,
          options: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: { id: true, text: true },
          },
        },
      },
    },
  });
  if (!lesson) throw data(t("error.notFound"), { status: 404 });

  const tree = await getSubjectTree(userId, subject.id);
  if (!isLessonUnlocked(tree, lesson.id)) throw data(t("error.lessonLocked"), { status: 403 });

  let blocks;
  try {
    blocks = parseLessonContent(lesson.content);
  } catch (error) {
    if (error instanceof LessonContentError) {
      console.error(`Invalid content in lesson ${lesson.id}`, error.issues);
      throw data(t("error.generic"), { status: 500 });
    }
    throw error;
  }

  const assetUrls = await assetUrlMap(extractAssetIds(blocks));

  return {
    subject,
    lesson,
    blocks,
    assetUrls,
    tree,
    questions: lesson.questions,
    questionCount: lesson.questions.length,
  };
}

interface AnswerKeyEntry {
  id: number;
  type: QuestionType;
  optionIds: number[];
  correctOptionIds: number[];
}

/** The live quiz with its correct options, for grading on the server only. */
export async function getLessonAnswerKey(lessonId: number): Promise<AnswerKeyEntry[]> {
  const questions = await prisma.question.findMany({
    where: { lessonId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, type: true, options: { select: { id: true, isCorrect: true } } },
  });
  return questions.map((question) => ({
    id: question.id,
    type: question.type,
    optionIds: question.options.map((option) => option.id),
    correctOptionIds: question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id),
  }));
}
