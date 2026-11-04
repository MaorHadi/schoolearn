import { prisma } from "~/server/database.server";

/**
 * Create a throwaway subject with the given number of lessons per section.
 * Published (visible to learners) unless `published` is false.
 */
export async function makeSubjectWithLessons(
  lessonsPerSection: number[],
  passingScore: number | null = null,
  published = true,
) {
  const publishedAt = published ? new Date() : null;
  const subject = await prisma.subject.create({
    data: {
      slug: "t-" + Math.random().toString(36).slice(2, 8),
      name: "Test subject",
      locale: "en",
      direction: "ltr",
      isActive: published,
      publishedAt,
    },
  });
  const lessonIds: number[][] = [];
  for (let sectionIndex = 0; sectionIndex < lessonsPerSection.length; sectionIndex++) {
    const section = await prisma.section.create({
      data: {
        subjectId: subject.id,
        title: `S${sectionIndex + 1}`,
        sortOrder: sectionIndex + 1,
        publishedAt,
      },
    });
    const ids: number[] = [];
    const count = lessonsPerSection[sectionIndex] ?? 0;
    for (let lessonIndex = 0; lessonIndex < count; lessonIndex++) {
      const created = await prisma.lesson.create({
        data: {
          sectionId: section.id,
          title: `L${lessonIndex + 1}`,
          sortOrder: lessonIndex + 1,
          passingScore,
          content: [],
          publishedAt,
        },
      });
      ids.push(created.id);
    }
    lessonIds.push(ids);
  }
  return { subject, lessonIds };
}
