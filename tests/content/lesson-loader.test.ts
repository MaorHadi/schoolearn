import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/server/auth/register.server";
import {
  enrollUser,
  getSubjectBySlugForUser,
  listActiveSubjectsForUser,
} from "~/server/content/subjects.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { recordAttempt } from "~/server/progress/attempts.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

function lessonAt(lessonIds: number[][], section: number, lesson: number): number {
  const id = lessonIds[section]?.[lesson];
  if (id === undefined) throw new Error("fixture missing lesson");
  return id;
}

describe("subjects", () => {
  let userId: number;

  beforeEach(async () => {
    await resetDb();
    const registered = await registerUser({ username: "alice", password: "password1" });
    if (!registered.ok) throw new Error("register failed");
    userId = registered.userId;
  });

  it("lists active subjects with enrollment state and enrolls idempotently", async () => {
    const { subject } = await makeSubjectWithLessons([1]);
    await prisma.subject.create({
      data: { slug: "inactive", name: "Off", locale: "en", direction: "ltr", isActive: false },
    });

    let listed = await listActiveSubjectsForUser(userId);
    expect(listed.map((entry) => [entry.slug, entry.enrolled])).toEqual([[subject.slug, false]]);

    await enrollUser(userId, subject.id);
    await enrollUser(userId, subject.id);
    listed = await listActiveSubjectsForUser(userId);
    expect(listed[0]?.enrolled).toBe(true);
  });

  it("getSubjectBySlugForUser requires enrollment and an active subject", async () => {
    const { subject } = await makeSubjectWithLessons([1]);
    expect(await getSubjectBySlugForUser(userId, subject.slug)).toBeNull();
    await enrollUser(userId, subject.id);
    expect((await getSubjectBySlugForUser(userId, subject.slug))?.id).toBe(subject.id);
    await prisma.subject.update({ where: { id: subject.id }, data: { isActive: false } });
    expect(await getSubjectBySlugForUser(userId, subject.slug)).toBeNull();
  });
});

describe("getLessonForUser", () => {
  let userId: number;

  beforeEach(async () => {
    await resetDb();
    const registered = await registerUser({ username: "alice", password: "password1" });
    if (!registered.ok) throw new Error("register failed");
    userId = registered.userId;
  });

  it("404s when not enrolled, 403s when locked, returns parsed content when unlocked", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    const first = lessonAt(lessonIds, 0, 0);
    const second = lessonAt(lessonIds, 0, 1);

    await expect(getLessonForUser(userId, subject.slug, first)).rejects.toMatchObject({
      init: { status: 404 },
    });

    await enrollUser(userId, subject.id);
    await expect(getLessonForUser(userId, subject.slug, second)).rejects.toMatchObject({
      init: { status: 403 },
    });

    const opened = await getLessonForUser(userId, subject.slug, first);
    expect(opened.blocks).toEqual([]);
    expect(opened.lesson.id).toBe(first);

    await recordAttempt({ userId, lessonId: first, score: 100 });
    expect((await getLessonForUser(userId, subject.slug, second)).lesson.id).toBe(second);
  });

  it("404s for a lesson that belongs to a different subject", async () => {
    const { subject } = await makeSubjectWithLessons([1]);
    const other = await makeSubjectWithLessons([1]);
    await enrollUser(userId, subject.id);
    await expect(
      getLessonForUser(userId, subject.slug, lessonAt(other.lessonIds, 0, 0)),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("surfaces invalid stored content as a 500 with a safe message, not a crash", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([1]);
    await enrollUser(userId, subject.id);
    const lessonId = lessonAt(lessonIds, 0, 0);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content: [{ id: "x", type: "video" }] },
    });
    await expect(getLessonForUser(userId, subject.slug, lessonId)).rejects.toMatchObject({
      init: { status: 500 },
    });
  });
});
