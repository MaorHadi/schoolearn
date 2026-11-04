-- CreateTable
CREATE TABLE `Suggestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('NEW', 'REVIEWED', 'DONE') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Suggestion_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Suggestion_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Suggestion` ADD CONSTRAINT `Suggestion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
