// Importable seed logic (tests call seedAll directly). The CLI entry is prisma/seed.ts.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../app/server/database.server";
import { hashPassword } from "../app/server/auth/password.server";
import { saveLessonContent } from "../app/server/lesson-content.server";
import { createAssetFromBuffer } from "../app/server/storage/assets.server";
import { genesis } from "./seed-data/genesis";
import { sampleLtr } from "./seed-data/sample-ltr";
import type { SeedSubject } from "./seed-data/types";

/** Stable key so re-running the seed finds the same asset instead of uploading again. */
const PLACEHOLDER_KEY = "seed-placeholder/placeholder.png";

async function seedAdmin(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD are required to seed the admin");
  }
  const email = process.env.SEED_ADMIN_EMAIL || null;
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { username },
    create: { username, email, passwordHash, role: "SYSTEM_ADMIN" },
    update: { role: "SYSTEM_ADMIN", email, passwordHash },
  });
}

async function seedPlaceholderAsset(): Promise<number> {
  const existing = await prisma.asset.findUnique({ where: { storageKey: PLACEHOLDER_KEY } });
  if (existing) return existing.id;
  const data = await readFile(join(import.meta.dirname, "seed-data", "placeholder.png"));
  const asset = await createAssetFromBuffer({
    data,
    mimeType: "image/png",
    width: 64,
    height: 64,
    key: PLACEHOLDER_KEY,
  });
  return asset.id;
}

/** sortOrder is not unique, so look up by (parent, sortOrder) then create or update. */
async function seedSubject(definition: SeedSubject, assetId: number): Promise<void> {
  const subject = await prisma.subject.upsert({
    where: { slug: definition.slug },
    create: {
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      locale: definition.locale,
      direction: definition.direction,
      sortOrder: definition.sortOrder,
    },
    update: {
      name: definition.name,
      description: definition.description,
      locale: definition.locale,
      direction: definition.direction,
      sortOrder: definition.sortOrder,
    },
  });

  for (const sectionDefinition of definition.sections) {
    const existingSection = await prisma.section.findFirst({
      where: { subjectId: subject.id, sortOrder: sectionDefinition.sortOrder },
    });
    const section = existingSection
      ? await prisma.section.update({
          where: { id: existingSection.id },
          data: { title: sectionDefinition.title },
        })
      : await prisma.section.create({
          data: {
            subjectId: subject.id,
            title: sectionDefinition.title,
            sortOrder: sectionDefinition.sortOrder,
          },
        });

    for (const lessonDefinition of sectionDefinition.lessons) {
      const existingLesson = await prisma.lesson.findFirst({
        where: { sectionId: section.id, sortOrder: lessonDefinition.sortOrder },
      });
      const lessonData = {
        title: lessonDefinition.title,
        passingScore: lessonDefinition.passingScore ?? null,
      };
      const lesson = existingLesson
        ? await prisma.lesson.update({ where: { id: existingLesson.id }, data: lessonData })
        : await prisma.lesson.create({
            data: {
              sectionId: section.id,
              sortOrder: lessonDefinition.sortOrder,
              content: [],
              ...lessonData,
            },
          });
      // Validates blocks and maintains LessonAsset rows.
      await saveLessonContent(lesson.id, lessonDefinition.content(assetId));
    }
  }
}

export async function seedAll(): Promise<void> {
  await seedAdmin();
  const assetId = await seedPlaceholderAsset();
  for (const definition of [genesis, sampleLtr]) {
    await seedSubject(definition, assetId);
  }
}
