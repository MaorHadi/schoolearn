/**
 * Explicit allowlist of paths reachable without a session. Everything else is guarded
 * by app/server/auth/middleware.server.ts. Keep this list short and deliberate.
 */
const EXACT = new Set(["/login", "/register", "/logout", "/favicon.ico"]);

// Stored assets, plus Vite dev-server and build-asset paths.
const PREFIXES = [
  "/media/", // stored assets (user content)
  "/assets/", // Vite build output (hashed JS/CSS)
  "/@vite/",
  "/@fs/",
  "/@id/",
  "/@react-router/",
  "/app/",
  "/node_modules/",
  "/__manifest",
];

export function isPublicPath(pathname: string): boolean {
  // React Router fetches loader data for client navigations at `<path>.data`.
  const base = pathname.endsWith(".data") ? pathname.slice(0, -".data".length) : pathname;
  if (EXACT.has(base)) return true;
  return PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
