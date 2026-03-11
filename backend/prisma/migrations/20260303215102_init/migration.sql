/*
  Warnings:

  - You are about to drop the column `benutzer_id` on the `benutzer_fach` table. All the data in the column will be lost.
  - You are about to drop the column `fach_id` on the `benutzer_fach` table. All the data in the column will be lost.
  - You are about to drop the column `benutzer_id` on the `benutzer_klasse` table. All the data in the column will be lost.
  - You are about to drop the column `klasse_id` on the `benutzer_klasse` table. All the data in the column will be lost.
  - You are about to drop the column `benutzer_id` on the `benutzer_rolle` table. All the data in the column will be lost.
  - You are about to drop the column `rolle_id` on the `benutzer_rolle` table. All the data in the column will be lost.
  - You are about to drop the `abgabe` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `aufgabe` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `benutzer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fach` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `klasse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rolle` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,subjectId]` on the table `Benutzer_Fach` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,classId]` on the table `Benutzer_Klasse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId]` on the table `Benutzer_Rolle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subjectId` to the `Benutzer_Fach` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Benutzer_Fach` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `Benutzer_Klasse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Benutzer_Klasse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `Benutzer_Rolle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Benutzer_Rolle` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `abgabe` DROP FOREIGN KEY `Abgabe_aufgabe_id_fkey`;

-- DropForeignKey
ALTER TABLE `abgabe` DROP FOREIGN KEY `Abgabe_schueler_id_fkey`;

-- DropForeignKey
ALTER TABLE `aufgabe` DROP FOREIGN KEY `Aufgabe_fach_id_fkey`;

-- DropForeignKey
ALTER TABLE `aufgabe` DROP FOREIGN KEY `Aufgabe_klasse_id_fkey`;

-- DropForeignKey
ALTER TABLE `aufgabe` DROP FOREIGN KEY `Aufgabe_lehrer_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_fach` DROP FOREIGN KEY `Benutzer_Fach_benutzer_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_fach` DROP FOREIGN KEY `Benutzer_Fach_fach_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_klasse` DROP FOREIGN KEY `Benutzer_Klasse_benutzer_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_klasse` DROP FOREIGN KEY `Benutzer_Klasse_klasse_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_benutzer_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_rolle_id_fkey`;

-- DropIndex
DROP INDEX `Benutzer_Fach_benutzer_id_fach_id_key` ON `benutzer_fach`;

-- DropIndex
DROP INDEX `Benutzer_Fach_fach_id_fkey` ON `benutzer_fach`;

-- DropIndex
DROP INDEX `Benutzer_Klasse_benutzer_id_klasse_id_key` ON `benutzer_klasse`;

-- DropIndex
DROP INDEX `Benutzer_Klasse_klasse_id_fkey` ON `benutzer_klasse`;

-- DropIndex
DROP INDEX `Benutzer_Rolle_benutzer_id_rolle_id_key` ON `benutzer_rolle`;

-- DropIndex
DROP INDEX `Benutzer_Rolle_rolle_id_fkey` ON `benutzer_rolle`;

-- AlterTable
ALTER TABLE `benutzer_fach` DROP COLUMN `benutzer_id`,
    DROP COLUMN `fach_id`,
    ADD COLUMN `subjectId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `benutzer_klasse` DROP COLUMN `benutzer_id`,
    DROP COLUMN `klasse_id`,
    ADD COLUMN `classId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `benutzer_rolle` DROP COLUMN `benutzer_id`,
    DROP COLUMN `rolle_id`,
    ADD COLUMN `roleId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `abgabe`;

-- DropTable
DROP TABLE `aufgabe`;

-- DropTable
DROP TABLE `benutzer`;

-- DropTable
DROP TABLE `fach`;

-- DropTable
DROP TABLE `klasse`;

-- DropTable
DROP TABLE `rolle`;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(255) NOT NULL,
    `lastName` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Class` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `year` INTEGER NOT NULL,

    UNIQUE INDEX `Class_name_year_key`(`name`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `Subject_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `attachments` TEXT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `classId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Assignment_classId_dueDate_idx`(`classId`, `dueDate`),
    INDEX `Assignment_teacherId_idx`(`teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignmentId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `files` TEXT NULL,
    `text` TEXT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `grade` INTEGER NULL,
    `feedback` TEXT NULL,

    INDEX `Submission_studentId_idx`(`studentId`),
    UNIQUE INDEX `Submission_assignmentId_studentId_key`(`assignmentId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Benutzer_Fach_userId_subjectId_key` ON `Benutzer_Fach`(`userId`, `subjectId`);

-- CreateIndex
CREATE UNIQUE INDEX `Benutzer_Klasse_userId_classId_key` ON `Benutzer_Klasse`(`userId`, `classId`);

-- CreateIndex
CREATE UNIQUE INDEX `Benutzer_Rolle_userId_roleId_key` ON `Benutzer_Rolle`(`userId`, `roleId`);

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Klasse` ADD CONSTRAINT `Benutzer_Klasse_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Klasse` ADD CONSTRAINT `Benutzer_Klasse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Fach` ADD CONSTRAINT `Benutzer_Fach_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Fach` ADD CONSTRAINT `Benutzer_Fach_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
