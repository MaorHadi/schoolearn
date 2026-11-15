import { RouterContextProvider } from "react-router";
import { userContext } from "~/server/auth/context.server";
import { prisma } from "~/server/database.server";

type Role = "USER" | "ADMIN" | "SYSTEM_ADMIN";

/**
 * A guarded-route context as authMiddleware would build it for a new user with this role,
 * minus the session (so nothing is flashed).
 */
export async function contextFor(role: Role, username = role.toLowerCase()) {
  const user = await prisma.user.create({ data: { username, passwordHash: "x", role } });
  const context = new RouterContextProvider();
  context.set(userContext, user);
  return { context, user };
}

/** A form POST as the browser would send it. */
export function formRequest(url: string, fields: Record<string, string>) {
  return new Request(url, {
    method: "POST",
    body: new URLSearchParams(fields),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
