import {
  extractAssetIds,
  LessonContent as LessonContentSchema,
  type LessonContent,
} from "~/schemas/content-blocks";
import { prisma } from "~/server/database.server";
import type { Prisma } from "../../prisma/generated/client/client";

/** The singleton or a transaction client; writers accept either so callers can compose them. */
export type DatabaseClient = typeof prisma | Prisma.TransactionClient;

/** Thrown when stored lesson content does not match the block schema. */
export class LessonContentError extends Error {
  constructor(public readonly issues: unknown[]) {
    super("Invalid lesson content");
    this.name = "LessonContentError";
  }
}

/** Thrown when lesson content references an Asset that does not exist. */
export class UnknownAssetError extends Error {
  constructor(public readonly lessonId: number) {
    super(`Lesson content references an unknown asset (lesson ${lessonId})`);
    this.name = "UnknownAssetError";
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

/** True when every id is an existing Asset. */
export async function assetsExist(
  assetIds: number[],
  client: DatabaseClient = prisma,
): Promise<boolean> {
  if (assetIds.length === 0) return true;
  const found = await client.asset.count({ where: { id: { in: assetIds } } });
  return found === assetIds.length;
}

/** Run `work` inside a transaction, or directly when `client` already is one. */
export async function withTransaction<T>(
  client: DatabaseClient,
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return "$transaction" in client ? client.$transaction(work) : work(client);
}

/** Make LessonAsset rows for `lessonId` match `assetIds` exactly. */
export async function syncLessonAssets(
  lessonId: number,
  assetIds: number[],
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.lessonAsset.deleteMany({ where: { lessonId, assetId: { notIn: assetIds } } });
  for (const assetId of assetIds) {
    await transaction.lessonAsset.upsert({
      where: { lessonId_assetId: { lessonId, assetId } },
      create: { lessonId, assetId },
      update: {},
    });
  }
}

/**
 * The only way to write Lesson.content. Validates the blocks, verifies every referenced
 * asset exists, stores the JSON, and syncs LessonAsset so usage is queryable and a used
 * asset cannot be deleted.
 */
export async function saveLessonContent(
  lessonId: number,
  blocks: LessonContent,
  client: DatabaseClient = prisma,
): Promise<void> {
  const content = serializeLessonContent(blocks);
  const assetIds = extractAssetIds(content);

  if (!(await assetsExist(assetIds, client))) throw new UnknownAssetError(lessonId);

  await withTransaction(client, async (transaction) => {
    await transaction.lesson.update({ where: { id: lessonId }, data: { content } });
    await syncLessonAssets(lessonId, assetIds, transaction);
  });
}
