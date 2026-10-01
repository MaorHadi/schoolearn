import {
  extractAssetIds,
  LessonContent as LessonContentSchema,
  type LessonContent,
} from "~/schemas/content-blocks";
import { prisma } from "~/server/database.server";

/** Thrown when stored lesson content does not match the block schema. */
export class LessonContentError extends Error {
  constructor(public readonly issues: unknown[]) {
    super("Invalid lesson content");
    this.name = "LessonContentError";
  }
}

/** Every read of Lesson.content goes through here. */
export function parseLessonContent(json: unknown): LessonContent {
  const result = LessonContentSchema.safeParse(json);
  if (!result.success) throw new LessonContentError(result.error.issues);
  return result.data;
}

/** Validate blocks for storage. Throws on invalid input. Prefer saveLessonContent() for writes. */
export function serializeLessonContent(blocks: LessonContent): LessonContent {
  return LessonContentSchema.parse(blocks);
}

/**
 * The only way to write Lesson.content. Validates the blocks, verifies every referenced
 * asset exists, stores the JSON, and syncs LessonAsset so usage is queryable and a used
 * asset cannot be deleted.
 */
export async function saveLessonContent(lessonId: number, blocks: LessonContent): Promise<void> {
  const content = serializeLessonContent(blocks);
  const assetIds = extractAssetIds(content);

  if (assetIds.length > 0) {
    const found = await prisma.asset.count({ where: { id: { in: assetIds } } });
    if (found !== assetIds.length) {
      throw new Error(`Lesson content references an unknown asset (lesson ${lessonId})`);
    }
  }

  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lessonId }, data: { content } }),
    prisma.lessonAsset.deleteMany({ where: { lessonId, assetId: { notIn: assetIds } } }),
    ...assetIds.map((assetId) =>
      prisma.lessonAsset.upsert({
        where: { lessonId_assetId: { lessonId, assetId } },
        create: { lessonId, assetId },
        update: {},
      }),
    ),
  ]);
}
