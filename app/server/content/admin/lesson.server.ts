import {
  extractAssetIds,
  LessonContent as LessonContentSchema,
  type LessonContent,
} from "~/schemas/content-blocks";
import { prisma } from "~/server/database.server";
import { assetsExist, parseLessonContent, syncLessonAssets } from "~/server/lesson-content.server";
import { assetUrlMap } from "~/server/storage/assets.server";
import { moveToPositionOf, swapWithNeighbour, type MoveDirection } from "~/shared/ordering";
import type { CreateResult } from "./subject.server";

/**
 * Admin writers for the Lesson table, including `draftContent`. `Lesson.content` itself is written
 * only by publishing (publish.server.ts -> saveLessonContent). New lessons start unpublished.
 */

export interface LessonInput {
  title: string;
  passingScore: number | null;
}

export type DraftResult = { ok: true } | { ok: false; reason: "NOT_FOUND" | "UNKNOWN_ASSET" };

export async function createLesson(sectionId: number, input: LessonInput): Promise<CreateResult> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) return { ok: false, reason: "NOT_FOUND" };
  const last = await prisma.lesson.aggregate({ where: { sectionId }, _max: { sortOrder: true } });
  const created = await prisma.lesson.create({
    data: { sectionId, ...input, sortOrder: (last._max.sortOrder ?? 0) + 1, content: [] },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function updateLesson(id: number, input: LessonInput): Promise<boolean> {
  const { count } = await prisma.lesson.updateMany({ where: { id }, data: input });
  return count === 1;
}

/** Cascades to progress, attempts, and LessonAsset rows. */
export async function deleteLesson(id: number): Promise<boolean> {
  const { count } = await prisma.lesson.deleteMany({ where: { id } });
  return count === 1;
}

/** Swap with the neighbour, then rewrite sortOrder 1..n for the whole section in one transaction. */
export async function moveLesson(id: number, direction: MoveDirection): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { sectionId: true } });
  if (!lesson) return false;
  const siblings = await prisma.lesson.findMany({
    where: { sectionId: lesson.sectionId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const reordered = swapWithNeighbour(siblings, id, direction);
  if (!reordered) return false;
  await writeLessonOrder(reordered);
  return true;
}

/**
 * Drag and drop: put the lesson where `targetId` is, shifting the lessons in between. Both must
 * be in the same section; false otherwise.
 */
export async function reorderLesson(id: number, targetId: number): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { sectionId: true } });
  if (!lesson) return false;
  const siblings = await prisma.lesson.findMany({
    where: { sectionId: lesson.sectionId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const reordered = moveToPositionOf(siblings, id, targetId);
  if (!reordered) return false;
  await writeLessonOrder(reordered);
  return true;
}

/** Rewrite sortOrder as 1..n in the given order, in one transaction. */
async function writeLessonOrder(ordered: { id: number }[]): Promise<void> {
  await prisma.$transaction(
    ordered.map((row, index) =>
      prisma.lesson.update({ where: { id: row.id }, data: { sortOrder: index + 1 } }),
    ),
  );
}

/**
 * The lesson as the editor sees it: the draft when there is a valid one, otherwise the live
 * content. A draft that no longer matches the block schema is reported as `draftInvalid` instead
 * of failing the page, so the admin can save a good draft over it.
 */
export async function getLessonForAdmin(id: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          id: true,
          title: true,
          subject: {
            select: { id: true, name: true, direction: true, accentColor: true, icon: true },
          },
        },
      },
    },
  });
  if (!lesson) return null;
  const hasDraft = lesson.draftContent !== null;
  const draft = hasDraft ? LessonContentSchema.safeParse(lesson.draftContent) : null;
  const draftInvalid = draft !== null && !draft.success;
  const blocks = draft?.success ? draft.data : parseLessonContent(lesson.content);
  const assetUrls = await assetUrlMap(extractAssetIds(blocks));
  const { content: _content, draftContent: _draftContent, ...rest } = lesson;
  return { ...rest, blocks, hasDraft, draftInvalid, assetUrls };
}

/**
 * Validate and store an unpublished edit. Never touches `content`. LessonAsset is synced to the
 * union of the live and draft assets, so a draft's uploads are referenced (and not swept) while
 * the live content's assets stay protected.
 */
export async function saveLessonDraft(id: number, blocks: LessonContent): Promise<DraftResult> {
  const draftContent = LessonContentSchema.parse(blocks);
  const draftAssetIds = extractAssetIds(draftContent);
  if (!(await assetsExist(draftAssetIds))) return { ok: false, reason: "UNKNOWN_ASSET" };

  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { content: true } });
  if (!lesson) return { ok: false, reason: "NOT_FOUND" };
  const live = LessonContentSchema.safeParse(lesson.content);
  const liveAssetIds = live.success ? extractAssetIds(live.data) : [];
  const assetIds = [...new Set([...liveAssetIds, ...draftAssetIds])];

  await prisma.$transaction(async (transaction) => {
    await transaction.lesson.update({ where: { id }, data: { draftContent } });
    await syncLessonAssets(id, assetIds, transaction);
  });
  return { ok: true };
}
