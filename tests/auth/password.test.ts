import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "~/server/auth/password.server";

describe("password", () => {
  it("round-trips", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("dummy hash verifies nothing but does not throw", async () => {
    expect(DUMMY_HASH.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(DUMMY_HASH, "anything")).toBe(false);
  });

  it("returns false on malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});
