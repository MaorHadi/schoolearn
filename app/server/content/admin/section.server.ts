import { prisma } from "~/server/database.server";
import { moveToPositionOf, swapWithNeighbour, type MoveDirection } from "~/shared/ordering";
import { reorderSectionsOf } from "./ordering.server";
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

/** Swap with the neighbour in the subject. False at the edge or when the section is gone. */
export function moveSection(id: number, direction: MoveDirection): Promise<boolean> {
  return reorderSectionsOf(id, (siblings) => swapWithNeighbour(siblings, id, direction));
}

/**
 * Drag and drop: put the section where `targetId` is, shifting the sections in between. Both
 * must be in the same subject; false otherwise.
 */
export function reorderSection(id: number, targetId: number): Promise<boolean> {
  return reorderSectionsOf(id, (siblings) => moveToPositionOf(siblings, id, targetId));
}
