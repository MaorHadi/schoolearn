import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { userContext } from "~/server/auth/context.server";
import { prisma } from "~/server/database.server";
import { action as newSubjectAction } from "~/routes/admin/subjects.new";
import { action as editSubjectAction } from "~/routes/admin/subjects.$subjectId";
import { action as publishAction } from "~/routes/admin/publish";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

/** A guarded-route context as authMiddleware would build it, minus the session (no flash). */
async function contextFor(role: "USER" | "ADMIN") {
  const user = await prisma.user.create({
    data: { username: role.toLowerCase(), passwordHash: "x", role },
  });
  const context = new RouterContextProvider();
  context.set(userContext, user);
  return context;
}

function formRequest(url: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new Request(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

const subjectFields = {
  slug: "created",
  name: "Created",
  description: "",
  locale: "he",
  direction: "rtl",
  sortOrder: "1",
  accentColor: "#112233",
  icon: "globe",
};

describe("admin subject actions", () => {
  beforeEach(resetDb);

  it("refuses a plain user", async () => {
    const context = await contextFor("USER");
    const request = formRequest("http://x/admin/subjects/new", subjectFields);
    await expect(newSubjectAction({ request, context, params: {} } as never)).rejects.toMatchObject(
      { init: { status: 403 } },
    );
    expect(await prisma.subject.count()).toBe(0);
  });

  it("creates a hidden subject and redirects to its edit page", async () => {
    const context = await contextFor("ADMIN");
    const request = formRequest("http://x/admin/subjects/new", subjectFields);
    const response = (await newSubjectAction({
      request,
      context,
      params: {},
    } as never)) as Response;
    const created = await prisma.subject.findUniqueOrThrow({ where: { slug: "created" } });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`/admin/subjects/${created.id}`);
    expect(created.isActive).toBe(false);
  });

  it("returns field errors for invalid input and a taken slug", async () => {
    const context = await contextFor("ADMIN");
    const invalid = await newSubjectAction({
      request: formRequest("http://x/admin/subjects/new", { ...subjectFields, slug: "Bad Slug!" }),
      context,
      params: {},
    } as never);
    expect(invalid).toMatchObject({
      init: { status: 400 },
      data: { fieldErrors: { slug: "admin.error.slug" } },
    });

    await prisma.subject.create({
      data: { slug: "created", name: "Existing", locale: "he", direction: "rtl" },
    });
    const taken = await newSubjectAction({
      request: formRequest("http://x/admin/subjects/new", subjectFields),
      context,
      params: {},
    } as never);
    expect(taken).toMatchObject({
      init: { status: 409 },
      data: { fieldErrors: { slug: "admin.error.slugTaken" } },
    });
  });

  it("dispatches structure intents on the edit page", async () => {
    const context = await contextFor("ADMIN");
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    const url = `http://x/admin/subjects/${subject.id}`;
    const params = { subjectId: String(subject.id) };

    await editSubjectAction({
      request: formRequest(url, { intent: "create-section", title: "Added" }),
      context,
      params,
    } as never);
    expect(await prisma.section.count({ where: { subjectId: subject.id } })).toBe(2);

    const second = lessonIds[0]?.[1];
    if (!second) throw new Error("fixture");
    await editSubjectAction({
      request: formRequest(url, { intent: "move-lesson-up", lessonId: String(second) }),
      context,
      params,
    } as never);
    const moved = await prisma.lesson.findUniqueOrThrow({ where: { id: second } });
    expect(moved.sortOrder).toBe(1);

    const emptySection = await editSubjectAction({
      request: formRequest(url, { intent: "create-section", title: "   " }),
      context,
      params,
    } as never);
    expect(emptySection).toMatchObject({
      init: { status: 400 },
      data: { intent: "create-section", fieldErrors: { title: "admin.error.title" } },
    });

    const firstLesson = lessonIds[0]?.[0];
    if (!firstLesson) throw new Error("fixture");
    const badScore = await editSubjectAction({
      request: formRequest(url, {
        intent: "update-lesson",
        lessonId: String(firstLesson),
        title: "Fine",
        passingScore: "250",
      }),
      context,
      params,
    } as never);
    expect(badScore).toMatchObject({
      init: { status: 400 },
      data: {
        intent: "update-lesson",
        lessonId: firstLesson,
        fieldErrors: { passingScore: "admin.error.passingScore" },
      },
    });

    await expect(
      editSubjectAction({
        request: formRequest(url, { intent: "nonsense" }),
        context,
        params,
      } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });

    const deleted = (await editSubjectAction({
      request: formRequest(url, { intent: "delete-subject" }),
      context,
      params,
    } as never)) as Response;
    expect(deleted.headers.get("Location")).toBe("/admin");
    expect(await prisma.subject.count()).toBe(0);
  });
});

describe("admin publish action", () => {
  beforeEach(resetDb);

  it("publishes every checked subject and redirects to the list", async () => {
    const context = await contextFor("ADMIN");
    const { subject: first } = await makeSubjectWithLessons([1], null, false);
    const { subject: second } = await makeSubjectWithLessons([1], null, false);
    const { subject: third } = await makeSubjectWithLessons([1], null, false);

    const body = new URLSearchParams();
    body.append("subjectId", String(first.id));
    body.append("subjectId", String(second.id));
    const request = new Request("http://x/admin/publish", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const response = await publishAction({ request, context, params: {} } as never);
    expect(response.headers.get("Location")).toBe("/admin");

    const active = await prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    expect(active.map((row) => row.id).sort()).toEqual([first.id, second.id].sort());
    expect((await prisma.subject.findUniqueOrThrow({ where: { id: third.id } })).isActive).toBe(
      false,
    );
  });

  it("rejects an empty selection", async () => {
    const context = await contextFor("ADMIN");
    await expect(
      publishAction({
        request: formRequest("http://x/admin/publish", {}),
        context,
        params: {},
      } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });
});
