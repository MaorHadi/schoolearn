import { beforeEach, describe, expect, it } from "vitest";
import { authenticate } from "~/server/auth/login.server";
import { registerUser } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("authenticate", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ username: "alice", password: "password1" });
  });

  it("succeeds with correct credentials", async () => {
    const result = await authenticate({ username: "alice", password: "password1" });
    expect(result.ok).toBe(true);
  });

  it("reports BAD_PASSWORD, USER_NOT_FOUND, USER_DISABLED", async () => {
    expect(await authenticate({ username: "alice", password: "nope" })).toEqual({
      ok: false,
      reason: "BAD_PASSWORD",
    });
    expect(await authenticate({ username: "ghost", password: "nope" })).toEqual({
      ok: false,
      reason: "USER_NOT_FOUND",
    });
    await prisma.user.update({ where: { username: "alice" }, data: { isDisabled: true } });
    expect(await authenticate({ username: "alice", password: "password1" })).toEqual({
      ok: false,
      reason: "USER_DISABLED",
    });
  });
});
