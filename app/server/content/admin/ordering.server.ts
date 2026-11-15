import type { Prisma } from "../../../../prisma/generated/client/client";
import { prisma } from "~/server/database.server";

interface OrderedRow {
  id: number;
}

/**
 * Reorder the rows that share a parent (a section's lessons, a subject's sections): load them
 * in display order, let `reorder` produce the new order, and rewrite `sortOrder` as 1..n in one
 * transaction (which also repairs duplicates). False when `reorder` returns null (nothing to do).
 */
async function applyOrder(
  siblings: OrderedRow[],
  reorder: (siblings: OrderedRow[]) => OrderedRow[] | null,
  write: (id: number, sortOrder: number) => Prisma.PrismaPromise<unknown>,
): Promise<boolean> {
  const reordered = reorder(siblings);
  if (!reordered) return false;
  await prisma.$transaction(reordered.map((row, index) => write(row.id, index + 1)));
  return true;
}

const DISPLAY_ORDER = [{ sortOrder: "asc" }, { id: "asc" }] as const;

export async function reorderLessonsOf(
  lessonId: number,
  reorder: (siblings: OrderedRow[]) => OrderedRow[] | null,
): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { sectionId: true },
  });
  if (!lesson) return false;
  const siblings = await prisma.lesson.findMany({
    where: { sectionId: lesson.sectionId },
    orderBy: [...DISPLAY_ORDER],
    select: { id: true },
  });
  return applyOrder(siblings, reorder, (id, sortOrder) =>
    prisma.lesson.update({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderSectionsOf(
  sectionId: number,
  reorder: (siblings: OrderedRow[]) => OrderedRow[] | null,
): Promise<boolean> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { subjectId: true },
  });
  if (!section) return false;
  const siblings = await prisma.section.findMany({
    where: { subjectId: section.subjectId },
    orderBy: [...DISPLAY_ORDER],
    select: { id: true },
  });
  return applyOrder(siblings, reorder, (id, sortOrder) =>
    prisma.section.update({ where: { id }, data: { sortOrder } }),
  );
}
