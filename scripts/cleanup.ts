// Run periodically (e.g. nightly cron): `npm run cleanup`
import "dotenv/config";
import { cleanupSecurityTables } from "../app/lib/auth/cleanup.server";
import { prisma } from "../app/lib/database.server";

try {
  const r = await cleanupSecurityTables();
  console.log(`Deleted ${r.ipBlocks} expired IP block(s) and ${r.authLogs} old auth log row(s).`);
} finally {
  await prisma.$disconnect();
}
