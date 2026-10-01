import { env } from "~/server/env.server";
import { prisma } from "~/server/database.server";

export function effectivePassingScore(lesson: { passingScore: number | null }): number {
  return lesson.passingScore ?? env.DEFAULT_LESSON_PASSING_SCORE;
}

export interface AttemptResult {
  passed: boolean;
  bestScore: number;
  completedAt: Date | null;
}

/** MariaDB/Prisma codes for transient write conflicts that are safe to retry. */
const TRANSIENT_CODES = new Set(["P2034", "1020", "1213", "1205"]);
const MAX_RETRIES = 5;

function isTransientConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.code === "string" && TRANSIENT_CODES.has(candidate.code)) return true;
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return /Code: `(1020|1213|1205)`/.test(message);
}

/**
 * Record one try. The only writer of LessonAttempt and LessonProgress.
 *
 * Attempts are append-only (createdAt feeds future streak calculation). Progress keeps the
 * best score and the first completion time. The progress write is a single atomic SQL
 * statement (INSERT ... ON DUPLICATE KEY UPDATE with GREATEST / COALESCE), so concurrent
 * attempts for the same user and lesson can never lose a higher score or a completion.
 * Transient conflicts between concurrent transactions are retried.
 */
export async function recordAttempt(input: {
  userId: number;
  lessonId: number;
  score: number;
}): Promise<AttemptResult> {
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 100) {
    throw new Error("score must be an integer between 0 and 100");
  }

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: input.lessonId },
    select: { passingScore: true },
  });
  const passed = input.score >= effectivePassingScore(lesson);

  for (let retry = 0; ; retry++) {
    try {
      return await writeAttempt(input, passed);
    } catch (error) {
      if (retry >= MAX_RETRIES || !isTransientConflict(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (retry + 1)));
    }
  }
}

async function writeAttempt(
  input: { userId: number; lessonId: number; score: number },
  passed: boolean,
): Promise<AttemptResult> {
  const now = new Date();
  const completedAtIfPassed = passed ? now : null;

  return prisma.$transaction(async (transaction) => {
    await transaction.lessonAttempt.create({
      data: {
        userId: input.userId,
        lessonId: input.lessonId,
        score: input.score,
        passed,
        createdAt: now,
      },
    });

    // Monotonic upsert: bestScore only rises, completedAt is only ever set once.
    await transaction.$executeRaw`
      INSERT INTO LessonProgress (userId, lessonId, bestScore, completedAt, updatedAt)
      VALUES (${input.userId}, ${input.lessonId}, ${input.score}, ${completedAtIfPassed}, ${now})
      ON DUPLICATE KEY UPDATE
        bestScore = GREATEST(bestScore, VALUES(bestScore)),
        completedAt = COALESCE(completedAt, VALUES(completedAt)),
        updatedAt = VALUES(updatedAt)
    `;

    const progress = await transaction.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: input.userId, lessonId: input.lessonId } },
      select: { bestScore: true, completedAt: true },
    });
    return { passed, bestScore: progress.bestScore, completedAt: progress.completedAt };
  });
}
