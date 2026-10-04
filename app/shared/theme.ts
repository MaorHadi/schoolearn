// Shared (client-safe). Color theme preference.

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Parse a stored/posted theme value. Anything else means "follow the system". */
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
