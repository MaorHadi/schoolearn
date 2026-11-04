import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "~/server/database.server";
import { createSession, getSessionFromRequest } from "~/server/auth/session.server";
import { setFlash, takeFlash } from "~/server/flash.server";
import { requestWithCookie, resetDb } from "../helpers/db";

async function sessionFor(username: string) {
  const user = await prisma.user.create({ data: { username, passwordHash: "x" } });
  const { cookie } = await createSession(user.id, null);
  const session = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
  if (!session) throw new Error("session expected");
  return session;
}

describe("flash toasts", () => {
  beforeEach(resetDb);

  it("returns null when nothing is pending and does not write", async () => {
    const session = await sessionFor("alice");
    expect(await takeFlash(session)).toBeNull();
  });

  it("set then take returns the toast once, with values, and clears it", async () => {
    const session = await sessionFor("alice");
    await setFlash(session.id, "success", "toast.enrolled", { subject: "Demo" });

    const reloaded = await getSessionFromRequest(
      requestWithCookie("http://x/", `__session=${encodeURIComponent("")}`),
    );
    expect(reloaded).toBeNull(); // sanity: a bogus cookie never resolves to a session

    const fresh = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { user: true },
    });
    const toast = await takeFlash(fresh);
    expect(toast).toMatchObject({
      kind: "success",
      key: "toast.enrolled",
      values: { subject: "Demo" },
    });
    expect(toast?.id).toBeTruthy();

    const again = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { user: true },
    });
    expect(await takeFlash(again)).toBeNull();
    expect(again.sessionData).toEqual({});
  });

  it("keeps other session data intact", async () => {
    const session = await sessionFor("alice");
    await prisma.session.update({
      where: { id: session.id },
      data: { sessionData: { keep: "me" } },
    });
    await setFlash(session.id, "info", "toast.welcomeBack", { username: "alice" });
    const withFlash = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { user: true },
    });
    expect(await takeFlash(withFlash)).toMatchObject({ key: "toast.welcomeBack" });
    const after = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(after.sessionData).toEqual({ keep: "me" });
  });

  it("ignores a malformed stored flash but still clears it", async () => {
    const session = await sessionFor("alice");
    await prisma.session.update({
      where: { id: session.id },
      data: { sessionData: { flash: { nonsense: true } } },
    });
    const broken = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { user: true },
    });
    expect(await takeFlash(broken)).toBeNull();
    const after = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(after.sessionData).toEqual({});
  });
});
