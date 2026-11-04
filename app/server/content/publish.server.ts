import { Prisma } from "../../../prisma/generated/client/client";
import { prisma } from "~/server/database.server";
import { parseLessonContent, saveLessonContent } from "~/server/lesson-content.server";

/**
 * Publish subjects: every lesson draft becomes the live content (through saveLessonContent, which
 * syncs LessonAsset), unpublished sections and lessons get their `publishedAt`, and the subject
 * becomes active. Unknown ids are skipped. Returns how many subjects were published.
 */
export async function publishSubjects(subjectIds: number[]): Promise<number> {
  let published = 0;
  for (const subjectId of subjectIds) {
    if (await publishSubject(subjectId)) published += 1;
  }
  return published;
}

async function publishSubject(subjectId: number): Promise<boolean> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      sections: {
        select: {
          lessons: { where: { draftContent: { not: Prisma.DbNull } }, select: { id: true } },
        },
      },
    },
  });
  if (!subject) return false;

  const draftLessonIds = subject.sections.flatMap((section) =>
    section.lessons.map((lesson) => lesson.id),
  );
  for (const lessonId of draftLessonIds) {
    const row = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      select: { draftContent: true },
    });
    await saveLessonContent(lessonId, parseLessonContent(row.draftContent));
  }

  const publishedAt = new Date();
  await prisma.$transaction([
    prisma.lesson.updateMany({
      where: { id: { in: draftLessonIds } },
      data: { draftContent: Prisma.DbNull },
    }),
    prisma.lesson.updateMany({
      where: { section: { subjectId }, publishedAt: null },
      data: { publishedAt },
    }),
    prisma.section.updateMany({ where: { subjectId, publishedAt: null }, data: { publishedAt } }),
    prisma.subject.update({ where: { id: subjectId }, data: { isActive: true, publishedAt } }),
  ]);
  return true;
}
