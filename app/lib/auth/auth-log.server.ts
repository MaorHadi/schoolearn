import { prisma } from "~/lib/database.server";
import type { LoginFailureReason } from "./validation";

export async function recordAuthAttempt(p: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: LoginFailureReason;
}): Promise<void> {
  await prisma.authLog.create({
    data: {
      ipAddress: p.ip,
      username: p.username,
      isSuccessful: p.ok,
      failureReason: p.ok ? null : (p.reason ?? null),
      type: "login",
    },
  });
}

/** Count failed login attempts within the last `sinceMs`, filtered by IP and/or username. */
export function countRecentFailures(p: {
  ip?: string;
  username?: string;
  sinceMs: number;
}): Promise<number> {
  return prisma.authLog.count({
    where: {
      isSuccessful: false,
      type: "login",
      createdAt: { gte: new Date(Date.now() - p.sinceMs) },
      ...(p.ip ? { ipAddress: p.ip } : {}),
      ...(p.username ? { username: p.username } : {}),
    },
  });
}
