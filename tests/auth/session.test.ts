import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "~/server/database.server";
import { hashPassword } from "~/server/auth/password.server";
import {
  createSession,
  destroySession,
  getSessionFromRequest,
  touchSession,
} from "~/server/auth/session.server";
import { requestWithCookie, resetDb } from "../helpers/db";

async function makeUser(overrides: Partial<{ isDisabled: boolean }> = {}) {
  return prisma.user.create({
    data: {
      username: "u" + Math.random().toString(36).slice(2, 8),
      passwordHash: await hashPassword("pw"),
      ...overrides,
    },
  });
}

describe("sessions", () => {
  beforeEach(resetDb);

  it("creates a row and a signed httpOnly cookie, then loads it", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, "1.2.3.4");
    expect(cookie).toMatch(/^__session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const loaded = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    expect(loaded?.id).toBe(id);
    expect(loaded?.user.id).toBe(user.id);
    expect(loaded?.ip).toBe("1.2.3.4");
  });

  it("returns null for a tampered cookie", async () => {
    const user = await makeUser();
    const { cookie } = await createSession(user.id, null);
    const tampered = cookie.replace(/__session=([^;]+)/, "__session=$1x");
    expect(await getSessionFromRequest(requestWithCookie("http://x/", tampered))).toBeNull();
  });

  it("returns null when there is no cookie", async () => {
    expect(await getSessionFromRequest(new Request("http://x/"))).toBeNull();
  });

  it("rejects an expired session and deletes the row", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    await prisma.session.update({
      where: { id },
      data: { expirationDate: new Date(Date.now() - 1000) },
    });
    expect(await getSessionFromRequest(requestWithCookie("http://x/", cookie))).toBeNull();
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });

  it("rejects a disabled user and deletes the row", async () => {
    const user = await makeUser({ isDisabled: true });
    const { id, cookie } = await createSession(user.id, null);
    expect(await getSessionFromRequest(requestWithCookie("http://x/", cookie))).toBeNull();
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });

  it("touch extends expiry only after the throttle interval", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    const s1 = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    if (!s1) throw new Error("session not loaded");

    // Fresh session: lastActivity was just set, so touch is a no-op.
    await touchSession(s1);
    const afterNoop = await prisma.session.findUniqueOrThrow({ where: { id } });
    expect(afterNoop.expirationDate.getTime()).toBe(s1.expirationDate.getTime());

    // Age lastActivity beyond the interval.
    await prisma.session.update({
      where: { id },
      data: { lastActivity: new Date(Date.now() - 10 * 60_000) },
    });
    const s2 = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    if (!s2) throw new Error("session not loaded");
    await touchSession(s2);
    const afterTouch = await prisma.session.findUniqueOrThrow({ where: { id } });
    expect(afterTouch.expirationDate.getTime()).toBeGreaterThan(s1.expirationDate.getTime());
    expect(afterTouch.lastActivity!.getTime()).toBeGreaterThan(s2.lastActivity!.getTime());
  });

  it("destroy deletes the row and returns a clearing cookie", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    const clearing = await destroySession(requestWithCookie("http://x/", cookie));
    expect(clearing).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });
});
