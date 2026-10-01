import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/server/auth/register.server";
import { RegisterSchema } from "~/schemas/auth";
import { prisma } from "~/server/database.server";
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

  it("fails generically on duplicate username or email", async () => {
    await registerUser({ username: "alice", password: "password1", email: "a@x.io" });
    expect((await registerUser({ username: "alice", password: "password2" })).ok).toBe(false);
    expect(
      (await registerUser({ username: "bob", password: "password2", email: "a@x.io" })).ok,
    ).toBe(false);
  });
});
