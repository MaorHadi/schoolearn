import { Prisma } from "../../../prisma/generated/client/client";
import { prisma } from "~/server/database.server";
import {
  LessonContentError,
  parseLessonContent,
  saveLessonContent,
  UnknownAssetError,
} from "~/server/lesson-content.server";
import { sweepOrphanAssets } from "~/server/storage/sweep.server";

export type PublishFailureReason = "INVALID_CONTENT" | "UNKNOWN_ASSET";

export interface PublishResult {
  /** Subjects that were published. Unknown ids are neither published nor failed. */
  published: number;
  /** Subjects left exactly as they were because a draft could not become live content. */
  failed: { subjectId: number; reason: PublishFailureReason }[];
}

/**
 * Publish subjects, each in its own transaction: every lesson draft becomes the live content
 * (through saveLessonContent, which syncs LessonAsset), unpublished sections and lessons get
 * their `publishedAt`, and the subject becomes active. A subject whose draft is invalid or
 * references a missing asset is rolled back and reported in `failed`; the other subjects are
 * unaffected. Orphaned uploads are swept afterwards.
 */
export async function publishSubjects(subjectIds: number[]): Promise<PublishResult> {
  const result: PublishResult = { published: 0, failed: [] };
  for (const subjectId of subjectIds) {
    try {
      if (await publishSubject(subjectId)) result.published += 1;
    } catch (error) {
      const reason = failureReasonOf(error);
      if (!reason) throw error;
      result.failed.push({ subjectId, reason });
    }
  }
  await sweepOrphanAssets();
  return result;
}

function failureReasonOf(error: unknown): PublishFailureReason | null {
  if (error instanceof LessonContentError) return "INVALID_CONTENT";
  if (error instanceof UnknownAssetError) return "UNKNOWN_ASSET";
  return null;
}

async function publishSubject(subjectId: number): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const subject = await transaction.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        sections: {
          select: {
            lessons: {
              where: { draftContent: { not: Prisma.DbNull } },
              select: { id: true, draftContent: true },
            },
          },
        },
      },
    });
    if (!subject) return false;

    const drafts = subject.sections.flatMap((section) => section.lessons);
    for (const lesson of drafts) {
      await saveLessonContent(lesson.id, parseLessonContent(lesson.draftContent), transaction);
    }

    const publishedAt = new Date();
    await transaction.lesson.updateMany({
      where: { id: { in: drafts.map((lesson) => lesson.id) } },
      data: { draftContent: Prisma.DbNull },
    });
    await transaction.lesson.updateMany({
      where: { section: { subjectId }, publishedAt: null },
      data: { publishedAt },
    });
    await transaction.section.updateMany({
      where: { subjectId, publishedAt: null },
      data: { publishedAt },
    });
    await transaction.subject.update({
      where: { id: subjectId },
      data: { isActive: true, publishedAt },
    });
    return true;
  });
}
