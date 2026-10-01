import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/lib/auth/register.server";
import { RegisterSchema } from "~/lib/auth/validation";
import { prisma } from "~/lib/database.server";
import { resetDb } from "../helpers/db";

describe("RegisterSchema", () => {
  it("accepts a valid input and strips empty email", () => {
    const r = RegisterSchema.safeParse({ username: "ab.c_1", password: "12345678", email: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeUndefined();
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
    const r = await registerUser({ username: "alice", password: "password1" });
    expect(r.ok).toBe(true);
    const u = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
    expect(u.role).toBe("USER");
    expect(u.passwordHash).not.toBe("password1");
    expect(u.email).toBeNull();
  });

  it("fails generically on duplicate username or email", async () => {
    await registerUser({ username: "alice", password: "password1", email: "a@x.io" });
    expect((await registerUser({ username: "alice", password: "password2" })).ok).toBe(false);
    expect(
      (await registerUser({ username: "bob", password: "password2", email: "a@x.io" })).ok,
    ).toBe(false);
  });
});
