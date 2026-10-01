import { describe, expect, it } from "vitest";
import { resolveDirection } from "~/shared/direction";

describe("resolveDirection", () => {
  it("uses the block override when present, else the subject direction", () => {
    expect(resolveDirection("rtl", undefined)).toBe("rtl");
    expect(resolveDirection("ltr", undefined)).toBe("ltr");
    expect(resolveDirection("rtl", "ltr")).toBe("ltr");
    expect(resolveDirection("ltr", "rtl")).toBe("rtl");
  });
});
