/*
  Warnings:

  - A unique constraint covering the columns `[benutzer_id,rolle_id]` on the table `Benutzer_Rolle` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_benutzer_id_fkey`;

-- DropForeignKey
ALTER TABLE `benutzer_rolle` DROP FOREIGN KEY `Benutzer_Rolle_rolle_id_fkey`;

-- DropIndex
DROP INDEX `Benutzer_Rolle_benutzer_id_fkey` ON `benutzer_rolle`;

-- DropIndex
DROP INDEX `Benutzer_Rolle_rolle_id_fkey` ON `benutzer_rolle`;

-- AlterTable
ALTER TABLE `benutzer` ADD COLUMN `aktiv` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `vorname` VARCHAR(255) NOT NULL,
    MODIFY `nachname` VARCHAR(255) NOT NULL,
    MODIFY `email` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `rolle` MODIFY `bezeichnung` VARCHAR(255) NOT NULL;

-- CreateTable
CREATE TABLE `Klasse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `jahrgang` INTEGER NOT NULL,

    UNIQUE INDEX `Klasse_name_jahrgang_key`(`name`, `jahrgang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Benutzer_Klasse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `benutzer_id` INTEGER NOT NULL,
    `klasse_id` INTEGER NOT NULL,

    UNIQUE INDEX `Benutzer_Klasse_benutzer_id_klasse_id_key`(`benutzer_id`, `klasse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fach` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `kuerzel` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `Fach_kuerzel_key`(`kuerzel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Benutzer_Fach` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `benutzer_id` INTEGER NOT NULL,
    `fach_id` INTEGER NOT NULL,

    UNIQUE INDEX `Benutzer_Fach_benutzer_id_fach_id_key`(`benutzer_id`, `fach_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Benutzer_Rolle_benutzer_id_rolle_id_key` ON `Benutzer_Rolle`(`benutzer_id`, `rolle_id`);

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_benutzer_id_fkey` FOREIGN KEY (`benutzer_id`) REFERENCES `Benutzer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_rolle_id_fkey` FOREIGN KEY (`rolle_id`) REFERENCES `Rolle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Klasse` ADD CONSTRAINT `Benutzer_Klasse_klasse_id_fkey` FOREIGN KEY (`klasse_id`) REFERENCES `Klasse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Klasse` ADD CONSTRAINT `Benutzer_Klasse_benutzer_id_fkey` FOREIGN KEY (`benutzer_id`) REFERENCES `Benutzer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Fach` ADD CONSTRAINT `Benutzer_Fach_benutzer_id_fkey` FOREIGN KEY (`benutzer_id`) REFERENCES `Benutzer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Fach` ADD CONSTRAINT `Benutzer_Fach_fach_id_fkey` FOREIGN KEY (`fach_id`) REFERENCES `Fach`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
