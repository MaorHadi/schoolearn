import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { action, loader } from "~/routes/admin/lessons.$lessonId.questions";
import { userContext } from "~/server/auth/context.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons, sampleQuestions } from "../helpers/content";

async function contextFor(role: "USER" | "ADMIN") {
  const user = await prisma.user.create({
    data: { username: role.toLowerCase(), passwordHash: "x", role },
  });
  const context = new RouterContextProvider();
  context.set(userContext, user);
  return context;
}

function saveRequest(url: string, questions: unknown, intent = "save-questions") {
  return new Request(url, {
    method: "POST",
    body: new URLSearchParams({ intent, questions: JSON.stringify(questions) }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

describe("question editor route", () => {
  beforeEach(resetDb);

  async function fixture() {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    return {
      lessonId,
      url: `http://x/admin/lessons/${lessonId}/questions`,
      params: { lessonId: String(lessonId) },
    };
  }

  it("refuses a plain user", async () => {
    const { url, params, lessonId } = await fixture();
    const context = await contextFor("USER");
    await expect(loader({ context, params } as never)).rejects.toMatchObject({
      init: { status: 403 },
    });
    await expect(
      action({ request: saveRequest(url, sampleQuestions()), context, params } as never),
    ).rejects.toMatchObject({ init: { status: 403 } });
    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.draftQuestions).toBeNull();
  });

  it("saves the question list as a draft and loads it back", async () => {
    const { url, params, lessonId } = await fixture();
    const context = await contextFor("ADMIN");
    expect(
      await action({ request: saveRequest(url, sampleQuestions()), context, params } as never),
    ).toBeNull();

    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.draftQuestions).toEqual(sampleQuestions());
    expect(await prisma.question.count()).toBe(0);

    const loaded = await loader({ context, params } as never);
    expect(loaded.lesson).toMatchObject({ hasDraft: true, questions: sampleQuestions() });
  });

  it("answers invalid questions with a form error and rejects other intents", async () => {
    const { url, params, lessonId } = await fixture();
    const context = await contextFor("ADMIN");
    const [question] = sampleQuestions();
    if (!question) throw new Error("fixture");
    const noCorrect = {
      ...question,
      options: question.options.map((option) => ({ ...option, isCorrect: false })),
    };

    const invalid = await action({
      request: saveRequest(url, [noCorrect]),
      context,
      params,
    } as never);
    expect(invalid).toMatchObject({
      init: { status: 400 },
      data: { formError: "admin.error.questions" },
    });
    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.draftQuestions).toBeNull();

    await expect(
      action({ request: saveRequest(url, [], "nonsense"), context, params } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });
    await expect(
      action({
        request: saveRequest(url, sampleQuestions()),
        context,
        params: { lessonId: "999999" },
      } as never),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });
});
