import { beforeEach, describe, expect, it } from "vitest";
import { env } from "~/server/env.server";
import { effectivePassingScore, recordAttempt } from "~/server/progress/attempts.server";
import { getSubjectTree } from "~/server/progress/unlock.server";
import { registerUser } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

function firstLesson(lessonIds: number[][], section = 0, lesson = 0): number {
  const id = lessonIds[section]?.[lesson];
  if (id === undefined) throw new Error("fixture missing lesson");
  return id;
}

describe("recordAttempt", () => {
  let userId: number;

  beforeEach(async () => {
    await resetDb();
    const registered = await registerUser({ username: "alice", password: "password1" });
    if (!registered.ok) throw new Error("register failed");
    userId = registered.userId;
  });

  it("uses lesson passingScore when set, else the env default", () => {
    expect(effectivePassingScore({ passingScore: 80 })).toBe(80);
    expect(effectivePassingScore({ passingScore: null })).toBe(env.DEFAULT_LESSON_PASSING_SCORE);
  });

  it("writes one attempt per try and keeps the best score and first completion", async () => {
    const { lessonIds } = await makeSubjectWithLessons([2]);
    const lessonId = firstLesson(lessonIds);

    const first = await recordAttempt({ userId, lessonId, score: 40 });
    expect(first).toMatchObject({ passed: false, bestScore: 40, completedAt: null });

    const second = await recordAttempt({ userId, lessonId, score: 90 });
    expect(second.passed).toBe(true);
    expect(second.bestScore).toBe(90);
    expect(second.completedAt).not.toBeNull();

    const third = await recordAttempt({ userId, lessonId, score: 10 });
    expect(third.passed).toBe(false);
    expect(third.bestScore).toBe(90);
    expect(third.completedAt?.getTime()).toBe(second.completedAt?.getTime());

    expect(await prisma.lessonAttempt.count({ where: { userId, lessonId } })).toBe(3);
    expect(await prisma.lessonProgress.count({ where: { userId, lessonId } })).toBe(1);
  });

  it("passing unlocks the next lesson and a later failure never re-locks it", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    const lessonId = firstLesson(lessonIds);

    await recordAttempt({ userId, lessonId, score: 100 });
    let tree = await getSubjectTree(userId, subject.id);
    expect(tree[0]?.lessons[1]?.unlocked).toBe(true);

    await recordAttempt({ userId, lessonId, score: 0 });
    tree = await getSubjectTree(userId, subject.id);
    expect(tree[0]?.lessons[1]?.unlocked).toBe(true);
    expect(tree[0]?.lessons[0]?.bestScore).toBe(100);
  });

  it("completing every lesson in a section unlocks the next section", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2, 1]);
    await recordAttempt({ userId, lessonId: firstLesson(lessonIds, 0, 0), score: 100 });
    await recordAttempt({ userId, lessonId: firstLesson(lessonIds, 0, 1), score: 100 });
    const tree = await getSubjectTree(userId, subject.id);
    expect(tree[1]?.unlocked).toBe(true);
    expect(tree[1]?.lessons[0]?.unlocked).toBe(true);
  });

  it("respects a per-lesson passing score", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1], 90);
    const lessonId = firstLesson(lessonIds);
    expect((await recordAttempt({ userId, lessonId, score: 85 })).passed).toBe(false);
    expect((await recordAttempt({ userId, lessonId, score: 90 })).passed).toBe(true);
  });

  it("rejects out-of-range or non-integer scores without writing anything", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = firstLesson(lessonIds);
    await expect(recordAttempt({ userId, lessonId, score: 101 })).rejects.toThrow();
    await expect(recordAttempt({ userId, lessonId, score: -1 })).rejects.toThrow();
    await expect(recordAttempt({ userId, lessonId, score: 50.5 })).rejects.toThrow();
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });

  it("concurrent attempts never lose the best score or the completion", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = firstLesson(lessonIds);
    await Promise.all([
      recordAttempt({ userId, lessonId, score: 90 }),
      recordAttempt({ userId, lessonId, score: 40 }),
      recordAttempt({ userId, lessonId, score: 10 }),
    ]);
    const progress = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId } },
    });
    expect(progress.bestScore).toBe(90);
    expect(progress.completedAt).not.toBeNull();
    expect(await prisma.lessonAttempt.count({ where: { userId, lessonId } })).toBe(3);
  });

  it("attempt timestamps are recorded for future streak calculation", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const before = Date.now() - 1000;
    await recordAttempt({ userId, lessonId: firstLesson(lessonIds), score: 70 });
    const attempt = await prisma.lessonAttempt.findFirstOrThrow({ where: { userId } });
    expect(attempt.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
