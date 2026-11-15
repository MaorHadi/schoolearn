// Shared (client-safe). Color theme preference.

export type Theme = "light" | "dark";

/** Parse a stored/posted theme value. Anything else means "follow the system". */
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
