import { createContext, data, type RouterContextProvider } from "react-router";
import type { User } from "../../../prisma/generated/client/client";
import { t } from "~/i18n";
import { hasRole, type Role } from "~/shared/roles";
import type { SessionWithUser } from "./session.server";

/** Populated by authMiddleware for every guarded request. */
export const userContext = createContext<User | null>(null);
export const sessionContext = createContext<SessionWithUser | null>(null);
export const clientIpContext = createContext<string>("unknown");

/** Use in loaders/actions of guarded routes. Throws 403 if no user (should not happen past the guard). */
export function requireUser(context: Readonly<RouterContextProvider>): User {
  const user = context.get(userContext);
  if (!user) throw data(t("error.forbidden"), { status: 403 });
  return user;
}

/** ADMIN can edit content; SYSTEM_ADMIN can do everything ADMIN can plus manage users/settings. */
export function requireRole(context: Readonly<RouterContextProvider>, min: Role): User {
  const user = requireUser(context);
  if (!hasRole(user.role, min)) throw data(t("error.forbidden"), { status: 403 });
  return user;
}
