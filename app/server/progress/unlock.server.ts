import { prisma } from "~/server/database.server";
import { computeTree, type SectionState } from "~/shared/unlock";

/** Sections and lessons of a subject with the user's unlock/completion state applied. */
export async function getSubjectTree(userId: number, subjectId: number): Promise<SectionState[]> {
  const [sections, progress] = await Promise.all([
    prisma.section.findMany({
      where: { subjectId },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        lessons: {
          select: {
            id: true,
            title: true,
            sortOrder: true,
            passingScore: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { section: { subjectId } } },
      select: { lessonId: true, bestScore: true, completedAt: true },
    }),
  ]);
  const nodes = sections.map((section) => ({
    ...section,
    lessons: section.lessons.map(({ _count, ...lesson }) => ({
      ...lesson,
      hasQuestions: _count.questions > 0,
    })),
  }));
  return computeTree(nodes, progress);
}
