// Shared (client-safe).

const DEFAULT_TARGET = "/subjects";

/**
 * Resolve a user-supplied redirect target to a same-origin path, or fall back.
 *
 * Browsers treat `\` as `/` in http(s) URLs, so "/\evil.com" would leave the site even though
 * it starts with "/". Rather than pattern-matching strings, parse the target against the current
 * request URL and keep it only if the origin is unchanged; reject any backslash outright.
 */
export function safeRedirect(target: string | null | undefined, currentUrl: string): string {
  if (!target) return DEFAULT_TARGET;
  if (target.includes("\\") || /%5c/i.test(target)) return DEFAULT_TARGET;
  if (!target.startsWith("/") || target.startsWith("//")) return DEFAULT_TARGET;

  let resolved: URL;
  try {
    resolved = new URL(target, currentUrl);
  } catch {
    return DEFAULT_TARGET;
  }
  if (resolved.origin !== new URL(currentUrl).origin) return DEFAULT_TARGET;
  return resolved.pathname + resolved.search;
}
