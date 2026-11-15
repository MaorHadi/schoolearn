import { beforeEach, describe, expect, it } from "vitest";
import {
  createLesson,
  createSection,
  createSubject,
  deleteLesson,
  deleteSection,
  deleteSubject,
  getLessonForAdmin,
  getSubjectForAdmin,
  listSubjectsForAdmin,
  moveLesson,
  moveSection,
  reorderLesson,
  reorderSection,
  saveLessonDraft,
  updateLesson,
  updateSection,
  updateSubject,
} from "~/server/content/admin.server";
import { publishSubjects } from "~/server/content/publish.server";
import { prisma } from "~/server/database.server";
import { createAssetFromBuffer } from "~/server/storage/assets.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

const subjectInput = {
  slug: "new-subject",
  name: "New subject",
  description: null,
  locale: "en",
  direction: "ltr" as const,
  accentColor: "#059669",
  icon: "atom" as const,
};

async function createdSubjectId() {
  const result = await createSubject(subjectInput);
  if (!result.ok) throw new Error("create failed");
  return result.id;
}

describe("admin subjects", () => {
  beforeEach(resetDb);

  it("creates a hidden subject and rejects a duplicate slug", async () => {
    const result = await createSubject(subjectInput);
    expect(result.ok).toBe(true);
    const row = await prisma.subject.findUniqueOrThrow({ where: { slug: "new-subject" } });
    expect(row).toMatchObject({ isActive: false, publishedAt: null, accentColor: "#059669" });

    expect(await createSubject(subjectInput)).toEqual({ ok: false, reason: "SLUG_TAKEN" });
  });

  it("updates, lists with pending state, and deletes", async () => {
    const id = await createdSubjectId();
    expect(await updateSubject(id, { ...subjectInput, name: "Renamed" })).toEqual({ ok: true });
    expect(await updateSubject(999_999, subjectInput)).toEqual({ ok: false, reason: "NOT_FOUND" });

    const { subject: published } = await makeSubjectWithLessons([1]);
    const listed = await listSubjectsForAdmin();
    // Alphabetical by name: "Renamed" before the fixture's "Test subject".
    expect(listed.map((entry) => [entry.name, entry.hasPendingChanges])).toEqual([
      ["Renamed", true],
      [published.name, false],
    ]);

    expect(await deleteSubject(id)).toBe(true);
    expect(await deleteSubject(id)).toBe(false);
  });

  it("flags pending changes for unpublished sections, lessons, and drafts", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const pending = async () =>
      (await listSubjectsForAdmin()).find((entry) => entry.id === subject.id)?.hasPendingChanges;

    expect(await pending()).toBe(false);
    await saveLessonDraft(lessonId, [{ id: "h", type: "heading", level: 1, text: "Draft" }]);
    expect(await pending()).toBe(true);
    await publishSubjects([subject.id]); // clears the draft
    expect(await pending()).toBe(false);

    const sectionId = (await getSubjectForAdmin(subject.id))?.sections[0]?.id;
    if (!sectionId) throw new Error("fixture");
    await createLesson(sectionId, { title: "Unpublished", passingScore: null });
    expect(await pending()).toBe(true);
  });
});

describe("admin structure", () => {
  beforeEach(resetDb);

  it("creates sections and lessons unpublished, appended at the end", async () => {
    const { subject } = await makeSubjectWithLessons([2]);
    const section = await createSection(subject.id, "Second");
    expect(section.ok).toBe(true);
    const tree = await getSubjectForAdmin(subject.id);
    expect(
      tree?.sections.map((entry) => [entry.title, entry.sortOrder, entry.publishedAt]),
    ).toEqual([
      ["S1", 1, expect.any(Date)],
      ["Second", 2, null],
    ]);

    const firstSection = tree?.sections[0];
    if (!firstSection) throw new Error("fixture");
    const lesson = await createLesson(firstSection.id, { title: "L3", passingScore: 70 });
    expect(lesson.ok).toBe(true);
    const lessons = (await getSubjectForAdmin(subject.id))?.sections[0]?.lessons;
    expect(lessons?.map((entry) => [entry.title, entry.sortOrder, entry.hasDraft])).toEqual([
      ["L1", 1, false],
      ["L2", 2, false],
      ["L3", 3, false],
    ]);
    expect(await createLesson(999_999, { title: "x", passingScore: null })).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("moves sections and lessons by swapping with the neighbour", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([3, 1]);
    const tree = await getSubjectForAdmin(subject.id);
    const [first, second] = tree?.sections ?? [];
    if (!first || !second) throw new Error("fixture");

    expect(await moveSection(second.id, "up")).toBe(true);
    expect((await getSubjectForAdmin(subject.id))?.sections.map((entry) => entry.title)).toEqual([
      "S2",
      "S1",
    ]);
    expect(await moveSection(second.id, "up")).toBe(false); // already first

    const middle = lessonIds[0]?.[1];
    if (!middle) throw new Error("fixture");
    expect(await moveLesson(middle, "down")).toBe(true);
    const lessons = (await getSubjectForAdmin(subject.id))?.sections.find(
      (entry) => entry.id === first.id,
    )?.lessons;
    expect(lessons?.map((entry) => entry.title)).toEqual(["L1", "L3", "L2"]);
    expect(lessons?.map((entry) => entry.sortOrder)).toEqual([1, 2, 3]);
  });

  it("drops a section or lesson at the position of another one", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([4, 1, 1]);
    const titles = async () => {
      const tree = await getSubjectForAdmin(subject.id);
      return {
        sections: tree?.sections.map((entry) => entry.title),
        lessons: tree?.sections.find((entry) => entry.title === "S1")?.lessons,
      };
    };
    const [firstLesson, , , lastLesson] = lessonIds[0] ?? [];
    const otherSectionLesson = lessonIds[1]?.[0];
    if (!firstLesson || !lastLesson || !otherSectionLesson) throw new Error("fixture");

    expect(await reorderLesson(firstLesson, lastLesson)).toBe(true);
    const moved = (await titles()).lessons;
    expect(moved?.map((entry) => entry.title)).toEqual(["L2", "L3", "L4", "L1"]);
    expect(moved?.map((entry) => entry.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(await reorderLesson(firstLesson, firstLesson)).toBe(false);
    expect(await reorderLesson(firstLesson, otherSectionLesson)).toBe(false); // another section
    expect(await reorderLesson(999_999, lastLesson)).toBe(false);

    const tree = await getSubjectForAdmin(subject.id);
    const [first, , third] = tree?.sections ?? [];
    if (!first || !third) throw new Error("fixture");
    expect(await reorderSection(third.id, first.id)).toBe(true);
    expect((await titles()).sections).toEqual(["S3", "S1", "S2"]);
    expect(await reorderSection(third.id, 999_999)).toBe(false);
  });

  it("renames and deletes sections and lessons", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    const sectionId = (await getSubjectForAdmin(subject.id))?.sections[0]?.id;
    const lessonId = lessonIds[0]?.[0];
    if (!sectionId || !lessonId) throw new Error("fixture");

    expect(await updateSection(sectionId, "Renamed")).toBe(true);
    expect(await updateLesson(lessonId, { title: "Renamed lesson", passingScore: 55 })).toBe(true);
    const tree = await getSubjectForAdmin(subject.id);
    expect(tree?.sections[0]?.title).toBe("Renamed");
    expect(tree?.sections[0]?.lessons[0]).toMatchObject({
      title: "Renamed lesson",
      passingScore: 55,
    });

    expect(await deleteLesson(lessonId)).toBe(true);
    expect(await deleteLesson(lessonId)).toBe(false);
    expect(await deleteSection(sectionId)).toBe(true);
    expect(await getSubjectForAdmin(subject.id)).toMatchObject({ sections: [] });
  });
});

describe("lesson drafts", () => {
  beforeEach(resetDb);

  it("saves a draft without touching the published content", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const live = [{ id: "h", type: "heading" as const, level: 1 as const, text: "Live" }];
    await prisma.lesson.update({ where: { id: lessonId }, data: { content: live } });

    const draft = [{ id: "h", type: "heading" as const, level: 1 as const, text: "Draft" }];
    expect(await saveLessonDraft(lessonId, draft)).toEqual({ ok: true });

    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.content).toEqual(live);
    expect(row.draftContent).toEqual(draft);

    const forAdmin = await getLessonForAdmin(lessonId);
    expect(forAdmin?.blocks).toEqual(draft);
    expect(forAdmin?.hasDraft).toBe(true);
    expect(forAdmin?.draftInvalid).toBe(false);
  });

  it("falls back to the live content when the stored draft is invalid", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const live = [{ id: "h", type: "heading" as const, level: 1 as const, text: "Live" }];
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content: live, draftContent: [{ id: "v", type: "video" }] },
    });

    const forAdmin = await getLessonForAdmin(lessonId);
    expect(forAdmin?.blocks).toEqual(live);
    expect(forAdmin?.hasDraft).toBe(true);
    expect(forAdmin?.draftInvalid).toBe(true);
  });

  it("rejects unknown assets and resolves known ones", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");

    expect(
      await saveLessonDraft(lessonId, [{ id: "i", type: "image", assetId: 424_242, alt: "x" }]),
    ).toEqual({ ok: false, reason: "UNKNOWN_ASSET" });
    expect(await saveLessonDraft(999_999, [])).toEqual({ ok: false, reason: "NOT_FOUND" });

    const asset = await createAssetFromBuffer({
      data: new Uint8Array([137, 80, 78, 71]),
      mimeType: "image/png",
      key: "t/draft.png",
    });
    await saveLessonDraft(lessonId, [{ id: "i", type: "image", assetId: asset.id, alt: "x" }]);
    const forAdmin = await getLessonForAdmin(lessonId);
    expect(forAdmin?.assetUrls[asset.id]).toBe("/media/t/draft.png");
    // The draft's asset is referenced so the orphan sweep leaves it alone.
    expect(await prisma.lessonAsset.findMany({ where: { lessonId } })).toMatchObject([
      { assetId: asset.id },
    ]);
  });
});
