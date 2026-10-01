import { describe, expect, it } from "vitest";
import { prisma } from "~/lib/db.server";

describe("database", () => {
  it("connects and sees the tables", async () => {
    const users = await prisma.user.count();
    expect(users).toBeGreaterThanOrEqual(0);
    const subjects = await prisma.subject.count();
    expect(subjects).toBeGreaterThanOrEqual(0);
  });

  it("is talking to MariaDB in the container, not a stray local server", async () => {
    const rows = await prisma.$queryRaw<{ v: string }[]>`SELECT VERSION() AS v`;
    expect(rows[0]?.v).toMatch(/MariaDB/i);
  });
});
