import { describe, expect, it } from "vitest";
import { hasRole } from "~/lib/auth/roles";

describe("hasRole", () => {
  it("is hierarchical: SYSTEM_ADMIN > ADMIN > USER", () => {
    expect(hasRole("USER", "USER")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
    expect(hasRole("USER", "SYSTEM_ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "SYSTEM_ADMIN")).toBe(false);
    expect(hasRole("SYSTEM_ADMIN", "USER")).toBe(true);
    expect(hasRole("SYSTEM_ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("SYSTEM_ADMIN", "SYSTEM_ADMIN")).toBe(true);
  });
});
