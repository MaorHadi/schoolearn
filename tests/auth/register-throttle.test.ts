import { beforeEach, describe, expect, it } from "vitest";
import { security } from "~/server/security.server";
import { UNKNOWN_IP } from "~/server/auth/client-ip.server";
import { register } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

const password = "password1";

describe("register with per-IP throttle", () => {
  beforeEach(resetDb);

  it("logs every registration attempt with type register", async () => {
    await register({ username: "alice", password }, "10.0.0.1");
    await register({ username: "alice", password }, "10.0.0.1"); // duplicate -> failure
    const logs = await prisma.authLog.findMany({ orderBy: { id: "asc" } });
    expect(logs.map((log) => [log.type, log.isSuccessful, log.username])).toEqual([
      ["register", true, "alice"],
      ["register", false, "alice"],
    ]);
  });

  it("refuses further registrations from one IP after the limit within the window", async () => {
    for (let attempt = 0; attempt < security.registerMaxPerIp; attempt++) {
      expect((await register({ username: `user${attempt}`, password }, "10.0.0.1")).ok).toBe(true);
    }
    const refused = await register({ username: "one-too-many", password }, "10.0.0.1");
    expect(refused.ok).toBe(false);
    expect(await prisma.user.findUnique({ where: { username: "one-too-many" } })).toBeNull();
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("REGISTER_THROTTLED");
  });

  it("does not affect other IPs and never throttles the unknown IP", async () => {
    for (let attempt = 0; attempt < security.registerMaxPerIp; attempt++) {
      await register({ username: `user${attempt}`, password }, "10.0.0.1");
    }
    expect((await register({ username: "other-ip", password }, "10.0.0.2")).ok).toBe(true);

    for (let attempt = 0; attempt < security.registerMaxPerIp + 3; attempt++) {
      expect((await register({ username: `anon${attempt}`, password }, UNKNOWN_IP)).ok).toBe(true);
    }
  });

  it("attempts outside the window do not count", async () => {
    for (let attempt = 0; attempt < security.registerMaxPerIp; attempt++) {
      await register({ username: `user${attempt}`, password }, "10.0.0.1");
    }
    await prisma.authLog.updateMany({
      data: { createdAt: new Date(Date.now() - security.registerWindowMs - 60_000) },
    });
    expect((await register({ username: "later", password }, "10.0.0.1")).ok).toBe(true);
  });

  it("registration attempts do not count toward login lockout", async () => {
    for (let attempt = 0; attempt < security.registerMaxPerIp + 2; attempt++) {
      await register({ username: "alice", password }, "10.0.0.1"); // 1 success, rest failures
    }
    const { login } = await import("~/server/auth/login.server");
    expect((await login({ username: "alice", password }, "10.0.0.1")).ok).toBe(true);
  });
});
