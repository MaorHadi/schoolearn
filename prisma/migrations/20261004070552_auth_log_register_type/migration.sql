-- AlterTable
ALTER TABLE `AuthLog` MODIFY `type` ENUM('login', 'register', 'twoFactorAuthentication') NOT NULL;
