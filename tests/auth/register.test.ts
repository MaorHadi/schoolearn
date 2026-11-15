import { beforeEach, describe, expect, it } from "vitest";
import { loader as registerLoader } from "~/routes/public/register";
import { register, registerUser } from "~/server/auth/register.server";
import { RegisterSchema } from "~/schemas/auth";
import { prisma } from "~/server/database.server";
import { getSystemSettings, updateSystemSettings } from "~/server/settings/settings.server";
import { resetDb } from "../helpers/db";

describe("RegisterSchema", () => {
  it("accepts a valid input and strips empty email", () => {
    const result = RegisterSchema.safeParse({
      username: "ab.c_1",
      password: "12345678",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeUndefined();
  });

  it("rejects short username, bad chars, short password, bad email", () => {
    expect(RegisterSchema.safeParse({ username: "ab", password: "12345678" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ username: "a b", password: "12345678" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ username: "abc", password: "1234567" }).success).toBe(false);
    expect(
      RegisterSchema.safeParse({ username: "abc", password: "12345678", email: "nope" }).success,
    ).toBe(false);
  });
});

describe("registerUser", () => {
  beforeEach(resetDb);

  it("creates a USER with a hashed password", async () => {
    const result = await registerUser({ username: "alice", password: "password1" });
    expect(result.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
    expect(user.role).toBe("USER");
    expect(user.passwordHash).not.toBe("password1");
    expect(user.email).toBeNull();
  });

  it("refuses everyone while registration is closed, without creating a user or a log row", async () => {
    const admin = await prisma.user.create({
      data: { username: "root", passwordHash: "x", role: "SYSTEM_ADMIN" },
    });
    const settings = await getSystemSettings();
    await updateSystemSettings({ ...settings, registrationOpen: false }, admin.id);

    expect(await register({ username: "alice", password: "password1" }, "203.0.113.9")).toEqual({
      ok: false,
      reason: "REGISTRATION_CLOSED",
    });
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.authLog.count()).toBe(0);
    expect((await registerLoader()).registrationOpen).toBe(false);

    await updateSystemSettings({ ...settings, registrationOpen: true }, admin.id);
    expect((await register({ username: "alice", password: "password1" }, "203.0.113.9")).ok).toBe(
      true,
    );
  });

  it("fails generically on duplicate username or email", async () => {
    await registerUser({ username: "alice", password: "password1", email: "a@x.io" });
    expect((await registerUser({ username: "alice", password: "password2" })).ok).toBe(false);
    expect(
      (await registerUser({ username: "bob", password: "password2", email: "a@x.io" })).ok,
    ).toBe(false);
  });
});
