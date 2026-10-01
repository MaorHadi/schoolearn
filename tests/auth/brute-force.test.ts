import { beforeEach, describe, expect, it } from "vitest";
import { security } from "~/config/security.server";
import { UNKNOWN_IP } from "~/lib/auth/client-ip.server";
import { login } from "~/lib/auth/login.server";
import { registerUser } from "~/lib/auth/register.server";
import { prisma } from "~/lib/database.server";
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
    expect(logs.map((l) => [l.isSuccessful, l.failureReason])).toEqual([
      [false, "BAD_PASSWORD"],
      [true, null],
    ]);
    expect(logs.every((l) => l.ipAddress === "10.0.0.1" && l.username === "alice")).toBe(true);
  });

  it("locks the username after N failures even with the right password", async () => {
    for (let i = 0; i < security.usernameMaxFailures; i++) {
      await login({ username: "alice", password: "bad" }, `10.0.0.${i}`);
    }
    const r = await login({ username: "alice", password: "password1" }, "10.0.0.99");
    expect(r).toEqual({ ok: false, reason: "USERNAME_LOCKED" });
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("USERNAME_LOCKED");
  });

  it("does not lock other usernames", async () => {
    await registerUser({ username: "bob", password: "password1" });
    for (let i = 0; i < security.usernameMaxFailures; i++) {
      await login({ username: "alice", password: "bad" }, `10.0.0.${i}`);
    }
    expect((await login({ username: "bob", password: "password1" }, "10.0.0.99")).ok).toBe(true);
  });

  it("blocks the IP after M failures across many usernames and reports IP_BLOCKED next", async () => {
    for (let i = 0; i < security.ipMaxFailures; i++) {
      await login({ username: `ghost${i}`, password: "bad" }, "10.9.9.9");
    }
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "10.9.9.9" } })).not.toBeNull();
    const r = await login({ username: "alice", password: "password1" }, "10.9.9.9");
    expect(r).toEqual({ ok: false, reason: "IP_BLOCKED" });
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("IP_BLOCKED");
  });

  it("M is strictly greater than N (shared school IP)", () => {
    expect(security.ipMaxFailures).toBeGreaterThan(security.usernameMaxFailures);
  });

  it("never creates an IpBlock for the unknown IP but still logs attempts", async () => {
    const attempts = security.ipMaxFailures + 2;
    for (let i = 0; i < attempts; i++) {
      await login({ username: `ghost${i}`, password: "bad" }, UNKNOWN_IP);
    }
    expect(await prisma.ipBlock.count()).toBe(0);
    expect(await prisma.authLog.count({ where: { ipAddress: UNKNOWN_IP } })).toBe(attempts);
    expect((await login({ username: "alice", password: "password1" }, UNKNOWN_IP)).ok).toBe(true);
  });
});
