import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { userContext } from "~/server/auth/context.server";
import { prisma } from "~/server/database.server";
import { env } from "~/server/env.server";
import { action as lessonAction, MULTIPART_OVERHEAD_BYTES } from "~/routes/admin/lessons.$lessonId";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

async function adminContext() {
  const user = await prisma.user.create({
    data: { username: "admin", passwordHash: "x", role: "ADMIN" },
  });
  const context = new RouterContextProvider();
  context.set(userContext, user);
  return context;
}

function draftRequest(url: string, blocks: unknown) {
  const body = new URLSearchParams({ intent: "save-draft", blocks: JSON.stringify(blocks) });
  return new Request(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

describe("lesson editor action", () => {
  beforeEach(resetDb);

  async function fixture() {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    return {
      lessonId,
      url: `http://x/admin/lessons/${lessonId}`,
      params: { lessonId: String(lessonId) },
      context: await adminContext(),
    };
  }

  it("answers invalid blocks and unknown assets with a form error instead of throwing", async () => {
    const { url, params, context } = await fixture();
    const invalid = await lessonAction({
      request: draftRequest(url, [{ id: "x", type: "video" }]),
      context,
      params,
    } as never);
    expect(invalid).toMatchObject({
      init: { status: 400 },
      data: { formError: "admin.error.blocks" },
    });

    const unknownAsset = await lessonAction({
      request: draftRequest(url, [{ id: "i", type: "image", assetId: 424_242, alt: "x" }]),
      context,
      params,
    } as never);
    expect(unknownAsset).toMatchObject({
      init: { status: 400 },
      data: { formError: "admin.error.unknownAsset" },
    });
  });

  it("stores a valid draft", async () => {
    const { lessonId, url, params, context } = await fixture();
    const blocks = [{ id: "h", type: "heading", level: 1, text: "Draft" }];
    const result = await lessonAction({
      request: draftRequest(url, blocks),
      context,
      params,
    } as never);
    expect(result).toBeNull();
    const row = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(row.draftContent).toEqual(blocks);
  });

  it("rejects an upload whose declared size is over the limit before reading the body", async () => {
    const { url, params, context } = await fixture();
    const request = new Request(url, {
      method: "POST",
      body: "tiny",
      headers: {
        "Content-Type": "multipart/form-data; boundary=x",
        "Content-Length": String(env.UPLOAD_MAX_BYTES + MULTIPART_OVERHEAD_BYTES + 1),
      },
    });
    const result = await lessonAction({ request, context, params } as never);
    expect(result).toMatchObject({
      init: { status: 413 },
      data: { ok: false, reason: "TOO_LARGE", blockId: "" },
    });
    expect(await prisma.asset.count()).toBe(0);
  });
});
