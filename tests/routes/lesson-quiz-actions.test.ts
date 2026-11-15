import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { action, loader } from "~/routes/app/subjects.$slug.lessons.$lessonId";
import { userContext } from "~/server/auth/context.server";
import { enrollUser } from "~/server/content/subjects.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { prisma } from "~/server/database.server";
import { saveLessonQuestions } from "~/server/lesson-questions.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons, sampleQuestions } from "../helpers/content";

/** A two-lesson subject whose first lesson has the sample quiz, and an enrolled learner. */
async function fixture() {
  const user = await prisma.user.create({ data: { username: "learner", passwordHash: "x" } });
  const context = new RouterContextProvider();
  context.set(userContext, user);

  const { subject, lessonIds } = await makeSubjectWithLessons([2], 50);
  const [lessonId, nextLessonId] = lessonIds[0] ?? [];
  if (!lessonId || !nextLessonId) throw new Error("fixture");
  await enrollUser(user.id, subject.id);
  await saveLessonQuestions(lessonId, sampleQuestions());

  const questions = await prisma.question.findMany({
    where: { lessonId },
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const [single, multiple] = questions;
  if (!single || !multiple) throw new Error("fixture");
  const optionId = (question: typeof single, text: string) => {
    const option = question.options.find((entry) => entry.text === text);
    if (!option) throw new Error("fixture");
    return String(option.id);
  };

  const params = { slug: subject.slug, lessonId: String(lessonId) };
  const submit = (entries: [string, string][]) => {
    const body = new URLSearchParams([["intent", "answer"], ...entries]);
    const request = new Request(`http://x/subjects/${subject.slug}/lessons/${lessonId}`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return action({ request, context, params } as never);
  };
  const shown: [string, string][] = [
    ["questionId", String(single.id)],
    ["questionId", String(multiple.id)],
  ];
  return {
    user,
    context,
    subject,
    lessonId,
    nextLessonId,
    params,
    single,
    multiple,
    optionId,
    submit,
    shown,
  };
}

describe("lesson quiz", () => {
  beforeEach(resetDb);

  it("gives the page the questions without the answer key", async () => {
    const { context, params } = await fixture();
    const loaded = await loader({ context, params } as never);
    expect(loaded.questions.map((question) => question.prompt)).toEqual(["Pick one", "Pick all"]);
    expect(loaded.lesson).toMatchObject({ hasQuestions: true, passingScore: 50 });
    expect(JSON.stringify(loaded)).not.toContain("isCorrect");
  });

  it("records a failing attempt, keeps the next lesson locked, and reveals the right answers", async () => {
    const { user, subject, lessonId, nextLessonId, single, multiple, optionId, submit, shown } =
      await fixture();
    const outcome = await submit([
      ...shown,
      [`question-${single.id}`, optionId(single, "A")],
      [`question-${multiple.id}`, optionId(multiple, "X")],
    ]);

    expect(outcome).toMatchObject({
      data: {
        kind: "result",
        score: 0,
        passed: false,
        passingScore: 50,
        results: [
          {
            questionId: single.id,
            correct: false,
            correctOptionIds: [Number(optionId(single, "B"))],
          },
          { questionId: multiple.id, correct: false },
        ],
      },
    });
    const attempts = await prisma.lessonAttempt.findMany({ where: { userId: user.id, lessonId } });
    expect(attempts.map((attempt) => [attempt.score, attempt.passed])).toEqual([[0, false]]);
    await expect(getLessonForUser(user.id, subject.slug, nextLessonId)).rejects.toMatchObject({
      init: { status: 403 },
    });
  });

  it("passes at the passing score and unlocks the next lesson", async () => {
    const { user, subject, lessonId, nextLessonId, single, multiple, optionId, submit, shown } =
      await fixture();
    const outcome = await submit([
      ...shown,
      [`question-${single.id}`, optionId(single, "B")],
      [`question-${multiple.id}`, optionId(multiple, "X")],
      [`question-${multiple.id}`, optionId(multiple, "Z")],
    ]);

    expect(outcome).toMatchObject({ data: { kind: "result", score: 50, passed: true } });
    const progress = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });
    expect(progress.bestScore).toBe(50);
    expect(progress.completedAt).not.toBeNull();
    expect((await getLessonForUser(user.id, subject.slug, nextLessonId)).lesson.id).toBe(
      nextLessonId,
    );
  });

  it("asks for the missing answers without recording an attempt", async () => {
    const { single, multiple, optionId, submit, shown } = await fixture();
    const outcome = await submit([...shown, [`question-${single.id}`, optionId(single, "B")]]);
    expect(outcome).toMatchObject({
      init: { status: 400 },
      data: { kind: "error", error: "lesson.quiz.unanswered", unanswered: [multiple.id] },
    });
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });

  it("rejects a quiz that changed since the page was loaded", async () => {
    const { lessonId, single, optionId, submit, shown } = await fixture();
    const staleAnswer: [string, string] = [`question-${single.id}`, optionId(single, "B")];
    await saveLessonQuestions(lessonId, sampleQuestions());

    const outcome = await submit([...shown, staleAnswer]);
    expect(outcome).toMatchObject({
      init: { status: 409 },
      data: { kind: "error", error: "lesson.quiz.changed" },
    });
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });

  it("refuses options of another question and two answers to a single-answer question", async () => {
    const { single, multiple, optionId, submit, shown } = await fixture();
    await expect(
      submit([
        ...shown,
        [`question-${single.id}`, optionId(multiple, "X")],
        [`question-${multiple.id}`, optionId(multiple, "X")],
      ]),
    ).rejects.toMatchObject({ init: { status: 400 } });
    await expect(
      submit([
        ...shown,
        [`question-${single.id}`, optionId(single, "A")],
        [`question-${single.id}`, optionId(single, "B")],
        [`question-${multiple.id}`, optionId(multiple, "X")],
      ]),
    ).rejects.toMatchObject({ init: { status: 400 } });
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });

  it("does not let a lesson with questions be completed by clicking through", async () => {
    const { context, params, subject, lessonId } = await fixture();
    const request = new Request(`http://x/subjects/${subject.slug}/lessons/${lessonId}`, {
      method: "POST",
      body: new URLSearchParams({ intent: "complete" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    await expect(action({ request, context, params } as never)).rejects.toMatchObject({
      init: { status: 403 },
    });
  });
});
