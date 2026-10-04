import { redirect } from "react-router";
import type { Route } from "./+types/theme";
import { serializeTheme } from "~/server/theme.server";
import { safeRedirect } from "~/shared/safe-redirect";
import { parseTheme } from "~/shared/theme";

/**
 * POST theme=light|dark (anything else clears the preference). Public, no session needed.
 * With a `redirectTo` field (plain form) it redirects; without one (fetcher) it just sets the cookie.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const theme = parseTheme(form.get("theme"));
  const headers = { "Set-Cookie": await serializeTheme(theme) };

  const redirectTo = form.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.length > 0) {
    return redirect(safeRedirect(redirectTo, request.url), { headers });
  }
  return new Response(null, { status: 204, headers });
}

export function loader() {
  return redirect("/");
}
