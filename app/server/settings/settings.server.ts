import { Prisma } from "../../../prisma/generated/client/client";
import {
  SystemSettingsSchema,
  type SystemSettingKey,
  type SystemSettings,
} from "~/schemas/system-settings";
import { prisma } from "~/server/database.server";
import { env } from "~/server/env.server";

/**
 * System settings: the only reader and writer of the SystemSetting table. A setting saved in the
 * app overrides its default; the defaults are the .env values (registration is open by default).
 */

function defaultSettings(): SystemSettings {
  return {
    contactEmail: env.CONTACT_EMAIL ?? null,
    suggestionsMaxPerDay: env.SUGGESTIONS_MAX_PER_DAY,
    registrationOpen: true,
    uploadMaxBytes: env.UPLOAD_MAX_BYTES,
  };
}

/**
 * The settings in effect. A stored value that no longer passes the schema falls back to the
 * default, so bad data never breaks a page.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const rows = await prisma.systemSetting.findMany({ select: { key: true, value: true } });
  const stored = new Map<string, unknown>(rows.map((row) => [row.key, row.value]));
  const fallback = defaultSettings();
  const resolve = <Key extends SystemSettingKey>(key: Key): SystemSettings[Key] => {
    if (!stored.has(key)) return fallback[key];
    const parsed = SystemSettingsSchema.shape[key].safeParse(stored.get(key));
    return parsed.success ? (parsed.data as SystemSettings[Key]) : fallback[key];
  };
  return {
    contactEmail: resolve("contactEmail"),
    suggestionsMaxPerDay: resolve("suggestionsMaxPerDay"),
    registrationOpen: resolve("registrationOpen"),
    uploadMaxBytes: resolve("uploadMaxBytes"),
  };
}

/** Save every setting in one transaction, recording who changed them. */
export async function updateSystemSettings(
  values: SystemSettings,
  updatedById: number,
): Promise<void> {
  const settings = SystemSettingsSchema.parse(values);
  await prisma.$transaction(
    Object.entries(settings).map(([key, raw]) => {
      const value = raw === null ? Prisma.JsonNull : raw;
      return prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedById },
        update: { value, updatedById },
      });
    }),
  );
}
