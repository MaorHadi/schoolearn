// Run periodically (e.g. nightly cron): `npm run cleanup`
import "dotenv/config";
import { cleanupSecurityTables } from "../app/server/auth/cleanup.server";
import { prisma } from "../app/server/database.server";

try {
  const result = await cleanupSecurityTables();
  console.log(
    `Deleted ${result.ipBlocks} expired IP block(s) and ${result.authLogs} old auth log row(s).`,
  );
} finally {
  await prisma.$disconnect();
}
