import { beforeEach, describe, expect, it } from "vitest";
import { extractAssetIds } from "~/schemas/content-blocks";
import { saveLessonContent } from "~/server/lesson-content.server";
import { createAssetFromBuffer } from "~/server/storage/assets.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

const png = new Uint8Array([137, 80, 78, 71]);

describe("extractAssetIds", () => {
  it("returns unique asset ids from image blocks only", () => {
    expect(
      extractAssetIds([
        { id: "a", type: "heading", level: 1, text: "x" },
        { id: "b", type: "image", assetId: 7, alt: "x" },
        { id: "c", type: "image", assetId: 7, alt: "y" },
        { id: "d", type: "image", assetId: 9, alt: "z" },
      ]),
    ).toEqual([7, 9]);
  });
});

describe("saveLessonContent", () => {
  beforeEach(resetDb);

  it("stores validated content and syncs LessonAsset rows", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const first = await createAssetFromBuffer({ data: png, mimeType: "image/png", key: "t/1.png" });
    const second = await createAssetFromBuffer({
      data: png,
      mimeType: "image/png",
      key: "t/2.png",
    });

    await saveLessonContent(lessonId, [{ id: "i1", type: "image", assetId: first.id, alt: "a" }]);
    let usages = await prisma.lessonAsset.findMany({ where: { lessonId } });
    expect(usages.map((usage) => usage.assetId)).toEqual([first.id]);

    // Replacing the image swaps the usage row.
    await saveLessonContent(lessonId, [{ id: "i2", type: "image", assetId: second.id, alt: "b" }]);
    usages = await prisma.lessonAsset.findMany({ where: { lessonId } });
    expect(usages.map((usage) => usage.assetId)).toEqual([second.id]);

    // Removing all images clears usages.
    await saveLessonContent(lessonId, [{ id: "h", type: "heading", level: 1, text: "x" }]);
    expect(await prisma.lessonAsset.count({ where: { lessonId } })).toBe(0);
  });

  it("rejects content that references a non-existent asset", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    await expect(
      saveLessonContent(lessonId, [{ id: "i", type: "image", assetId: 999999, alt: "a" }]),
    ).rejects.toThrow(/asset/i);
  });

  it("prevents deleting an asset that a lesson still uses", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    const lessonId = lessonIds[0]?.[0];
    if (!lessonId) throw new Error("fixture");
    const asset = await createAssetFromBuffer({ data: png, mimeType: "image/png", key: "t/3.png" });
    await saveLessonContent(lessonId, [{ id: "i", type: "image", assetId: asset.id, alt: "a" }]);
    await expect(prisma.asset.delete({ where: { id: asset.id } })).rejects.toThrow();
  });
});
