import { beforeEach, describe, expect, it } from "vitest";
import { escalationDurationMs } from "~/config/security.server";
import { applyIpBlock, findActiveIpBlock } from "~/lib/auth/ip-block.server";
import { cleanupSecurityTables } from "~/lib/auth/cleanup.server";
import { UNKNOWN_IP } from "~/lib/auth/client-ip.server";
import { prisma } from "~/lib/database.server";
import { resetDb } from "../helpers/db";

const DAY = 86_400_000;

describe("escalationDurationMs", () => {
  it("maps strikes to the table and clamps", () => {
    expect(escalationDurationMs(1)).toBe(15 * 60_000);
    expect(escalationDurationMs(2)).toBe(60 * 60_000);
    expect(escalationDurationMs(3)).toBe(360 * 60_000);
    expect(escalationDurationMs(4)).toBe(1440 * 60_000);
    expect(escalationDurationMs(99)).toBe(1440 * 60_000);
    expect(escalationDurationMs(0)).toBe(15 * 60_000);
  });
});

describe("applyIpBlock", () => {
  beforeEach(resetDb);

  it("creates a first strike, then escalates in place keeping one row per IP", async () => {
    const b1 = await applyIpBlock("1.2.3.4", "test");
    expect(b1.strikeCount).toBe(1);
    const b2 = await applyIpBlock("1.2.3.4", "test");
    expect(b2.id).toBe(b1.id);
    expect(b2.strikeCount).toBe(2);
    expect(b2.expiresAt.getTime()).toBeGreaterThan(b1.expiresAt.getTime());
    expect(await prisma.ipBlock.count()).toBe(1);
  });

  it("resets strikes when the previous block is older than the lookback", async () => {
    const b1 = await applyIpBlock("1.2.3.4", "test");
    await prisma.ipBlock.update({
      where: { id: b1.id },
      data: {
        updatedAt: new Date(Date.now() - 8 * DAY),
        expiresAt: new Date(Date.now() - 7 * DAY),
      },
    });
    const b2 = await applyIpBlock("1.2.3.4", "test");
    expect(b2.strikeCount).toBe(1);
  });

  it("refuses to block the unknown-IP sentinel", async () => {
    await expect(applyIpBlock(UNKNOWN_IP, "test")).rejects.toThrow(/unknown/);
    expect(await prisma.ipBlock.count()).toBe(0);
  });

  it("findActiveIpBlock ignores expired rows", async () => {
    const b = await applyIpBlock("1.2.3.4", "test");
    expect(await findActiveIpBlock("1.2.3.4")).not.toBeNull();
    await prisma.ipBlock.update({
      where: { id: b.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(await findActiveIpBlock("1.2.3.4")).toBeNull();
  });
});

describe("cleanupSecurityTables", () => {
  beforeEach(resetDb);

  it("deletes only expired blocks past the lookback and old auth logs", async () => {
    const recentExpired = await applyIpBlock("1.1.1.1", "t");
    await prisma.ipBlock.update({
      where: { id: recentExpired.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    const oldExpired = await applyIpBlock("2.2.2.2", "t");
    await prisma.ipBlock.update({
      where: { id: oldExpired.id },
      data: { expiresAt: new Date(Date.now() - 1), updatedAt: new Date(Date.now() - 8 * DAY) },
    });
    await prisma.authLog.createMany({
      data: [
        {
          ipAddress: "x",
          username: "a",
          isSuccessful: false,
          type: "login",
          createdAt: new Date(),
        },
        {
          ipAddress: "x",
          username: "a",
          isSuccessful: false,
          type: "login",
          createdAt: new Date(Date.now() - 40 * DAY),
        },
      ],
    });

    const r = await cleanupSecurityTables();
    expect(r.ipBlocks).toBe(1);
    expect(r.authLogs).toBe(1);
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "1.1.1.1" } })).not.toBeNull();
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "2.2.2.2" } })).toBeNull();
    expect(await prisma.authLog.count()).toBe(1);
  });
});
