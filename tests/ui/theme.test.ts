import { describe, expect, it } from "vitest";
import { parseTheme } from "~/shared/theme";
import { getTheme, serializeTheme } from "~/server/theme.server";
import {
  DEFAULT_SUBJECT_THEME,
  resolveSubjectTheme,
  SubjectThemeSchema,
} from "~/shared/subject-theme";

describe("parseTheme", () => {
  it("accepts light/dark and treats anything else as system", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme("<script>")).toBeNull();
  });
});

describe("theme cookie", () => {
  it("round-trips a preference and clears it with an empty value", async () => {
    const setCookie = await serializeTheme("dark");
    expect(setCookie).toMatch(/^theme=/);
    const request = new Request("http://x/", {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(await getTheme(request)).toBe("dark");
    expect(await serializeTheme(null)).toMatch(/Max-Age=0/);
    expect(await getTheme(new Request("http://x/"))).toBeNull();
  });
});

describe("subject theme", () => {
  it("validates hex colors and known icon names", () => {
    expect(SubjectThemeSchema.safeParse({ accentColor: "#1D4ED8", icon: "scroll" }).success).toBe(
      true,
    );
    expect(SubjectThemeSchema.safeParse({ accentColor: "blue", icon: "scroll" }).success).toBe(
      false,
    );
    expect(SubjectThemeSchema.safeParse({ accentColor: "#1D4ED8", icon: "rocket" }).success).toBe(
      false,
    );
  });

  it("resolves bad stored values field by field to the defaults", () => {
    expect(resolveSubjectTheme({ accentColor: "nope", icon: "scroll" })).toEqual({
      accentColor: DEFAULT_SUBJECT_THEME.accentColor,
      icon: "scroll",
    });
    expect(resolveSubjectTheme({ accentColor: "#059669", icon: "unknown" })).toEqual({
      accentColor: "#059669",
      icon: DEFAULT_SUBJECT_THEME.icon,
    });
  });
});
