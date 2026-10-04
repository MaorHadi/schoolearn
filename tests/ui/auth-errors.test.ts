import { describe, expect, it } from "vitest";
import { RegisterSchema } from "~/schemas/auth";
import { registerFieldErrors } from "~/shared/auth-errors";

function errorsFor(input: Record<string, string>) {
  const parsed = RegisterSchema.safeParse(input);
  if (parsed.success) throw new Error("expected validation to fail");
  return registerFieldErrors(parsed.error);
}

describe("registerFieldErrors", () => {
  it("maps each invalid field to its own message key", () => {
    expect(errorsFor({ username: "a b", password: "short", email: "nope" })).toEqual({
      username: "auth.error.username",
      password: "auth.error.password",
      email: "auth.error.email",
    });
  });

  it("reports only the fields that failed", () => {
    expect(errorsFor({ username: "valid_name", password: "short" })).toEqual({
      password: "auth.error.password",
    });
  });
});
