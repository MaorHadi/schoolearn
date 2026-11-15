import { beforeEach, describe, expect, it } from "vitest";
import {
  getQuestionsForAdmin,
  getSubjectForAdmin,
  listSubjectsForAdmin,
  saveQuestionsDraft,
} from "~/server/content/admin.server";
import { getLessonAnswerKey } from "~/server/content/lessons.server";
import { publishSubjects } from "~/server/content/publish.server";
import { prisma } from "~/server/database.server";
import { saveLessonQuestions } from "~/server/lesson-questions.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons, sampleQuestions } from "../helpers/content";

async function fixture() {
  const { subject, lessonIds } = await makeSubjectWithLessons([1]);
  const lessonId = lessonIds[0]?.[0];
  if (!lessonId) throw new Error("fixture");
  return { subject, lessonId };
}

describe("saveLessonQuestions", () => {
  beforeEach(resetDb);

  it("replaces the lesson's question rows in order", async () => {
    const { lessonId } = await fixture();
    await saveLessonQuestions(lessonId, sampleQuestions());
    await saveLessonQuestions(lessonId, sampleQuestions().reverse());

    const rows = await prisma.question.findMany({
      where: { lessonId },
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    expect(rows.map((row) => [row.prompt, row.type, row.sortOrder])).toEqual([
      ["Pick all", "MULTIPLE_ANSWER", 1],
      ["Pick one", "MULTIPLE_CHOICE", 2],
    ]);
    expect(rows[1]?.options.map((option) => [option.text, option.isCorrect])).toEqual([
      ["A", false],
      ["B", true],
      ["C", false],
    ]);
    expect(await prisma.questionOption.count()).toBe(6);
  });

  it("rejects an invalid question list without touching the rows", async () => {
    const { lessonId } = await fixture();
    await saveLessonQuestions(lessonId, sampleQuestions());
    await expect(
      saveLessonQuestions(lessonId, [{ id: "bad", type: "MULTIPLE_CHOICE" }] as never),
    ).rejects.toMatchObject({ name: "LessonQuestionsError" });
    expect(await prisma.question.count({ where: { lessonId } })).toBe(2);
  });

  it("gives the answer key with the correct options of each question", async () => {
    const { lessonId } = await fixture();
    await saveLessonQuestions(lessonId, sampleQuestions());
    const key = await getLessonAnswerKey(lessonId);
    expect(
      key.map((entry) => [entry.type, entry.optionIds.length, entry.correctOptionIds.length]),
    ).toEqual([
      ["MULTIPLE_CHOICE", 3, 1],
      ["MULTIPLE_ANSWER", 3, 2],
    ]);
  });
});

describe("question drafts", () => {
  beforeEach(resetDb);

  it("saves a draft without touching the live quiz and flags the subject as pending", async () => {
    const { subject, lessonId } = await fixture();
    const pending = async () =>
      (await listSubjectsForAdmin()).find((entry) => entry.id === subject.id)?.hasPendingChanges;
    expect(await pending()).toBe(false);

    expect(await saveQuestionsDraft(lessonId, sampleQuestions())).toBe(true);
    expect(await saveQuestionsDraft(999_999, sampleQuestions())).toBe(false);

    expect(await prisma.question.count({ where: { lessonId } })).toBe(0);
    expect(await pending()).toBe(true);
    expect((await getSubjectForAdmin(subject.id))?.sections[0]?.lessons[0]?.hasDraft).toBe(true);

    const forAdmin = await getQuestionsForAdmin(lessonId);
    expect(forAdmin?.questions).toEqual(sampleQuestions());
    expect(forAdmin).toMatchObject({ hasDraft: true, draftInvalid: false });
  });

  it("shows the live quiz when there is no draft, or the draft is invalid", async () => {
    const { lessonId } = await fixture();
    await saveLessonQuestions(lessonId, sampleQuestions());

    const live = await getQuestionsForAdmin(lessonId);
    expect(live).toMatchObject({ hasDraft: false, draftInvalid: false });
    expect(live?.questions.map((question) => question.prompt)).toEqual(["Pick one", "Pick all"]);
    expect(live?.questions[0]?.options.map((option) => option.isCorrect)).toEqual([
      false,
      true,
      false,
    ]);

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { draftQuestions: [{ prompt: "broken" }] },
    });
    const broken = await getQuestionsForAdmin(lessonId);
    expect(broken).toMatchObject({ hasDraft: true, draftInvalid: true });
    expect(broken?.questions).toHaveLength(2);
    expect(await getQuestionsForAdmin(999_999)).toBeNull();
  });

  it("publishing turns the draft into the live quiz and clears it", async () => {
    const { subject, lessonId } = await fixture();
    await saveQuestionsDraft(lessonId, sampleQuestions());

    expect(await publishSubjects([subject.id])).toEqual({ published: 1, failed: [] });

    const row = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    expect(row.draftQuestions).toBeNull();
    expect(row.questions.map((question) => question.prompt)).toEqual(["Pick one", "Pick all"]);

    // An empty draft removes the quiz.
    await saveQuestionsDraft(lessonId, []);
    await publishSubjects([subject.id]);
    expect(await prisma.question.count({ where: { lessonId } })).toBe(0);
  });

  it("an invalid question draft fails only its own subject", async () => {
    const { subject: broken, lessonId } = await fixture();
    const { subject: fine } = await makeSubjectWithLessons([1], null, false);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { draftQuestions: [{ prompt: "broken" }] },
    });

    expect(await publishSubjects([broken.id, fine.id])).toEqual({
      published: 1,
      failed: [{ subjectId: broken.id, reason: "INVALID_QUESTIONS" }],
    });
    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.draftQuestions).not.toBeNull();
  });
});
