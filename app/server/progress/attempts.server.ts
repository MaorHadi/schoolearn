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

/**
 * Record one try. The only writer of LessonAttempt and LessonProgress.
 *
 * Attempts are append-only (createdAt feeds future streak calculation). Progress keeps the
 * best score and the first completion time; a later failure never lowers the score or clears
 * completion, so nothing ever re-locks.
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
  const now = new Date();
  const key = { userId: input.userId, lessonId: input.lessonId };

  return prisma.$transaction(async (transaction) => {
    await transaction.lessonAttempt.create({
      data: { ...key, score: input.score, passed, createdAt: now },
    });

    const existing = await transaction.lessonProgress.findUnique({
      where: { userId_lessonId: key },
    });
    const bestScore = Math.max(existing?.bestScore ?? 0, input.score);
    const completedAt = existing?.completedAt ?? (passed ? now : null);

    await transaction.lessonProgress.upsert({
      where: { userId_lessonId: key },
      create: { ...key, bestScore, completedAt },
      update: { bestScore, completedAt },
    });

    return { passed, bestScore, completedAt };
  });
}
