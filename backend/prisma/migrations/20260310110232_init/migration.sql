/*
  Warnings:

  - You are about to drop the `benutzer_fach` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `benutzer_klasse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `benutzer_rolle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `benutzer_fach` DROP FOREIGN KEY `Benutzer_Fach_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_fach` DROP FOREIGN KEY `Benutzer_Fach_userId_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_klasse` DROP FOREIGN KEY `Benutzer_Klasse_classId_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_klasse` DROP FOREIGN KEY `Benutzer_Klasse_userId_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_userId_fkey`;

-- DropTable
DROP TABLE `benutzer_fach`;

-- DropTable
DROP TABLE `benutzer_klasse`;

-- DropTable
DROP TABLE `benutzer_rolle`;

-- CreateTable
CREATE TABLE `User_Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,

    UNIQUE INDEX `User_Role_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_Class` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,

    UNIQUE INDEX `User_Class_userId_classId_key`(`userId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_Subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,

    UNIQUE INDEX `User_Subject_userId_subjectId_key`(`userId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User_Role` ADD CONSTRAINT `User_Role_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Role` ADD CONSTRAINT `User_Role_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Class` ADD CONSTRAINT `User_Class_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Class` ADD CONSTRAINT `User_Class_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Subject` ADD CONSTRAINT `User_Subject_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Subject` ADD CONSTRAINT `User_Subject_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
