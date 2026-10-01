import { describe, expect, it } from "vitest";
import { isPublicPath } from "~/config/public-routes";

describe("isPublicPath", () => {
  it("allows login/register/logout (and their .data variants), assets, favicon, dev/build files", () => {
    for (const p of [
      "/login",
      "/register",
      "/logout",
      "/login.data",
      "/register.data",
      "/assets/abc.png",
      "/assets/2026/x.webp",
      "/favicon.ico",
      "/@vite/client",
      "/@fs/C:/x",
      "/app/root.tsx",
      "/node_modules/.vite/deps/react.js",
      "/__manifest",
    ]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it("denies everything else", () => {
    for (const p of [
      "/",
      "/subjects",
      "/subjects.data",
      "/admin",
      "/system-admin",
      "/system-admin/users",
      "/loginx",
      "/login/extra",
    ]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
