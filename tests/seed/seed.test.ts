import { beforeEach, describe, expect, it } from "vitest";
import { seedAll } from "../../prisma/seed-lib";
import { prisma } from "~/server/database.server";
import { parseLessonContent } from "~/server/lesson-content.server";
import { resetDb } from "../helpers/db";

describe("seed", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.SEED_ADMIN_USERNAME = "admin";
    process.env.SEED_ADMIN_PASSWORD = "adminadmin";
    process.env.SEED_ADMIN_EMAIL = "";
  });

  it("creates the admin, two subjects with the expected shape, valid content, and is idempotent", async () => {
    await seedAll();
    await seedAll(); // second run must not duplicate or fail

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
    expect(admin.role).toBe("SYSTEM_ADMIN");
    expect(admin.email).toBeNull();
    expect(await prisma.user.count()).toBe(1);

    expect(await prisma.subject.count()).toBe(2);

    const rtl = await prisma.subject.findUniqueOrThrow({
      where: { slug: "genesis" },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } },
    });
    expect(rtl.direction).toBe("rtl");
    expect(rtl.sections.map((section) => section.lessons.length)).toEqual([4, 4, 3, 2]);

    const ltr = await prisma.subject.findUniqueOrThrow({
      where: { slug: "sample-ltr" },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } },
    });
    expect(ltr.direction).toBe("ltr");
    expect(ltr.sections.map((section) => section.lessons.length)).toEqual([3, 2]);
    const terms = ltr.sections[0]?.lessons.find((entry) => entry.title === "Terms");
    expect(terms?.passingScore).toBe(70);

    const lessons = await prisma.lesson.findMany();
    expect(lessons).toHaveLength(18);
    const types = new Set<string>();
    for (const entry of lessons)
      for (const block of parseLessonContent(entry.content)) types.add(block.type);
    expect([...types].sort()).toEqual(["heading", "image", "list", "paragraph", "quote"]);

    expect(await prisma.question.count()).toBe(0);
    expect(await prisma.asset.count()).toBe(1);
    // Every lesson references the placeholder asset exactly once.
    expect(await prisma.lessonAsset.count()).toBe(18);
  }, 30_000); // two full seeds incl. argon2 hashing and 36 lesson writes

  it("fails clearly when the admin credentials are missing", async () => {
    delete process.env.SEED_ADMIN_USERNAME;
    await expect(seedAll()).rejects.toThrow(/SEED_ADMIN_USERNAME/);
  });
});
