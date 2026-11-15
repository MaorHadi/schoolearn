import { createCookie } from "react-router";
import { parseTheme, type Theme } from "~/shared/theme";

/** Unsigned preference cookie; a tampered value just falls back to "system". */
const themeCookie = createCookie("theme", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
});

export async function getTheme(request: Request): Promise<Theme | null> {
  const raw: unknown = await themeCookie.parse(request.headers.get("Cookie"));
  return parseTheme(raw);
}

export function serializeTheme(theme: Theme | null): Promise<string> {
  return theme ? themeCookie.serialize(theme) : themeCookie.serialize("", { maxAge: 0 });
}
