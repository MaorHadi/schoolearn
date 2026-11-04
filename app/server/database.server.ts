import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../prisma/generated/client/client";
import { env } from "~/server/env.server";

function createClient() {
  const url = new URL(env.DATABASE_URL);
  const adapter = new PrismaMariaDb(
    {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5,
    },
    // The adapter disables the driver's prepared-statement cache, so the default binary protocol
    // costs a prepare round-trip per query. Over Docker Desktop port forwarding that is ~45 ms per
    // statement, which made the DB test suite take minutes. The text protocol is one round-trip;
    // the driver still escapes parameters client-side.
    { useTextProtocol: true },
  );
  return new PrismaClient({ adapter });
}

declare global {
  // `var` is required for global augmentation; the cache survives Vite HMR in dev.
  var __prisma: PrismaClient | undefined;
}

/** Single PrismaClient for the process. Only import from *.server.ts files or route modules. */
export const prisma: PrismaClient = globalThis.__prisma ?? createClient();
if (env.NODE_ENV !== "production") globalThis.__prisma = prisma;
