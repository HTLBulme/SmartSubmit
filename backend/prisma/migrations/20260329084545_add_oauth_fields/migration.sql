-- AlterTable
ALTER TABLE `user` ADD COLUMN `oauthId` VARCHAR(255) NULL,
    ADD COLUMN `provider` VARCHAR(50) NULL,
    MODIFY `passwordHash` VARCHAR(255) NULL;
