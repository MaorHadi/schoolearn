import { describe, expect, it } from "vitest";
import { DateRangeQuerySchema } from "~/schemas/date-range";
import { resolveDateRange } from "~/shared/date-range";

describe("DateRangeQuerySchema", () => {
  it("accepts empty, partial and ordered pairs and rejects reversed or malformed ones", () => {
    expect(DateRangeQuerySchema.parse({})).toEqual({});
    expect(DateRangeQuerySchema.parse({ from: "", to: "2026-11-05" })).toEqual({
      to: "2026-11-05",
    });
    expect(DateRangeQuerySchema.parse({ from: "2026-11-01", to: "2026-11-05" })).toEqual({
      from: "2026-11-01",
      to: "2026-11-05",
    });
    expect(DateRangeQuerySchema.safeParse({ from: "2026-11-06", to: "2026-11-05" }).success).toBe(
      false,
    );
    expect(DateRangeQuerySchema.safeParse({ from: "05/11/2026" }).success).toBe(false);
    expect(DateRangeQuerySchema.safeParse({ from: "2026-13-45" }).success).toBe(false);
  });
});

describe("resolveDateRange", () => {
  const now = new Date("2026-11-05T10:00:00Z");

  it("defaults to the last N days up to now", () => {
    const resolved = resolveDateRange({}, 7, now);
    expect(resolved.since.toISOString()).toBe("2026-10-29T10:00:00.000Z");
    expect(resolved.until).toBe(now);
    expect(resolved).toMatchObject({ from: "2026-10-29", to: "2026-11-05" });
  });

  it("uses whole UTC days for explicit bounds, with `to` inclusive", () => {
    const resolved = resolveDateRange({ from: "2026-11-01", to: "2026-11-03" }, 7, now);
    expect(resolved.since.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(resolved.until.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(resolved).toMatchObject({ from: "2026-11-01", to: "2026-11-04" });
  });
});
