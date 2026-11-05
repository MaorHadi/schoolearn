import { prisma } from "~/server/database.server";
import { swapWithNeighbour, type MoveDirection } from "~/shared/ordering";
import type { CreateResult } from "./subject.server";

/** Admin writers for the Section table. New sections start unpublished (`publishedAt: null`). */

export async function createSection(subjectId: number, title: string): Promise<CreateResult> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) return { ok: false, reason: "NOT_FOUND" };
  const last = await prisma.section.aggregate({ where: { subjectId }, _max: { sortOrder: true } });
  const created = await prisma.section.create({
    data: { subjectId, title, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function updateSection(id: number, title: string): Promise<boolean> {
  const { count } = await prisma.section.updateMany({ where: { id }, data: { title } });
  return count === 1;
}

/** Cascades to the section's lessons. */
export async function deleteSection(id: number): Promise<boolean> {
  const { count } = await prisma.section.deleteMany({ where: { id } });
  return count === 1;
}

/** Swap with the neighbour, then rewrite sortOrder 1..n for the whole subject in one transaction. */
export async function moveSection(id: number, direction: MoveDirection): Promise<boolean> {
  const section = await prisma.section.findUnique({ where: { id }, select: { subjectId: true } });
  if (!section) return false;
  const siblings = await prisma.section.findMany({
    where: { subjectId: section.subjectId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const reordered = swapWithNeighbour(siblings, id, direction);
  if (!reordered) return false;
  await prisma.$transaction(
    reordered.map((row, index) =>
      prisma.section.update({ where: { id: row.id }, data: { sortOrder: index + 1 } }),
    ),
  );
  return true;
}
