import { beforeEach, describe, expect, it } from "vitest";
import { login } from "~/server/auth/login.server";
import { registerUser } from "~/server/auth/register.server";
import { createSession } from "~/server/auth/session.server";
import { prisma } from "~/server/database.server";
import { security } from "~/server/security.server";
import {
  clearUserLockout,
  getUserForAdmin,
  listUsers,
  setUserDisabled,
  setUserRole,
  USERS_PAGE_SIZE,
} from "~/server/users/user.server";
import { resetDb } from "../helpers/db";

async function makeUser(username: string, role: "USER" | "ADMIN" | "SYSTEM_ADMIN" = "USER") {
  return prisma.user.create({
    data: { username, passwordHash: "x", role, email: `${username}@example.com` },
  });
}

describe("listUsers", () => {
  beforeEach(resetDb);

  it("searches username or email, pages newest first, and reports the total", async () => {
    for (let index = 0; index < USERS_PAGE_SIZE + 2; index++) {
      await makeUser(`user${String(index).padStart(3, "0")}`);
    }
    await prisma.user.create({ data: { username: "zed", passwordHash: "x", email: "a@b.io" } });

    const first = await listUsers({});
    expect(first.total).toBe(USERS_PAGE_SIZE + 3);
    expect(first.users).toHaveLength(USERS_PAGE_SIZE);
    expect(first.users[0]?.username).toBe("zed");
    const second = await listUsers({ page: 2 });
    expect(second.users).toHaveLength(3);

    expect((await listUsers({ query: "user00" })).users.map((user) => user.username)).toEqual(
      Array.from({ length: 10 }, (_entry, index) => `user00${9 - index}`),
    );
    expect((await listUsers({ query: "a@b" })).users.map((user) => user.username)).toEqual(["zed"]);
    expect((await listUsers({ page: 0 })).page).toBe(1);
  });
});

describe("role and disable changes", () => {
  beforeEach(resetDb);

  it("refuses self changes and removing the last system admin", async () => {
    const root = await makeUser("root", "SYSTEM_ADMIN");
    const other = await makeUser("other");

    expect(await setUserRole(root.id, root.id, "USER")).toEqual({ ok: false, reason: "SELF" });
    expect(await setUserDisabled(root.id, root.id, true)).toEqual({ ok: false, reason: "SELF" });
    expect(await setUserRole(other.id, root.id, "ADMIN")).toEqual({
      ok: false,
      reason: "LAST_SYSTEM_ADMIN",
    });
    expect(await setUserDisabled(other.id, root.id, true)).toEqual({
      ok: false,
      reason: "LAST_SYSTEM_ADMIN",
    });
    expect(await setUserRole(root.id, 999_999, "ADMIN")).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });

    const second = await makeUser("second", "SYSTEM_ADMIN");
    expect(await setUserRole(second.id, root.id, "ADMIN")).toEqual({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: root.id } })).role).toBe("ADMIN");
  });

  it("disabling ends the user's sessions; enabling keeps them out until they log in again", async () => {
    const root = await makeUser("root", "SYSTEM_ADMIN");
    const target = await makeUser("target");
    await createSession(target.id, "10.0.0.1");
    await createSession(target.id, "10.0.0.2");

    expect(await setUserDisabled(root.id, target.id, true)).toEqual({ ok: true });
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).isDisabled).toBe(
      true,
    );
    expect(await setUserDisabled(root.id, target.id, false)).toEqual({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).isDisabled).toBe(
      false,
    );
  });
});

describe("getUserForAdmin", () => {
  beforeEach(resetDb);

  it("reports lockout state, recent auth logs and active ip blocks, and clears the lockout", async () => {
    await registerUser({ username: "alice", password: "password1" });
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "bad" }, "10.0.0.1");
    }
    await prisma.ipBlock.create({
      data: { ipAddress: "10.0.0.1", strikeCount: 1, expiresAt: new Date(Date.now() + 60_000) },
    });
    const alice = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });

    const week = { since: new Date(Date.now() - 7 * 86_400_000), until: new Date() };
    const before = await getUserForAdmin(alice.id, week);
    expect(before?.lockout).toMatchObject({ locked: true, failures: security.usernameMaxFailures });
    expect(before?.lockout.until).toBeInstanceOf(Date);
    expect(before?.authLogs).toHaveLength(security.usernameMaxFailures);
    expect(before?.ipBlocks.map((block) => block.ipAddress)).toEqual(["10.0.0.1"]);

    expect(await clearUserLockout(alice.id)).toBe(true);
    const after = await getUserForAdmin(alice.id, week);
    expect(after?.lockout).toEqual({ locked: false, failures: 0, until: null });
    expect(await getUserForAdmin(999_999, week)).toBeNull();
    const yesterday = {
      since: new Date(Date.now() - 2 * 86_400_000),
      until: new Date(Date.now() - 86_400_000),
    };
    expect((await getUserForAdmin(alice.id, yesterday))?.authLogs).toEqual([]);
  });
});
