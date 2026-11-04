import { data } from "react-router";
import { t } from "~/i18n";
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
    where: { id: lessonId, section: { subjectId: subject.id } },
    include: { section: true, _count: { select: { questions: true } } },
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

  const assetIds = blocks.flatMap((block) => (block.type === "image" ? [block.assetId] : []));
  const assetUrls = await assetUrlMap(assetIds);

  return { subject, lesson, blocks, assetUrls, tree, questionCount: lesson._count.questions };
}
