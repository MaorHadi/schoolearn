import { describe, expect, it } from "vitest";
import { parseEnv } from "~/config/env.server";

const base = { DATABASE_URL: "mysql://x", SESSION_SECRET: "s".repeat(16) };

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(base);
    expect(env.AUTH_IP_MAX_FAILURES).toBe(20);
    expect(env.AUTH_USERNAME_MAX_FAILURES).toBe(5);
    expect(env.SESSION_EXPIRY_HOURS).toBe(720);
    expect(env.DEFAULT_LESSON_PASSING_SCORE).toBe(60);
    expect(env.TRUSTED_PROXY_COUNT).toBe(0);
    expect(env.STORAGE_PROVIDER).toBe("local");
  });

  it("rejects IP max not greater than username max", () => {
    expect(() =>
      parseEnv({ ...base, AUTH_IP_MAX_FAILURES: "5", AUTH_USERNAME_MAX_FAILURES: "5" }),
    ).toThrow(/AUTH_IP_MAX_FAILURES/);
  });

  it("rejects missing SESSION_SECRET", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow();
  });

  it("coerces numeric strings", () => {
    expect(parseEnv({ ...base, SESSION_EXPIRY_HOURS: "24" }).SESSION_EXPIRY_HOURS).toBe(24);
  });

  it("treats empty strings as unset so defaults apply", () => {
    expect(
      parseEnv({ ...base, SEED_ADMIN_EMAIL: "", TRUSTED_PROXY_COUNT: "" }).TRUSTED_PROXY_COUNT,
    ).toBe(0);
  });
});
