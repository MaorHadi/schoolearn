import { prisma } from "~/server/database.server";
import { security } from "~/server/security.server";
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

/** True for a wrong guess, false for an attempt refused because a lock or block was in place. */
export function isCredentialFailure(reason: LoginFailureReason): boolean {
  return CREDENTIAL_FAILURES.includes(reason);
}

/** Every attempt is logged, successful or not; `type` separates logins from registrations. */
async function recordAttempt(
  type: "login" | "register",
  attempt: { ip: string; username: string; ok: boolean; reason?: string },
): Promise<void> {
  await prisma.authLog.create({
    data: {
      ipAddress: attempt.ip,
      username: attempt.username,
      isSuccessful: attempt.ok,
      failureReason: attempt.ok ? null : (attempt.reason ?? null),
      type,
    },
  });
}

export function recordAuthAttempt(attempt: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: LoginFailureReason;
}): Promise<void> {
  return recordAttempt("login", attempt);
}

export function recordRegisterAttempt(attempt: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: RegisterFailureReason;
}): Promise<void> {
  return recordAttempt("register", attempt);
}

/** The rows the lockout and IP-block counters look at. */
const CREDENTIAL_FAILURE_FILTER = {
  isSuccessful: false,
  type: "login",
  failureReason: { in: CREDENTIAL_FAILURES },
} as const;

/**
 * Count credential failures within the last `sinceMs`, filtered by IP and/or username.
 * `notBefore` (a user's `lockoutClearedAt`) excludes failures an admin has already forgiven.
 */
export function countRecentFailures(filter: {
  ip?: string;
  username?: string;
  sinceMs: number;
  notBefore?: Date | null;
}): Promise<number> {
  const windowStart = new Date(Date.now() - filter.sinceMs);
  const floor = filter.notBefore && filter.notBefore > windowStart ? filter.notBefore : windowStart;
  return prisma.authLog.count({
    where: {
      ...CREDENTIAL_FAILURE_FILTER,
      createdAt: { gte: floor },
      ...(filter.ip ? { ipAddress: filter.ip } : {}),
      ...(filter.username ? { username: filter.username } : {}),
    },
  });
}

export interface LockoutState {
  locked: boolean;
  /** Credential failures counted inside the window (after any admin clear). */
  failures: number;
  /** When the lock lifts on its own, or null when not locked. */
  until: Date | null;
}

/**
 * A username is locked when it has reached N credential failures inside the failure window
 * and the lockout period since the last of those failures has not elapsed. Attempts made while
 * locked are logged as USERNAME_LOCKED and never counted, so the lock cannot self-extend.
 * Failures before `lockoutClearedAt` are ignored.
 */
export async function lockoutStateFor(
  username: string,
  lockoutClearedAt: Date | null = null,
): Promise<LockoutState> {
  const failures = await countRecentFailures({
    username,
    sinceMs: security.failureWindowMs,
    notBefore: lockoutClearedAt,
  });
  if (failures < security.usernameMaxFailures) return { locked: false, failures, until: null };
  const lastFailure = await lastCredentialFailureAt(username);
  if (!lastFailure) return { locked: false, failures, until: null };
  const until = new Date(lastFailure.getTime() + security.usernameLockoutMs);
  return until.getTime() > Date.now()
    ? { locked: true, failures, until }
    : { locked: false, failures, until: null };
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
async function lastCredentialFailureAt(username: string): Promise<Date | null> {
  const row = await prisma.authLog.findFirst({
    where: { username, ...CREDENTIAL_FAILURE_FILTER },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}
