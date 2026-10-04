import { describe, expect, it } from "vitest";
import { isPublicPath } from "~/config/public-routes";

describe("isPublicPath", () => {
  it("allows login/register/logout (and their .data variants), assets, favicon, dev/build files", () => {
    for (const path of [
      "/login",
      "/register",
      "/logout",
      "/theme",
      "/login.data",
      "/register.data",
      "/media/abc.png",
      "/assets/app-abc123.js",
      "/favicon.ico",
      "/@vite/client",
      "/@fs/C:/x",
      "/app/root.tsx",
      "/node_modules/.vite/deps/react.js",
      "/__manifest",
    ]) {
      expect(isPublicPath(path), path).toBe(true);
    }
  });

  it("denies everything else", () => {
    for (const path of [
      "/",
      "/subjects",
      "/subjects.data",
      "/admin",
      "/system-admin",
      "/system-admin/users",
      "/loginx",
      "/login/extra",
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });
});
