import { prisma } from "~/server/database.server";

export interface SubjectListItem {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  direction: "rtl" | "ltr";
  accentColor: string;
  icon: string;
  enrolled: boolean;
  totalLessons: number;
  completedLessons: number;
}

/**
 * Active subjects in display order with the user's enrollment and progress.
 * Two queries: the subjects (with lesson counts), then the user's completed lessons grouped by subject.
 */
export async function listActiveSubjectsForUser(userId: number): Promise<SubjectListItem[]> {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      direction: true,
      accentColor: true,
      icon: true,
      users: { where: { id: userId }, select: { id: true } },
      sections: { select: { _count: { select: { lessons: true } } } },
    },
  });

  const completed = await prisma.lessonProgress.findMany({
    where: { userId, completedAt: { not: null } },
    select: { lesson: { select: { section: { select: { subjectId: true } } } } },
  });
  const completedBySubject = new Map<number, number>();
  for (const row of completed) {
    const subjectId = row.lesson.section.subjectId;
    completedBySubject.set(subjectId, (completedBySubject.get(subjectId) ?? 0) + 1);
  }

  return subjects.map(({ users, sections, ...subject }) => ({
    ...subject,
    enrolled: users.length > 0,
    totalLessons: sections.reduce((sum, section) => sum + section._count.lessons, 0),
    completedLessons: completedBySubject.get(subject.id) ?? 0,
  }));
}

/**
 * Enrollment is the implicit User<->Subject relation. Idempotent.
 * Returns the subject's name, or null (changing nothing) if it does not exist or is inactive.
 */
export async function enrollUser(
  userId: number,
  subjectId: number,
): Promise<{ name: string } | null> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, isActive: true },
    select: { id: true, name: true },
  });
  if (!subject) return null;
  await prisma.user.update({
    where: { id: userId },
    data: { subjects: { connect: { id: subject.id } } },
  });
  return { name: subject.name };
}

/** The subject only if it is active and the user is enrolled; otherwise null. */
export function getSubjectBySlugForUser(userId: number, slug: string) {
  return prisma.subject.findFirst({
    where: { slug, isActive: true, users: { some: { id: userId } } },
  });
}
