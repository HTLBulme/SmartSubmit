-- CreateTable
CREATE TABLE `Benutzer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vorname` VARCHAR(50) NOT NULL,
    `nachname` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `passwort_hash` VARCHAR(255) NOT NULL,
    `erstellt_am` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Benutzer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rolle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bezeichnung` VARCHAR(50) NOT NULL,
    `beschreibung` TEXT NULL,

    UNIQUE INDEX `Rolle_bezeichnung_key`(`bezeichnung`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Benutzer_Rolle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `benutzer_id` INTEGER NOT NULL,
    `rolle_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_benutzer_id_fkey` FOREIGN KEY (`benutzer_id`) REFERENCES `Benutzer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benutzer_Rolle` ADD CONSTRAINT `Benutzer_Rolle_rolle_id_fkey` FOREIGN KEY (`rolle_id`) REFERENCES `Rolle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
