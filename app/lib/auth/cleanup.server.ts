import { security } from "~/config/security.server";
import { prisma } from "~/lib/database.server";

/**
 * Remove IpBlocks that are both expired and older than the escalation lookback
 * (expired rows are kept during the lookback so repeat offenders keep escalating),
 * and AuthLog rows older than the retention period.
 */
export async function cleanupSecurityTables(now: Date = new Date()) {
  const lookbackCutoff = new Date(now.getTime() - security.escalationLookbackMs);
  const retentionCutoff = new Date(now.getTime() - security.authLogRetentionMs);
  const [ipBlocks, authLogs] = await prisma.$transaction([
    prisma.ipBlock.deleteMany({
      where: { expiresAt: { lt: now }, updatedAt: { lt: lookbackCutoff } },
    }),
    prisma.authLog.deleteMany({ where: { createdAt: { lt: retentionCutoff } } }),
  ]);
  return { ipBlocks: ipBlocks.count, authLogs: authLogs.count };
}
