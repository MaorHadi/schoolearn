import { beforeEach, describe, expect, it } from "vitest";
import { security } from "~/server/security.server";
import { UNKNOWN_IP } from "~/server/auth/client-ip.server";
import { login } from "~/server/auth/login.server";
import { registerUser } from "~/server/auth/register.server";
import { clearUserLockout } from "~/server/users/user.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("login with brute-force protection", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ username: "alice", password: "password1" });
  });

  it("logs success and failure with reasons", async () => {
    await login({ username: "alice", password: "bad" }, "10.0.0.1");
    await login({ username: "alice", password: "password1" }, "10.0.0.1");
    const logs = await prisma.authLog.findMany({ orderBy: { id: "asc" } });
    expect(logs.map((log) => [log.isSuccessful, log.failureReason])).toEqual([
      [false, "BAD_PASSWORD"],
      [true, null],
    ]);
    expect(logs.every((log) => log.ipAddress === "10.0.0.1" && log.username === "alice")).toBe(
      true,
    );
  });

  it("locks the username after N failures even with the right password", async () => {
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "bad" }, `10.0.0.${attempt}`);
    }
    const result = await login({ username: "alice", password: "password1" }, "10.0.0.99");
    expect(result).toEqual({ ok: false, reason: "USERNAME_LOCKED" });
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("USERNAME_LOCKED");
  });

  it("does not lock other usernames", async () => {
    await registerUser({ username: "bob", password: "password1" });
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "bad" }, `10.0.0.${attempt}`);
    }
    expect((await login({ username: "bob", password: "password1" }, "10.0.0.99")).ok).toBe(true);
  });

  it("blocks the IP after M failures across many usernames and reports IP_BLOCKED next", async () => {
    for (let attempt = 0; attempt < security.ipMaxFailures; attempt++) {
      await login({ username: `ghost${attempt}`, password: "bad" }, "10.9.9.9");
    }
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "10.9.9.9" } })).not.toBeNull();
    const result = await login({ username: "alice", password: "password1" }, "10.9.9.9");
    expect(result).toEqual({ ok: false, reason: "IP_BLOCKED" });
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("IP_BLOCKED");
  });

  it("attempts made while the IP is blocked do not escalate or extend the block", async () => {
    for (let attempt = 0; attempt < security.ipMaxFailures; attempt++) {
      await login({ username: `ghost${attempt}`, password: "bad" }, "10.9.9.9");
    }
    const block = await prisma.ipBlock.findUniqueOrThrow({ where: { ipAddress: "10.9.9.9" } });
    expect(block.strikeCount).toBe(1);

    // Keep trying while blocked: logged as IP_BLOCKED, and the block stays exactly as it was.
    for (let attempt = 0; attempt < 3; attempt++) {
      await login({ username: "alice", password: "password1" }, "10.9.9.9");
    }
    const after = await prisma.ipBlock.findUniqueOrThrow({ where: { ipAddress: "10.9.9.9" } });
    expect(after.strikeCount).toBe(1);
    expect(after.expiresAt).toEqual(block.expiresAt);
  });

  it("attempts made while locked do not extend the lockout", async () => {
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "bad" }, "10.0.0.1");
    }
    // Keep hammering while locked: these are logged as USERNAME_LOCKED and must not count.
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "password1" }, "10.0.0.1");
    }
    // Age only the credential failures past the lockout; the LOCKED rows stay recent.
    await prisma.authLog.updateMany({
      where: { failureReason: "BAD_PASSWORD" },
      data: { createdAt: new Date(Date.now() - security.usernameLockoutMs - 60_000) },
    });
    expect((await login({ username: "alice", password: "password1" }, "10.0.0.1")).ok).toBe(true);
  });

  it("an admin clear lifts the lockout without deleting the audit rows", async () => {
    for (let attempt = 0; attempt < security.usernameMaxFailures; attempt++) {
      await login({ username: "alice", password: "bad" }, "10.0.0.1");
    }
    expect((await login({ username: "alice", password: "password1" }, "10.0.0.1")).ok).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
    expect(await clearUserLockout(user.id)).toBe(true);
    expect((await login({ username: "alice", password: "password1" }, "10.0.0.1")).ok).toBe(true);
    expect(await prisma.authLog.count({ where: { failureReason: "BAD_PASSWORD" } })).toBe(
      security.usernameMaxFailures,
    );
  });

  it("M is strictly greater than N (shared school IP)", () => {
    expect(security.ipMaxFailures).toBeGreaterThan(security.usernameMaxFailures);
  });

  it("never creates an IpBlock for the unknown IP but still logs attempts", async () => {
    const attempts = security.ipMaxFailures + 2;
    for (let attempt = 0; attempt < attempts; attempt++) {
      await login({ username: `ghost${attempt}`, password: "bad" }, UNKNOWN_IP);
    }
    expect(await prisma.ipBlock.count()).toBe(0);
    expect(await prisma.authLog.count({ where: { ipAddress: UNKNOWN_IP } })).toBe(attempts);
    expect((await login({ username: "alice", password: "password1" }, UNKNOWN_IP)).ok).toBe(true);
  });
});
