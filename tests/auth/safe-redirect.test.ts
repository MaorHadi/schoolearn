import { describe, expect, it } from "vitest";
import { safeRedirect } from "~/shared/safe-redirect";

const currentUrl = "http://app.local/login";
const backslash = String.fromCharCode(92);

describe("safeRedirect", () => {
  it("accepts same-origin relative paths with query strings", () => {
    expect(safeRedirect("/subjects/abc?tab=1", currentUrl)).toBe("/subjects/abc?tab=1");
    expect(safeRedirect("/", currentUrl)).toBe("/");
  });

  it("falls back for missing, empty, external, or scheme-relative targets", () => {
    for (const target of [
      null,
      "",
      "https://evil.com",
      "//evil.com",
      "http://app.local.evil.com/x",
    ]) {
      expect(safeRedirect(target, currentUrl), String(target)).toBe("/subjects");
    }
  });

  it("rejects backslash tricks that browsers normalize to a different host", () => {
    for (const target of [
      `/${backslash}evil.com`,
      "/%5Cevil.com",
      `${backslash}${backslash}evil.com`,
      `/${backslash}${backslash}evil.com/x`,
    ]) {
      expect(safeRedirect(target, currentUrl), target).toBe("/subjects");
    }
  });

  it("rejects javascript: and data: URLs", () => {
    expect(safeRedirect("javascript:alert(1)", currentUrl)).toBe("/subjects");
    expect(safeRedirect("data:text/html,x", currentUrl)).toBe("/subjects");
  });
});
