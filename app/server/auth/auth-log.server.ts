import { prisma } from "~/server/database.server";
import type { LoginFailureReason, RegisterFailureReason } from "~/schemas/auth";

/**
 * Failures that reflect an actual wrong guess. Attempts rejected because a lock or block was
 * already in place are logged for auditing but must not feed the counters, otherwise a locked
 * user who keeps retrying (or an attacker) extends the lock indefinitely.
 */
const CREDENTIAL_FAILURES: LoginFailureReason[] = [
  "USER_NOT_FOUND",
  "BAD_PASSWORD",
  "USER_DISABLED",
];

export async function recordAuthAttempt(attempt: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: LoginFailureReason;
}): Promise<void> {
  await prisma.authLog.create({
    data: {
      ipAddress: attempt.ip,
      username: attempt.username,
      isSuccessful: attempt.ok,
      failureReason: attempt.ok ? null : (attempt.reason ?? null),
      type: "login",
    },
  });
}

/** Count credential failures within the last `sinceMs`, filtered by IP and/or username. */
export function countRecentFailures(filter: {
  ip?: string;
  username?: string;
  sinceMs: number;
}): Promise<number> {
  return prisma.authLog.count({
    where: {
      isSuccessful: false,
      type: "login",
      failureReason: { in: CREDENTIAL_FAILURES },
      createdAt: { gte: new Date(Date.now() - filter.sinceMs) },
      ...(filter.ip ? { ipAddress: filter.ip } : {}),
      ...(filter.username ? { username: filter.username } : {}),
    },
  });
}

export async function recordRegisterAttempt(attempt: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: RegisterFailureReason;
}): Promise<void> {
  await prisma.authLog.create({
    data: {
      ipAddress: attempt.ip,
      username: attempt.username,
      isSuccessful: attempt.ok,
      failureReason: attempt.ok ? null : (attempt.reason ?? null),
      type: "register",
    },
  });
}

/** Registration attempts (successful or not) from one IP within the last `sinceMs`. */
export function countRecentRegistrations(ip: string, sinceMs: number): Promise<number> {
  return prisma.authLog.count({
    where: {
      type: "register",
      ipAddress: ip,
      // Refusals do not extend the window. SQL `!=` drops NULLs, so include successes explicitly.
      OR: [{ failureReason: null }, { failureReason: { not: "REGISTER_THROTTLED" } }],
      createdAt: { gte: new Date(Date.now() - sinceMs) },
    },
  });
}

/** Timestamp of the most recent credential failure for a username, or null. */
export async function lastCredentialFailureAt(username: string): Promise<Date | null> {
  const row = await prisma.authLog.findFirst({
    where: {
      username,
      isSuccessful: false,
      type: "login",
      failureReason: { in: CREDENTIAL_FAILURES },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}
