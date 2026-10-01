// CLI entry used by `prisma db seed` (see prisma.config.ts). Logic lives in seed-lib.ts.
import "dotenv/config";
import { prisma } from "../app/server/database.server";
import { seedAll } from "./seed-lib";

try {
  await seedAll();
  console.log("Seed complete.");
} finally {
  await prisma.$disconnect();
}
