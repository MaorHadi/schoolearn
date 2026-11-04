-- AlterTable
ALTER TABLE `Lesson` ADD COLUMN `draftContent` JSON NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Section` ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Subject` ADD COLUMN `publishedAt` DATETIME(3) NULL,
    MODIFY `isActive` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: everything that existed before draft/publish was introduced is live content.
UPDATE `Subject` SET `publishedAt` = NOW(3) WHERE `isActive` = true;
UPDATE `Section` SET `publishedAt` = NOW(3)
  WHERE `subjectId` IN (SELECT `id` FROM `Subject` WHERE `isActive` = true);
UPDATE `Lesson` SET `publishedAt` = NOW(3)
  WHERE `sectionId` IN (SELECT `id` FROM `Section` WHERE `publishedAt` IS NOT NULL);
