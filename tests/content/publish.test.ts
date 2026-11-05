import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/server/auth/register.server";
import { createLesson, createSection, saveLessonDraft } from "~/server/content/admin.server";
import { publishSubjects } from "~/server/content/publish.server";
import { enrollUser, listActiveSubjectsForUser } from "~/server/content/subjects.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { prisma } from "~/server/database.server";
import { createAssetFromBuffer } from "~/server/storage/assets.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

describe("publishSubjects", () => {
  beforeEach(resetDb);

  it("publishes several subjects at once and leaves others untouched", async () => {
    const { subject: first } = await makeSubjectWithLessons([1], null, false);
    const { subject: second } = await makeSubjectWithLessons([1], null, false);
    const { subject: third } = await makeSubjectWithLessons([1], null, false);

    expect(await publishSubjects([first.id, second.id, 999_999])).toEqual({
      published: 2,
      failed: [],
    });

    const rows = await prisma.subject.findMany({ orderBy: { id: "asc" } });
    expect(rows.map((row) => [row.id, row.isActive, row.publishedAt !== null])).toEqual([
      [first.id, true, true],
      [second.id, true, true],
      [third.id, false, false],
    ]);
    const lessons = await prisma.lesson.findMany({ include: { section: true } });
    for (const lesson of lessons) {
      const shouldBePublished = lesson.section.subjectId !== third.id;
      expect(lesson.publishedAt !== null).toBe(shouldBePublished);
      expect(lesson.section.publishedAt !== null).toBe(shouldBePublished);
    }
  });

  it("copies drafts into live content, syncs assets, and clears the draft", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const asset = await createAssetFromBuffer({
      data: new Uint8Array([137, 80, 78, 71]),
      mimeType: "image/png",
      key: "t/pub.png",
    });
    const draft = [{ id: "i", type: "image" as const, assetId: asset.id, alt: "x" }];
    await saveLessonDraft(lessonId, draft);

    expect((await publishSubjects([subject.id])).published).toBe(1);

    const row = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { assets: true },
    });
    expect(row.content).toEqual(draft);
    expect(row.draftContent).toBeNull();
    expect(row.assets.map((entry) => entry.assetId)).toEqual([asset.id]);
  });

  it("rolls back a subject whose draft cannot go live and still publishes the others", async () => {
    const { subject: broken, lessonIds: brokenIds } = await makeSubjectWithLessons(
      [2],
      null,
      false,
    );
    const { subject: fine } = await makeSubjectWithLessons([1], null, false);
    const [goodLesson, badLesson] = brokenIds[0] ?? [];
    if (!goodLesson || !badLesson) throw new Error("fixture");
    const goodDraft = [{ id: "h", type: "heading", level: 1, text: "Good" }];
    await saveLessonDraft(goodLesson, goodDraft as never);
    // Bypass the writer to plant a draft that references an asset that does not exist.
    await prisma.lesson.update({
      where: { id: badLesson },
      data: { draftContent: [{ id: "i", type: "image", assetId: 424_242, alt: "x" }] },
    });

    expect(await publishSubjects([broken.id, fine.id])).toEqual({
      published: 1,
      failed: [{ subjectId: broken.id, reason: "UNKNOWN_ASSET" }],
    });

    const untouched = await prisma.lesson.findUniqueOrThrow({ where: { id: goodLesson } });
    expect(untouched.content).toEqual([]);
    expect(untouched.draftContent).toEqual(goodDraft);
    expect(untouched.publishedAt).toBeNull();
    const brokenRow = await prisma.subject.findUniqueOrThrow({ where: { id: broken.id } });
    expect(brokenRow.isActive).toBe(false);
    const fineRow = await prisma.subject.findUniqueOrThrow({ where: { id: fine.id } });
    expect(fineRow.isActive).toBe(true);

    await prisma.lesson.update({
      where: { id: badLesson },
      data: { draftContent: [{ id: "v", type: "video" }] },
    });
    expect((await publishSubjects([broken.id])).failed).toEqual([
      { subjectId: broken.id, reason: "INVALID_CONTENT" },
    ]);
  });

  it("makes new sections and lessons visible to learners only after publishing", async () => {
    const registered = await registerUser({ username: "alice", password: "password1" });
    if (!registered.ok) throw new Error("register failed");
    const { subject } = await makeSubjectWithLessons([1]);
    await enrollUser(registered.userId, subject.id);

    const section = await createSection(subject.id, "New");
    if (!section.ok) throw new Error("fixture");
    const lesson = await createLesson(section.id, { title: "Hidden", passingScore: null });
    if (!lesson.ok) throw new Error("fixture");

    let [listed] = await listActiveSubjectsForUser(registered.userId);
    expect(listed?.totalLessons).toBe(1);
    await expect(
      getLessonForUser(registered.userId, subject.slug, lesson.id),
    ).rejects.toMatchObject({ init: { status: 404 } });

    await publishSubjects([subject.id]);
    [listed] = await listActiveSubjectsForUser(registered.userId);
    expect(listed?.totalLessons).toBe(2);
  });
});
