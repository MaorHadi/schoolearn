import { prisma } from "~/server/database.server";
import type { LoginFailureReason } from "~/schemas/auth";

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

/** Count failed login attempts within the last `sinceMs`, filtered by IP and/or username. */
export function countRecentFailures(filter: {
  ip?: string;
  username?: string;
  sinceMs: number;
}): Promise<number> {
  return prisma.authLog.count({
    where: {
      isSuccessful: false,
      type: "login",
      createdAt: { gte: new Date(Date.now() - filter.sinceMs) },
      ...(filter.ip ? { ipAddress: filter.ip } : {}),
      ...(filter.username ? { username: filter.username } : {}),
    },
  });
}
