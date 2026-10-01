import { escalationDurationMs, security } from "~/server/security.server";
import { prisma } from "~/server/database.server";
import type { IpBlock } from "../../../prisma/generated/client/client";
import { UNKNOWN_IP } from "./client-ip.server";

export function findActiveIpBlock(ip: string): Promise<IpBlock | null> {
  return prisma.ipBlock.findFirst({ where: { ipAddress: ip, expiresAt: { gt: new Date() } } });
}

/**
 * One row per IP. A repeat offense within the escalation lookback increments strikeCount
 * and extends expiresAt in place; outside the lookback the strike count resets to 1.
 */
export async function applyIpBlock(ip: string, reason: string): Promise<IpBlock> {
  if (ip === UNKNOWN_IP) {
    throw new Error("Refusing to block the 'unknown' IP sentinel; it would block every user");
  }
  const now = Date.now();
  const existing = await prisma.ipBlock.findUnique({ where: { ipAddress: ip } });
  const withinLookback =
    existing !== null && now - existing.updatedAt.getTime() < security.escalationLookbackMs;
  const strikeCount = withinLookback ? existing.strikeCount + 1 : 1;
  const expiresAt = new Date(now + escalationDurationMs(strikeCount));

  return prisma.ipBlock.upsert({
    where: { ipAddress: ip },
    create: { ipAddress: ip, reason, strikeCount, expiresAt },
    update: { reason, strikeCount, expiresAt },
  });
}
