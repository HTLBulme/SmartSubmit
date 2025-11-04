-- CreateTable
CREATE TABLE `Benutzer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vorname` VARCHAR(255) NOT NULL,
    `nachname` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwort_hash` VARCHAR(255) NOT NULL,
    `erstellt_am` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aktiv` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Benutzer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rolle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bezeichnung` VARCHAR(255) NOT NULL,
    `beschreibung` TEXT NULL,

    UNIQUE INDEX `Rolle_bezeichnung_key`(`bezeichnung`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Benutzer_Rolle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `benutzer_id` INTEGER NOT NULL,
    `rolle_id` INTEGER NOT NULL,

    UNIQUE INDEX `Benutzer_Rolle_benutzer_id_rolle_id_key`(`benutzer_id`, `rolle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `Aufgabe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titel` VARCHAR(255) NOT NULL,
    `beschreibung` TEXT NOT NULL,
    `anhaenge` TEXT NULL,
    `termin` DATETIME(3) NOT NULL,
    `klasse_id` INTEGER NOT NULL,
    `fach_id` INTEGER NOT NULL,
    `lehrer_id` INTEGER NOT NULL,
    `erstellt_am` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Aufgabe_klasse_id_termin_idx`(`klasse_id`, `termin`),
    INDEX `Aufgabe_lehrer_id_idx`(`lehrer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Abgabe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aufgabe_id` INTEGER NOT NULL,
    `schueler_id` INTEGER NOT NULL,
    `dateien` TEXT NULL,
    `abgabe_zeitpunkt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bewertung` INTEGER NULL,
    `feedback` TEXT NULL,

    INDEX `Abgabe_schueler_id_idx`(`schueler_id`),
    UNIQUE INDEX `Abgabe_aufgabe_id_schueler_id_key`(`aufgabe_id`, `schueler_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- AddForeignKey
ALTER TABLE `Aufgabe` ADD CONSTRAINT `Aufgabe_klasse_id_fkey` FOREIGN KEY (`klasse_id`) REFERENCES `Klasse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aufgabe` ADD CONSTRAINT `Aufgabe_fach_id_fkey` FOREIGN KEY (`fach_id`) REFERENCES `Fach`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aufgabe` ADD CONSTRAINT `Aufgabe_lehrer_id_fkey` FOREIGN KEY (`lehrer_id`) REFERENCES `Benutzer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Abgabe` ADD CONSTRAINT `Abgabe_aufgabe_id_fkey` FOREIGN KEY (`aufgabe_id`) REFERENCES `Aufgabe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Abgabe` ADD CONSTRAINT `Abgabe_schueler_id_fkey` FOREIGN KEY (`schueler_id`) REFERENCES `Benutzer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
