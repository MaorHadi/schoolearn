import { prisma } from "~/server/database.server";
import { lockoutStateFor, type LockoutState } from "~/server/auth/auth-log.server";
import type { Role } from "~/shared/roles";

/**
 * SYSTEM_ADMIN management of the User table: list and search, role changes, disable/enable,
 * lockout clearing. The only writer of `role`, `isDisabled` and `lockoutClearedAt`.
 */

export const USERS_PAGE_SIZE = 50;
export const USER_AUTH_LOG_LIMIT = 100;

export interface AdminUserRow {
  id: number;
  username: string;
  email: string | null;
  role: Role;
  isDisabled: boolean;
  createdAt: Date;
}

export interface UserListPage {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserChangeResult =
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "SELF" | "LAST_SYSTEM_ADMIN" };

const rowSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  isDisabled: true,
  createdAt: true,
} as const;

/** Newest first; `query` matches username or email. `page` is 1-based and clamped to >= 1. */
export async function listUsers(input: { query?: string; page?: number }): Promise<UserListPage> {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const query = input.query?.trim() ?? "";
  const where =
    query === "" ? {} : { OR: [{ username: { contains: query } }, { email: { contains: query } }] };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: rowSelect,
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, pageSize: USERS_PAGE_SIZE };
}

/**
 * One user with the security view: lockout state, auth log rows between `since` (inclusive) and
 * `until` (exclusive), newest first and capped at USER_AUTH_LOG_LIMIT, and active IP blocks for
 * the addresses seen in them.
 */
export async function getUserForAdmin(id: number, window: { since: Date; until: Date }) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...rowSelect, lockoutClearedAt: true },
  });
  if (!user) return null;
  const [lockout, authLogs] = await Promise.all([
    lockoutStateFor(user.username, user.lockoutClearedAt),
    prisma.authLog.findMany({
      where: { username: user.username, createdAt: { gte: window.since, lt: window.until } },
      orderBy: { createdAt: "desc" },
      take: USER_AUTH_LOG_LIMIT,
      select: {
        id: true,
        createdAt: true,
        ipAddress: true,
        isSuccessful: true,
        failureReason: true,
        type: true,
      },
    }),
  ]);
  const ipAddresses = [...new Set(authLogs.map((entry) => entry.ipAddress))];
  const ipBlocks =
    ipAddresses.length === 0
      ? []
      : await prisma.ipBlock.findMany({
          where: { ipAddress: { in: ipAddresses }, expiresAt: { gt: new Date() } },
          select: { ipAddress: true, strikeCount: true, expiresAt: true },
        });
  return { ...user, lockout, authLogs, ipBlocks };
}

/** Refuses to change the actor's own account or to remove the last SYSTEM_ADMIN. */
async function guardChange(
  actorId: number,
  userId: number,
  removesSystemAdmin: boolean,
): Promise<UserChangeResult> {
  if (actorId === userId) return { ok: false, reason: "SELF" };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { ok: false, reason: "NOT_FOUND" };
  if (removesSystemAdmin && user.role === "SYSTEM_ADMIN") {
    const remaining = await prisma.user.count({
      where: { role: "SYSTEM_ADMIN", isDisabled: false, id: { not: userId } },
    });
    if (remaining === 0) return { ok: false, reason: "LAST_SYSTEM_ADMIN" };
  }
  return { ok: true };
}

export async function setUserRole(
  actorId: number,
  userId: number,
  role: Role,
): Promise<UserChangeResult> {
  const guard = await guardChange(actorId, userId, role !== "SYSTEM_ADMIN");
  if (!guard.ok) return guard;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return { ok: true };
}

/** Disabling also ends every session of the user, so the change takes effect at once. */
export async function setUserDisabled(
  actorId: number,
  userId: number,
  disabled: boolean,
): Promise<UserChangeResult> {
  const guard = await guardChange(actorId, userId, disabled);
  if (!guard.ok) return guard;
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: userId }, data: { isDisabled: disabled } });
    if (disabled) await transaction.session.deleteMany({ where: { userId } });
  });
  return { ok: true };
}

/** Lifts a username lockout without deleting the audit rows that caused it. */
export async function clearUserLockout(userId: number): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { lockoutClearedAt: new Date() },
  });
  return count === 1;
}

export type { LockoutState };
