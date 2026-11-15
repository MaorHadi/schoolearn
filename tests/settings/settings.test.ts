import { beforeEach, describe, expect, it } from "vitest";
import { MEBIBYTE } from "~/schemas/system-settings";
import { prisma } from "~/server/database.server";
import { env } from "~/server/env.server";
import { createSuggestion } from "~/server/feedback/suggestions.server";
import { getSystemSettings, updateSystemSettings } from "~/server/settings/settings.server";
import { storeUploadedImage } from "~/server/storage/upload.server";
import { PNG_HEADER } from "../helpers/content";
import { resetDb } from "../helpers/db";

async function makeAdmin() {
  return prisma.user.create({
    data: { username: "root", passwordHash: "x", role: "SYSTEM_ADMIN" },
  });
}

describe("system settings", () => {
  beforeEach(resetDb);

  it("defaults to the env values with registration open", async () => {
    expect(await getSystemSettings()).toEqual({
      contactEmail: env.CONTACT_EMAIL ?? null,
      suggestionsMaxPerDay: env.SUGGESTIONS_MAX_PER_DAY,
      registrationOpen: true,
      uploadMaxBytes: env.UPLOAD_MAX_BYTES,
    });
  });

  it("saved values override the defaults and record who saved them", async () => {
    const admin = await makeAdmin();
    const saved = {
      contactEmail: "teachers@example.org",
      suggestionsMaxPerDay: 2,
      registrationOpen: false,
      uploadMaxBytes: 2 * MEBIBYTE,
    };
    await updateSystemSettings(saved, admin.id);
    expect(await getSystemSettings()).toEqual(saved);

    // Saving again replaces the rows; an explicit "no email" is stored, not reset to the default.
    await updateSystemSettings({ ...saved, contactEmail: null, registrationOpen: true }, admin.id);
    expect(await getSystemSettings()).toEqual({
      ...saved,
      contactEmail: null,
      registrationOpen: true,
    });
    const rows = await prisma.systemSetting.findMany();
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.updatedById === admin.id)).toBe(true);
  });

  it("rejects invalid values on save and ignores invalid stored ones on read", async () => {
    const admin = await makeAdmin();
    const settings = await getSystemSettings();
    await expect(
      updateSystemSettings({ ...settings, suggestionsMaxPerDay: 0 }, admin.id),
    ).rejects.toThrow();
    expect(await prisma.systemSetting.count()).toBe(0);

    await prisma.systemSetting.createMany({
      data: [
        { key: "suggestionsMaxPerDay", value: "many" },
        { key: "uploadMaxBytes", value: 3 * MEBIBYTE },
        { key: "unknownSetting", value: true },
      ],
    });
    expect(await getSystemSettings()).toEqual({
      ...settings,
      suggestionsMaxPerDay: env.SUGGESTIONS_MAX_PER_DAY,
      uploadMaxBytes: 3 * MEBIBYTE,
    });
  });

  it("the suggestion throttle follows the setting", async () => {
    const admin = await makeAdmin();
    await updateSystemSettings(
      { ...(await getSystemSettings()), suggestionsMaxPerDay: 1 },
      admin.id,
    );
    expect((await createSuggestion(admin.id, "first suggestion of the day")).ok).toBe(true);
    expect(await createSuggestion(admin.id, "second suggestion of the day")).toEqual({
      ok: false,
      reason: "THROTTLED",
    });
  });

  it("the upload limit follows the setting", async () => {
    const admin = await makeAdmin();
    const image = new Uint8Array(MEBIBYTE + 1024);
    image.set(PNG_HEADER);
    const file = new File([image], "big.png", { type: "image/png" });

    await updateSystemSettings(
      { ...(await getSystemSettings()), uploadMaxBytes: MEBIBYTE },
      admin.id,
    );
    expect(await storeUploadedImage(file, admin.id)).toEqual({ ok: false, reason: "TOO_LARGE" });
    expect(await prisma.asset.count()).toBe(0);
  });
});
