import { data, redirect, type MiddlewareFunction } from "react-router";
import { isPublicPath } from "~/config/public-routes";
import { t } from "~/i18n";
import { getClientIp } from "~/server/auth/client-ip.server";
import { clientIpContext, sessionContext, userContext } from "~/server/auth/context.server";
import { findActiveIpBlock } from "~/server/auth/ip-block.server";
import {
  getSessionFromRequest,
  refreshSessionCookie,
  sessionCookie,
  touchSession,
} from "~/server/auth/session.server";

/**
 * The single route guard, registered on root.tsx so it runs for every request.
 *
 * Order: resolve client IP → reject blocked IPs (even on public paths) → let public paths
 * through → require a valid session for everything else → touch sliding expiry → expose
 * user/session via context.
 */
export const authMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const ip = getClientIp(request);
  context.set(clientIpContext, ip);

  if (await findActiveIpBlock(ip)) {
    throw data(t("error.ipBlocked"), { status: 403 });
  }

  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) return next();

  const session = await getSessionFromRequest(request);
  if (!session) {
    const redirectTo = url.pathname + url.search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, {
      headers: { "Set-Cookie": await sessionCookie.serialize("", { maxAge: 0 }) },
    });
  }

  const extended = await touchSession(session);
  context.set(sessionContext, session);
  context.set(userContext, session.user);

  const response = await next();
  if (extended) {
    // Slide the browser cookie's Max-Age along with the server-side expiry.
    response.headers.append("Set-Cookie", await refreshSessionCookie(session.id));
  }
  return response;
};
