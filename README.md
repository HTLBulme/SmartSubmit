# SmartSubmit

Infrastructure setup for the SmartSubmit project. Includes database schema, initialization scripts, local development configuration, and optional Docker support for fast and reproducible deployment.

---

## 💻 Installationen

```bash
# Node.js Installation auf Windows (Winget)
winget install OpenJS.NodeJS.LTS

# Installation der Laufzeit-Abhängigkeiten (Runtime Dependencies)
npm install express prisma @prisma/client bcryptjs jsonwebtoken multer cors dotenv

# Installation der Entwicklungs-Abhängigkeiten (Development Dependencies)
npm install -D nodemon prisma
````

### 🔍 Erklärungen zu den Kern-Tools

| Tool | Beschreibung |
| :--- | :--- |
| `const express = require('express');` | Lädt das **Express-Framework** (Factory Function), um den Webserver zu erstellen. |
| `const cors = require('cors');` | Lädt die **CORS-Middleware** zur Handhabung von Cross-Origin-Anfragen. `const cors` ist eine Factory Function. |
| `const dotenv = require('dotenv');` | Zum Laden von **Umgebungsvariablen** aus `.env` Dateien. |
| `const { PrismaClient } = require('@prisma/client');` | Lädt den **Prisma-Client**, einen ORM (Object-Relational Mapper) als JavaScript-Objekt, für **CRUD-Operationen**. |
| `const bcrypt = require('bcryptjs');` | Wird verwendet, um **Passwörter mit bcrypt zu hashen**. |
| `const jwt = require('jsonwebtoken');` | Wird verwendet, um JSON Web Tokens (**JWT**) für die Authentifizierung zu verarbeiten. |

> Für Datenbank verwende ich **MySql + Prisma**.
> **Prisma** ist ein tolles Gerät, er ermöglicht es, Datenbanken zu manipulieren, als wären sie gewöhnliche JavaScript-Objekte, ohne dabei SQL-Anweisungen schreiben zu müssen.

-----

## 💾 Die Implementierung von Funktionen (Funktionsimplementierung)

### 1\. Registrierung und loggen (Anmeldung)

#### 1.1 Datenmodell

##### 1.1.1 Prisma-Modell

```prisma
model Benutzer {
  id              Int               @id @default(autoincrement())
  vorname         String            @db.VarChar(50)
  nachname        String            @db.VarChar(50)
  email           String            @unique @db.VarChar(100)
  passwort_hash   String            @db.VarChar(255)
  erstellt_am     DateTime          @default(now())
  
  benutzer_rollen BenutzerRolle[]
}

model Rolle {
  id              Int               @id @default(autoincrement())
  bezeichnung     String            @unique @db.VarChar(50)
  beschreibung    String?           @db.Text
  
  benutzer_rollen BenutzerRolle[]
}

model BenutzerRolle {
  id          Int       @id @default(autoincrement())
  benutzer_id Int
  rolle_id    Int
  
  benutzer    Benutzer @relation(fields: [benutzer_id], references: [id])
  rolle       Rolle    @relation(fields: [rolle_id], references: [id])
  
  @@map("Benutzer_Rolle")
}
```

##### 1.1.2 SQL-Modell (von Prisma automatisch generiert)

```sql
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
```

#### 1.2 Implementierung (Ablaufpläne)

##### //**Registrierung**\*

1.  Request-Informationen abrufen
    ↓
2.  Request-Informationen validieren (Format, Pflichtfelder)
    ↓
3.  Datenbankabfrage (prüfen, ob E-Mail bereits existiert)
    ↓
4.  Passwort verschlüsseln (bcrypt)
    ↓
5.  Benutzer erstellen (in Datenbank einfügen)
    ↓
6.  Token generieren (JWT Token)
    ↓
7.  Token und Benutzerinformationen zurückgeben

##### //**Anmeldung**\*

1.  Request-Informationen abrufen
    ↓
2.  Request-Informationen validieren (Format, Pflichtfelder)
    ↓
3.  Datenbankabfrage (Benutzer per E-Mail suchen + Rolleninformationen)
    ↓
4.  Passwort verifizieren (bcrypt.compare)
    ↓
5.  Token generieren (JWT Token)
    ↓
6.  (Optional) Letzten Login-Zeitpunkt aktualisieren
    ↓
7.  Token, Benutzerinformationen und Rolleninformationen zurückgeben

<!-- end list -->

```

