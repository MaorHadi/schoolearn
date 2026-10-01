import { prisma } from "~/server/database.server";

/** Active subjects in display order, each flagged with whether the user is enrolled. */
export async function listActiveSubjectsForUser(userId: number) {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      direction: true,
      users: { where: { id: userId }, select: { id: true } },
    },
  });
  return subjects.map(({ users, ...subject }) => ({ ...subject, enrolled: users.length > 0 }));
}

/**
 * Enrollment is the implicit User<->Subject relation. Idempotent.
 * Returns false (and changes nothing) if the subject does not exist or is inactive.
 */
export async function enrollUser(userId: number, subjectId: number): Promise<boolean> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, isActive: true },
    select: { id: true },
  });
  if (!subject) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { subjects: { connect: { id: subject.id } } },
  });
  return true;
}

/** The subject only if it is active and the user is enrolled; otherwise null. */
export function getSubjectBySlugForUser(userId: number, slug: string) {
  return prisma.subject.findFirst({
    where: { slug, isActive: true, users: { some: { id: userId } } },
  });
}
