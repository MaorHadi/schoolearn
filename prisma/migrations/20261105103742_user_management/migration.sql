-- AlterTable
ALTER TABLE `User` ADD COLUMN `lockoutClearedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);
