import { beforeEach, describe, expect, it } from "vitest";
import { escalationDurationMs } from "~/server/security.server";
import { applyIpBlock, findActiveIpBlock } from "~/server/auth/ip-block.server";
import { cleanupSecurityTables } from "~/server/auth/cleanup.server";
import { UNKNOWN_IP } from "~/server/auth/client-ip.server";
import { prisma } from "~/server/database.server";
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
    const firstBlock = await applyIpBlock("1.2.3.4", "test");
    expect(firstBlock.strikeCount).toBe(1);
    const secondBlock = await applyIpBlock("1.2.3.4", "test");
    expect(secondBlock.id).toBe(firstBlock.id);
    expect(secondBlock.strikeCount).toBe(2);
    expect(secondBlock.expiresAt.getTime()).toBeGreaterThan(firstBlock.expiresAt.getTime());
    expect(await prisma.ipBlock.count()).toBe(1);
  });

  it("resets strikes when the previous block is older than the lookback", async () => {
    const firstBlock = await applyIpBlock("1.2.3.4", "test");
    await prisma.ipBlock.update({
      where: { id: firstBlock.id },
      data: {
        updatedAt: new Date(Date.now() - 8 * DAY),
        expiresAt: new Date(Date.now() - 7 * DAY),
      },
    });
    const secondBlock = await applyIpBlock("1.2.3.4", "test");
    expect(secondBlock.strikeCount).toBe(1);
  });

  it("refuses to block the unknown-IP sentinel", async () => {
    await expect(applyIpBlock(UNKNOWN_IP, "test")).rejects.toThrow(/unknown/);
    expect(await prisma.ipBlock.count()).toBe(0);
  });

  it("findActiveIpBlock ignores expired rows", async () => {
    const block = await applyIpBlock("1.2.3.4", "test");
    expect(await findActiveIpBlock("1.2.3.4")).not.toBeNull();
    await prisma.ipBlock.update({
      where: { id: block.id },
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

    const result = await cleanupSecurityTables();
    expect(result.ipBlocks).toBe(1);
    expect(result.authLogs).toBe(1);
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "1.1.1.1" } })).not.toBeNull();
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "2.2.2.2" } })).toBeNull();
    expect(await prisma.authLog.count()).toBe(1);
  });
});
