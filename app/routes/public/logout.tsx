import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { destroySession } from "~/server/auth/session.server";

/** Logout is POST-only so a crafted link cannot log a user out. */
export async function action({ request }: Route.ActionArgs) {
  const cookie = await destroySession(request);
  return redirect("/login", { headers: { "Set-Cookie": cookie } });
}

export function loader() {
  return redirect("/login");
}
