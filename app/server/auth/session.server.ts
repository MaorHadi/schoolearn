import { createCookie } from "react-router";
import type { Session, User } from "../../../prisma/generated/client/client";
import { env } from "~/server/env.server";
import { prisma } from "~/server/database.server";

export type SessionWithUser = Session & { user: User };

const HOUR_MS = 60 * 60 * 1000;

/** Signed, httpOnly cookie that carries only the session id. */
export const sessionCookie = createCookie("__session", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: env.NODE_ENV === "production",
  secrets: [env.SESSION_SECRET],
  maxAge: env.SESSION_EXPIRY_HOURS * 60 * 60,
});

function expiryFromNow(): Date {
  return new Date(Date.now() + env.SESSION_EXPIRY_HOURS * HOUR_MS);
}

export async function createSession(userId: number, ip: string | null) {
  const session = await prisma.session.create({
    data: {
      userId,
      ip,
      expirationDate: expiryFromNow(),
      lastActivity: new Date(),
      sessionData: {},
    },
  });
  const cookie = await sessionCookie.serialize(session.id);
  return { id: session.id, cookie };
}

async function readSessionId(request: Request): Promise<string | null> {
  const raw: unknown = await sessionCookie.parse(request.headers.get("Cookie"));
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Load the session for a request. Returns null when the cookie is missing or tampered,
 * the row is gone, the session has expired, or the user is disabled. In the last two
 * cases the row is deleted.
 */
export async function getSessionFromRequest(request: Request): Promise<SessionWithUser | null> {
  const id = await readSessionId(request);
  if (!id) return null;

  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session?.user) return null;

  if (session.expirationDate.getTime() <= Date.now() || session.user.isDisabled) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  return session as SessionWithUser;
}

/** Sliding expiry, throttled so the DB is not written on every request. */
export async function touchSession(session: SessionWithUser): Promise<void> {
  const interval = env.SESSION_TOUCH_INTERVAL_MINUTES * 60 * 1000;
  const last = session.lastActivity?.getTime() ?? 0;
  if (Date.now() - last < interval) return;
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivity: new Date(), expirationDate: expiryFromNow() },
  });
}

/** Delete the session row (if any) and return a Set-Cookie value that clears the cookie. */
export async function destroySession(request: Request): Promise<string> {
  const id = await readSessionId(request);
  if (id) await prisma.session.deleteMany({ where: { id } });
  return sessionCookie.serialize("", { maxAge: 0 });
}
