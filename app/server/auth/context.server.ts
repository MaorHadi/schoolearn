import { createContext, data, type RouterContextProvider } from "react-router";
import { t } from "~/i18n";
import { hasRole, type Role } from "~/shared/roles";
import { UNKNOWN_IP } from "./client-ip.server";
import type { SessionUser, SessionWithUser } from "./session.server";

/** Populated by authMiddleware for every guarded request. */
export const userContext = createContext<SessionUser | null>(null);
export const sessionContext = createContext<SessionWithUser | null>(null);
export const clientIpContext = createContext<string>(UNKNOWN_IP);

/** Use in loaders/actions of guarded routes. Throws 403 if no user (should not happen past the guard). */
export function requireUser(context: Readonly<RouterContextProvider>): SessionUser {
  const user = context.get(userContext);
  if (!user) throw data(t("error.forbidden"), { status: 403 });
  return user;
}

/** ADMIN can edit content; SYSTEM_ADMIN can do everything ADMIN can plus manage users/settings. */
export function requireRole(context: Readonly<RouterContextProvider>, min: Role): SessionUser {
  const user = requireUser(context);
  if (!hasRole(user.role, min)) throw data(t("error.forbidden"), { status: 403 });
  return user;
}
