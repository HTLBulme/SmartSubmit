# SmartSubmit - Aufgabenverwaltungssystem

## Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Funktionen](#funktionen)
3. [Technologie-Stack](#technologie-stack)
4. [Systemarchitektur](#systemarchitektur)
5. [Installation & Einrichtung](#installation--einrichtung)
6. [Entwicklungshandbuch](#entwicklungshandbuch)
7. [Bereitstellung](#bereitstellung)
8. [Benutzerhandbuch](#benutzerhandbuch)
9. [API-Dokumentation](#api-dokumentation)
10. [Datenbankschema](#datenbankschema)
11. [Fehlerbehebung](#fehlerbehebung)
12. [Mitwirken](#mitwirken)

---

## Projektübersicht

**SmartSubmit** ist ein modernes webbasiertes Aufgabenverwaltungssystem für Bildungseinrichtungen. Es ermöglicht Lehrern, Aufgaben zu erstellen und zu verwalten, Schülern, ihre Arbeiten einzureichen, und Administratoren, das gesamte System zu verwalten.

### Hauptziele

- Vereinfachung der Aufgabenverteilung und -abgabe
- Rollenbasierte Zugriffskontrolle (Admin, Lehrer, Schüler)
- Effiziente Dateiverwaltung und Nachverfolgung
- Mehrsprachige Benutzeroberfläche (Deutsch, Englisch, Russisch)

### Projektinformationen

- **Typ:** Diplomarbeitsprojekt
- **Institution:** HTL Bulme
- **Status:** Aktive Entwicklung
- **Lizenz:** Bildungszwecke

---

## Funktionen

### Admin-Funktionen

- Benutzerverwaltung (Massenimport über Excel)
- Import von Schülern und Lehrern aus Excel-Dateien
- Systemkonfiguration und Überwachung
- Rollenzuweisung und Berechtigungen
- Erstmalige Einrichtung

### Lehrer-Funktionen

- Aufgaben mit Dateianhängen erstellen
- Fristen setzen und Klassen zuweisen
- Aufgabenabgaben anzeigen
- Abgabestatistiken verfolgen
- Mehrere Klassen und Fächer verwalten

### Schüler-Funktionen

- Zugewiesene Aufgaben anzeigen
- Aufgaben mit Datei-Uploads einreichen
- Abgabenhistorie verfolgen
- Aufgabendetails und Fristen anzeigen
- Aufgaben nach Klasse und Fach filtern

### Allgemeine Funktionen

- Mehrsprachige Unterstützung (DE, EN, RU)
- Responsive Design (mobil-freundlich)
- Sichere Authentifizierung mit JWT
- Datei-Upload-Unterstützung (mehrere Formate)
- Docker-Bereitstellung verfügbar

---

## Technologie-Stack

### Frontend

- **Framework:** React 18
- **Build-Tool:** Vite
- **Styling:** Bootstrap 5, Eigenes CSS
- **HTTP-Client:** Axios
- **Routing:** React Router DOM
- **State Management:** React Context API

### Backend

- **Laufzeitumgebung:** Node.js 20
- **Framework:** Express.js 5
- **ORM:** Prisma 6
- **Datenbank:** MySQL 8
- **Authentifizierung:** JWT (jsonwebtoken)
- **Passwort-Hashing:** bcryptjs
- **Datei-Upload:** Multer
- **Excel-Verarbeitung:** xlsx

### DevOps

- **Containerisierung:** Docker, Docker Compose
- **Datenbankverwaltung:** Prisma Studio
- **Entwicklung:** Nodemon, Vite Dev Server
- **Versionskontrolle:** Git

---

## Systemarchitektur

### Hochstufige Architektur

```
┌─────────────────────────────────────────────────────┐
│                  Client-Browser                      │
│              (React SPA auf Port 5173/8080)         │
└─────────────────────────────────────────────────────┘
                          │
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────┐
│                  Express.js Backend                  │
│                    (Port 3000/8080)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │  Routen (Login, Register, Admin, Lehrer,       │ │
│  │          Schüler, Klassen, Fächer)             │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Controller (Geschäftslogik)                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Middleware (Auth, Datei-Upload)               │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  Prisma ORM (Datenbankzugriff)                 │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          │ MySQL-Protokoll
                          ▼
┌─────────────────────────────────────────────────────┐
│                  MySQL-Datenbank                     │
│                    (Port 3306/3307)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │  Tabellen: Benutzer, Rolle, Klasse, Fach,     │ │
│  │            Aufgabe, Abgabe                     │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Projektstruktur

```
SmartSubmit/
├── frontend/                  # React-Frontend-Anwendung
│   ├── src/
│   │   ├── pages/            # Seitenkomponenten
│   │   │   ├── login.jsx
│   │   │   ├── register.jsx
│   │   │   ├── admin.jsx
│   │   │   ├── teacher.jsx
│   │   │   └── student.jsx
│   │   ├── context/          # React Context
│   │   │   └── LanguageContext.jsx
│   │   ├── i18n/             # Übersetzungen
│   │   │   └── index.js
│   │   ├── App.jsx           # Hauptkomponente
│   │   └── main.jsx          # Einstiegspunkt
│   ├── public/               # Statische Ressourcen
│   ├── package.json
│   └── vite.config.js
│
├── backend/                   # Node.js-Backend-Anwendung
│   ├── src/                  # Refaktorierte modulare Struktur
│   │   ├── controllers/      # Geschäftslogik
│   │   │   ├── login.controller.js
│   │   │   ├── register.controller.js
│   │   │   ├── admin.controller.js
│   │   │   ├── teacher.controller.js
│   │   │   └── student.controller.js
│   │   ├── main.js           # Server-Einstiegspunkt
│   │   ├── app.config.js     # Konfiguration & Prisma
│   │   ├── app.routes.js     # Routendefinitionen
│   │   ├── app.middleware.js # Authentifizierungs-Middleware
│   │   └── app.utils.js      # Hilfsfunktionen
│   ├── prisma/               # Datenbankschema & Migrationen
│   │   ├── schema.prisma     # Datenbankschema
│   │   ├── migrations/       # Migrationshistorie
│   │   └── seed.js           # Datenbank-Seeding
│   ├── uploads/              # Datei-Upload-Verzeichnis
│   │   └── assignments/      # Aufgabendateien
│   ├── package.json
│   └── .env                  # Umgebungsvariablen
│
├── docker-compose.yml        # Docker-Orchestrierung
├── Dockerfile                # Backend-Container-Definition
└── README.md
```

---

## Installation & Einrichtung

### Voraussetzungen

- **Node.js:** 20.x oder höher
- **MySQL:** 8.0 oder höher
- **npm:** 10.x oder höher
- **Docker:** 24.x oder höher (für containerisierte Bereitstellung)
- **Git:** Für Versionskontrolle

### Lokale Entwicklungsumgebung

#### 1. Repository klonen

```bash
git clone https://github.com/htlbulme/smartsubmit.git
cd SmartSubmit
```

#### 2. Backend einrichten

```bash
cd backend

# Abhängigkeiten installieren
npm install

# .env-Datei erstellen
cat > .env << 'EOF'
DATABASE_URL="mysql://smartsubmit:smartsubmit123@localhost:3306/smartsubmit"
JWT_SECRET=ihr-geheimer-schluessel-hier-aendern
PORT=3000
HOST=0.0.0.0
IS_DOCKER=false
DEFAULT_ADMIN_EMAIL=admin@smartsubmit.com
DEFAULT_ADMIN_PASSWORD=admin123
EOF

# MySQL-Datenbank erstellen
mysql -u root -p << 'SQL'
CREATE DATABASE smartsubmit;
CREATE USER 'smartsubmit'@'localhost' IDENTIFIED BY 'smartsubmit123';
GRANT ALL PRIVILEGES ON smartsubmit.* TO 'smartsubmit'@'localhost';
FLUSH PRIVILEGES;
SQL

# Prisma-Migrationen ausführen
npx prisma generate
npx prisma migrate deploy

# Datenbank befüllen
npm run seed

# Backend-Server starten
npm start
```

Backend läuft auf `http://localhost:3000`

#### 3. Frontend einrichten

```bash
cd ../frontend

# Abhängigkeiten installieren
npm install

# .env-Datei für Entwicklung erstellen
cat > .env.development << 'EOF'
VITE_API_URL=http://localhost:3000
EOF

# Entwicklungsserver starten
npm run dev
```

Frontend läuft auf `http://localhost:5173`

#### 4. Anwendung aufrufen

Öffnen Sie Ihren Browser und navigieren Sie zu:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

**Standard-Admin-Zugangsdaten:**
- E-Mail: `admin@smartsubmit.com`
- Passwort: `admin123`

**Ändern Sie das Standardpasswort sofort nach der ersten Anmeldung!**

---

## Entwicklungshandbuch

### Im Entwicklungsmodus ausführen

#### Frontend und Backend starten

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### Oder gleichzeitiger Modus verwenden

```bash
# Vom Frontend-Verzeichnis
npm run dev
# Dies führt Frontend und Backend gleichzeitig aus
```

### Datenbankverwaltung

#### Datenbank mit Prisma Studio anzeigen

```bash
cd backend
npx prisma studio
```

Öffnet Browser unter `http://localhost:5555` mit visuellem Datenbankeditor.

#### Neue Migration erstellen

```bash
cd backend

# 1. schema.prisma bearbeiten
# 2. Migration erstellen
npx prisma migrate dev --name ihre_migrations_name

# 3. Prisma Client generieren
npx prisma generate
```

#### Datenbank zurücksetzen

```bash
cd backend

# Warnung: Dies löscht alle Daten!
npx prisma migrate reset
```

### Neue Funktionen hinzufügen

#### 1. Neuen API-Endpunkt hinzufügen

**backend/src/controllers/beispiel.controller.js:**
```javascript
const beispielFunktion = async (req, res) => {
  try {
    // Ihre Logik hier
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler' });
  }
};

module.exports = { beispielFunktion };
```

**backend/src/app.routes.js:**
```javascript
const beispielController = require('./controllers/beispiel.controller');

router.get('/beispiel', authenticateToken, beispielController.beispielFunktion);
```

#### 2. Neue Frontend-Seite hinzufügen

**frontend/src/pages/beispiel.jsx:**
```javascript
import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Beispiel() {
  const [daten, setDaten] = useState(null);

  const datenAbrufen = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/api/beispiel`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDaten(response.data);
  };

  return (
    <div>
      <h1>Beispielseite</h1>
      <button onClick={datenAbrufen}>Daten abrufen</button>
    </div>
  );
}
```

**frontend/src/App.jsx:**
```javascript
import Beispiel from './pages/beispiel';

// Route hinzufügen
<Route path="/beispiel" element={<Beispiel />} />
```

### Code-Stil-Richtlinien

- ES6+-Funktionen verwenden (const, Pfeilfunktionen, async/await)
- CamelCase für Variablen und Funktionen
- PascalCase für React-Komponenten
- Kommentare für komplexe Logik hinzufügen
- Funktionen klein und fokussiert halten
- Fehler ordnungsgemäß mit try-catch behandeln

---

## Bereitstellung

### Docker-Bereitstellung (Empfohlen)

#### 1. Umgebung vorbereiten

**.env-Datei für Produktion erstellen:**

```bash
cat > backend/.env << 'EOF'
DATABASE_URL="mysql://smartsubmit:smartsubmit123@db:3306/smartsubmit"
MYSQL_USER=smartsubmit
MYSQL_PASSWORD=SicheresPasswort123!
MYSQL_DATABASE=smartsubmit
MYSQL_ROOT_PASSWORD=RootPasswort123!
JWT_SECRET=produktions-geheimer-schluessel-aendern
DEFAULT_ADMIN_EMAIL=admin@ihre-domain.com
DEFAULT_ADMIN_PASSWORD=SicheresAdminPasswort123!
EOF
```

#### 2. Erstellen und Bereitstellen

```bash
# Container erstellen und starten
docker compose build --no-cache
docker compose up -d

# Überprüfen, ob Container laufen
docker compose ps

# Logs überprüfen
docker compose logs -f backend
```

#### 3. Anwendung aufrufen

- Anwendung: `http://ihre-server-ip:8080`
- MySQL (externer Zugriff): `ihre-server-ip:3307`

#### 4. Nach der Bereitstellung

1. Anwendung aufrufen
2. Mit Standard-Admin-Zugangsdaten anmelden
3. **Admin-Passwort sofort ändern!**
4. Firewall konfigurieren, um Port 8080 zuzulassen:
   ```bash
   sudo ufw allow 8080/tcp
   ```

### Produktionsserver-Einrichtung (Oracle Cloud Beispiel)

#### 1. Server-Vorbereitung

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo apt install docker-compose -y

# Docker aktivieren, um beim Booten zu starten
sudo systemctl enable docker

# Benutzer zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER
```

#### 2. Klonen und Bereitstellen

```bash
# Repository klonen
git clone https://github.com/htlbulme/smartsubmit.git
cd SmartSubmit

# Produktions-.env erstellen
nano backend/.env
# Produktionszugangsdaten hinzufügen

# Bereitstellen
docker compose build --no-cache
docker compose up -d

# Automatischen Neustart nach Neustart aktivieren
# (Bereits mit restart: always in docker-compose.yml konfiguriert)
```

#### 3. Firewall konfigurieren

```bash
# HTTP zulassen
sudo ufw allow 8080/tcp

# Firewall aktivieren
sudo ufw enable

# Status überprüfen
sudo ufw status
```

#### 4. Automatischen Neustart einrichten (Optional)

```bash
# Crontab bearbeiten
sudo crontab -e

# Täglichen Neustart um 3 Uhr hinzufügen
0 3 * * * /sbin/reboot

# Docker startet Container nach Neustart automatisch neu
```

### Umgebungsspezifische Konfiguration

#### Entwicklung (.env.development)

```env
VITE_API_URL=http://localhost:3000
```

#### Produktion (.env.production)

```env
VITE_API_URL=
# Leer = verwendet denselben Ursprung (relative URLs)
```

---

## Benutzerhandbuch

### Für Administratoren

#### 1. Erste Anmeldung

1. Zur Anwendungs-URL navigieren
2. Auf "Login" klicken
3. Admin-Zugangsdaten eingeben:
   - E-Mail: `admin@smartsubmit.com`
   - Passwort: `admin123`
4. **Passwort sofort ändern!**

#### 2. Schüler importieren

1. Excel-Datei mit Spalten vorbereiten:
   - `vorname` (Vorname)
   - `nachname` (Nachname)
   - `email` (E-Mail)
   - `klasse` (Klasse, z.B. "5A" oder mehrere: "5A,5B")
   - `jahrgang` (Jahr, z.B. 2025)

2. Zum Admin-Panel gehen
3. "Schüler" auswählen
4. Auf "Datei auswählen" klicken und Excel auswählen
5. Auf "Daten hochladen" klicken

**Beispiel-Excel:**

| vorname | nachname | email | klasse | jahrgang |
|---------|----------|-------|--------|----------|
| Max | Mustermann | max@schule.com | 5A | 2025 |
| Anna | Schmidt | anna@schule.com | 5B | 2025 |

#### 3. Lehrer importieren

1. Excel-Datei mit Spalten vorbereiten:
   - `vorname` (Vorname)
   - `nachname` (Nachname)
   - `email` (E-Mail)
   - `klasse` (Klasse, optional)
   - `jahrgang` (Jahr, optional)
   - `fach_kuerzel` (Fachkürzel, z.B. "MATH,DE")

2. Zum Admin-Panel gehen
3. "Lehrer" auswählen
4. Auf "Datei auswählen" klicken und Excel auswählen
5. Auf "Daten hochladen" klicken

**Anfangspasswörter:** `vorname nachname` (kleingeschrieben)

Beispiel: Max Mustermann → Passwort: `maxmustermann`

**Benutzer müssen Passwort bei erster Anmeldung ändern!**

### Für Lehrer

#### 1. Aufgabe erstellen

1. Mit Lehrer-Zugangsdaten anmelden
2. Klasse aus Dropdown auswählen
3. Fach auswählen
4. Aufgabentitel eingeben
5. Aufgabenbeschreibung schreiben
6. (Optional) Dateien hochladen (PDF, DOCX, etc.)
7. Frist festlegen
8. Auf "Aufgabe speichern" klicken

#### 2. Aufgaben anzeigen

1. Auf "Aufgabenliste" klicken
2. Alle erstellten Aufgaben anzeigen
3. Abgabenanzahl sehen
4. Frist-Status überprüfen (aktiv/abgelaufen)

#### 3. Abgaben anzeigen

1. Aufgabe in Liste finden
2. Auf "Abgabenliste" klicken
3. Schülerabgaben anzeigen
4. Eingereichte Dateien herunterladen

### Für Schüler

#### 1. Aufgaben anzeigen

1. Mit Schüler-Zugangsdaten anmelden
2. Alle Aufgaben für Ihre Klassen sehen
3. Nach Frist oder Fach filtern
4. Aufgabendetails anzeigen

#### 2. Aufgabe einreichen

1. Auf Aufgabe klicken
2. Abgabetext schreiben
3. Dateien hochladen, falls erforderlich
4. Auf "Abgeben" klicken
5. Bestätigungsmeldung erscheint

#### 3. Abgaben verfolgen

1. Zu "Meine Abgaben" gehen
2. Abgabenhistorie anzeigen
3. Abgabestatus überprüfen
4. Eingereichte Dateien herunterladen

---

## API-Dokumentation

### Authentifizierung

Alle authentifizierten Endpunkte erfordern JWT-Token im Header:

```
Authorization: Bearer <token>
```

### Öffentliche Endpunkte

#### Admin-Existenz überprüfen

```http
GET /api/admin/check
```

**Antwort:**
```json
{
  "success": true,
  "adminExists": true
}
```

#### Registrieren (Nur erster Admin)

```http
POST /api/register
Content-Type: application/json

{
  "email": "admin@beispiel.com",
  "password": "passwort123",
  "roleId": 3
}
```

**Antwort:**
```json
{
  "success": true,
  "message": "Registrierung erfolgreich",
  "data": {
    "user": {...},
    "token": "eyJhbGc..."
  }
}
```

#### Anmelden

```http
POST /api/login
Content-Type: application/json

{
  "email": "benutzer@beispiel.com",
  "passwort": "passwort123",
  "role": "Admin"
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "vorname": "Admin",
      "nachname": "System",
      "email": "admin@beispiel.com",
      "roles": [...]
    },
    "token": "eyJhbGc..."
  }
}
```

### Admin-Endpunkte

#### Schüler importieren

```http
POST /api/admin/import/students
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

file: <excel-datei>
```

**Antwort:**
```json
{
  "success": true,
  "message": "5 Schüler importiert, 0 fehlgeschlagen",
  "data": {
    "success": [...],
    "failed": []
  }
}
```

#### Lehrer importieren

```http
POST /api/admin/import/teachers
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

file: <excel-datei>
```

### Lehrer-Endpunkte

#### Aufgabe erstellen

```http
POST /api/teacher/assignments
Authorization: Bearer <lehrer-token>
Content-Type: multipart/form-data

class: "5A"
subject: "Mathematik"
title: "Hausaufgabe 1"
text: "Übungen 1-10 ausfüllen"
dueDate: "2025-12-31"
files: <datei1>, <datei2>
```

**Antwort:**
```json
{
  "success": true,
  "message": "Aufgabe erfolgreich erstellt",
  "data": {
    "id": 1,
    "titel": "Hausaufgabe 1",
    ...
  }
}
```

#### Lehrer-Aufgaben abrufen

```http
GET /api/teacher/assignments
Authorization: Bearer <lehrer-token>
```

**Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "titel": "Hausaufgabe 1",
      "klasse": "5A",
      "fach": "Mathematik",
      "termin": "2025-12-31",
      "status": "active",
      "abgabenCount": 3
    }
  ]
}
```

### Schüler-Endpunkte

#### Aufgaben abrufen

```http
GET /api/student/assignments
Authorization: Bearer <schueler-token>
```

**Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "titel": "Hausaufgabe 1",
      "beschreibung": "Übungen 1-10 ausfüllen",
      "termin": "2025-12-31",
      "klasse": {...},
      "fach": {...},
      "lehrer": {...}
    }
  ]
}
```

#### Aufgabe einreichen

```http
POST /api/student/submit
Authorization: Bearer <schueler-token>
Content-Type: multipart/form-data

assignmentId: 1
text: "Meine Abgabe"
files: <datei1>, <datei2>
```

### Hilfs-Endpunkte

#### Klassen abrufen

```http
GET /api/classes
Authorization: Bearer <token>
```

**Antwort:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "5A",
      "jahrgang": 2025
    }
  ]
}
```

#### Fächer abrufen

```http
GET /api/subjects
Authorization: Bearer <token>
```

**Antwort:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Mathematik",
      "kuerzel": "MATH"
    }
  ]
}
```

---

## Datenbankschema

### Entity-Relationship-Diagramm

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Benutzer  │       │    Rolle    │       │   Klasse    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ vorname     │       │ bezeichnung │       │ name        │
│ nachname    │       │ beschreibung│       │ jahrgang    │
│ email (UQ)  │       └─────────────┘       └─────────────┘
│ passwort    │              ▲                     ▲
│ erstellt_am │              │                     │
│ aktiv       │              │                     │
└─────────────┘              │                     │
      │                      │                     │
      ├──────────────────────┼─────────────────────┤
      ▼                      ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Benutzer_Rolle│    │Benutzer_Fach │    │Benutzer_Klasse│
├──────────────┤    ├──────────────┤    ├──────────────┤
│ id (PK)      │    │ id (PK)      │    │ id (PK)      │
│ benutzer_id  │    │ benutzer_id  │    │ benutzer_id  │
│ rolle_id     │    │ fach_id      │    │ klasse_id    │
└──────────────┘    └──────────────┘    └──────────────┘
                            ▲
                            │
                    ┌───────────────┐
                    │     Fach      │
                    ├───────────────┤
                    │ id (PK)       │
                    │ name          │
                    │ kuerzel (UQ)  │
                    └───────────────┘

┌─────────────┐              ┌─────────────┐
│   Aufgabe   │              │   Abgabe    │
├─────────────┤              ├─────────────┤
│ id (PK)     │◄─────────────│ aufgabe_id  │
│ titel       │              │ schueler_id │
│ beschreibung│              │ dateien     │
│ anhaenge    │              │ zeitpunkt   │
│ termin      │              │ bewertung   │
│ klasse_id   │              │ feedback    │
│ fach_id     │              └─────────────┘
│ lehrer_id   │
│ erstellt_am │
└─────────────┘
```

### Tabellenbeschreibungen

#### Benutzer

Speichert alle Systembenutzer (Administratoren, Lehrer, Schüler).

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel |
| vorname | VARCHAR(255) | Vorname |
| nachname | VARCHAR(255) | Nachname |
| email | VARCHAR(255) | Eindeutige E-Mail-Adresse |
| passwort_hash | VARCHAR(255) | Gehashtes Passwort |
| erstellt_am | DATETIME | Erstellungszeitstempel |
| aktiv | BOOLEAN | Aktiv-Status |

#### Rolle

Definiert Benutzerrollen im System.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel (1=Schüler, 2=Lehrer, 3=Admin) |
| bezeichnung | VARCHAR(255) | Rollenname |
| beschreibung | TEXT | Rollenbeschreibung |

#### Klasse

Speichert Schulklassen.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel |
| name | VARCHAR(50) | Klassenname (z.B. "5A") |
| jahrgang | INT | Jahr (z.B. 2025) |

**Eindeutige Einschränkung:** (name, jahrgang)

#### Fach

Speichert Schulfächer.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel |
| name | VARCHAR(255) | Fachname |
| kuerzel | VARCHAR(255) | Fachkürzel (eindeutig) |

#### Aufgabe

Speichert von Lehrern erstellte Aufgaben.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel |
| titel | VARCHAR(255) | Aufgabentitel |
| beschreibung | TEXT | Aufgabenbeschreibung |
| anhaenge | TEXT | Angehängte Dateien (JSON) |
| termin | DATETIME | Fälligkeitsdatum |
| klasse_id | INT | Fremdschlüssel zu Klasse |
| fach_id | INT | Fremdschlüssel zu Fach |
| lehrer_id | INT | Fremdschlüssel zu Benutzer (Lehrer) |
| erstellt_am | DATETIME | Erstellungszeitstempel |

#### Abgabe

Speichert Schülerabgaben.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | INT | Primärschlüssel |
| aufgabe_id | INT | Fremdschlüssel zu Aufgabe |
| schueler_id | INT | Fremdschlüssel zu Benutzer (Schüler) |
| dateien | TEXT | Eingereichte Dateien (JSON) |
| abgabe_zeitpunkt | DATETIME | Abgabezeitstempel |
| bewertung | INT | Note (0-100) |
| feedback | TEXT | Lehrer-Feedback |

**Eindeutige Einschränkung:** (aufgabe_id, schueler_id)

---

## Fehlerbehebung

### Häufige Probleme

#### 1. Port-Konflikte

**Problem:** "Port 3306 bereits in Verwendung"

**Lösung:**
```bash
# Für lokale Entwicklung: Docker-MySQL-Port ändern
# docker-compose.yml bearbeiten:
ports:
  - "3307:3306"  # Port 3307 extern verwenden
```

#### 2. Prisma Client nicht generiert

**Problem:** "Modul '@prisma/client' kann nicht gefunden werden"

**Lösung:**
```bash
cd backend
npx prisma generate
npm start
```

#### 3. Upload schlägt in Docker fehl

**Problem:** "Serverfehler" beim Hochladen von Dateien

**Lösungen:**
- Frontend-API-URL prüfen (leer für Docker)
- Frontend neu erstellen: `npm run build`
- Docker neu erstellen: `docker compose build --no-cache`
- Browser-Cache löschen und erneut anmelden

#### 4. Datenbankverbindung fehlgeschlagen

**Problem:** "Kann Datenbankserver nicht erreichen"

**Lösung:**
```bash
# Datenbank läuft prüfen
docker compose ps

# Logs prüfen
docker compose logs db

# Datenbank neu starten
docker compose restart db
```

#### 5. 403 Forbidden auf Admin-Routen

**Problem:** "Nur für Admins"-Fehler

**Lösung:**
- Admin-Benutzer in Docker-Datenbank erstellen
- Erneut anmelden, um neues Token zu erhalten
- Admin-Rolle in Datenbank prüfen:
  ```bash
  docker compose exec backend npx prisma studio
  # BenutzerRolle-Tabelle für rolle_id: 3 prüfen
  ```

### Docker-Probleme

#### Container wird ständig neu gestartet

**Logs prüfen:**
```bash
docker compose logs backend --tail 100
```

**Häufige Ursachen:**
- Datenbankverbindung fehlgeschlagen → DATABASE_URL prüfen
- Prisma Client nicht generiert → Build-Logs prüfen
- Port bereits in Verwendung → Port in docker-compose.yml ändern

#### Build schlägt fehl

**Docker-Cache löschen:**
```bash
docker compose down
docker system prune -af
docker compose build --no-cache
docker compose up -d
```

#### Volume-Berechtigungsprobleme

**Berechtigungen korrigieren:**
```bash
docker compose exec backend chown -R node:node /app/backend/uploads
docker compose restart backend
```

### Frontend-Probleme

#### Leere Seite nach Build

**Konsole auf Fehler prüfen:**
1. Browser-DevTools öffnen (F12)
2. Konsolen-Tab auf Fehler prüfen
3. Häufige Probleme:
   - Fehlende API_URL → .env-Datei prüfen
   - CORS-Fehler → Backend-CORS-Einstellungen prüfen
   - Build-Fehler → `npm run build`-Ausgabe prüfen

#### API-Anfragen schlagen fehl

**Netzwerk-Tab prüfen:**
1. DevTools öffnen (F12) → Netzwerk-Tab
2. Aktion ausführen, die fehlschlägt
3. Prüfen:
   - Anfrage-URL (sollte Backend entsprechen)
   - Status-Code (401, 403, 500, etc.)
   - Antwortinhalt (Fehlermeldung)

### Datenbankprobleme

#### Migration fehlgeschlagen

**Datenbank zurücksetzen:**
```bash
cd backend
npx prisma migrate reset
# Dies löscht alle Daten!
```

#### Seed fehlgeschlagen

**Manueller Seed:**
```bash
cd backend
npm run seed
```

**Seed-Logs prüfen:**
```bash
docker compose logs backend | grep -i seed
```

---

## Mitwirken

### Entwicklungsablauf

1. **Repository forken**
2. **Feature-Branch erstellen:**
   ```bash
   git checkout -b feature/ihr-feature-name
   ```
3. **Änderungen vornehmen**
4. **Gründlich testen:**
   - Lokal testen (`npm run dev`)
   - In Docker testen (`docker compose up -d --build`)
5. **Änderungen committen:**
   ```bash
   git add .
   git commit -m "Add: Ihre Feature-Beschreibung"
   ```
6. **Zu Ihrem Fork pushen:**
   ```bash
   git push origin feature/ihr-feature-name
   ```
7. **Pull Request erstellen**

### Code-Review-Checkliste

- [ ] Code folgt Projekt-Stil-Richtlinien
- [ ] Alle Tests bestanden
- [ ] Keine console.log im Produktionscode
- [ ] Fehlerbehandlung implementiert
- [ ] Kommentare für komplexe Logik hinzugefügt
- [ ] Dokumentation aktualisiert
- [ ] Keine sensiblen Daten im Code
- [ ] Funktioniert sowohl in Entwicklung als auch in Docker

### Testen

Vor dem Einreichen:

```bash
# Backend testen
cd backend
npm test

# Frontend-Build testen
cd frontend
npm run build

# Docker-Bereitstellung testen
docker compose build --no-cache
docker compose up -d
docker compose logs backend
```

---

## Lizenz

Dieses Projekt wird als Diplomarbeit für Bildungszwecke an der HTL Bulme entwickelt.

**Nur für Bildungszwecke.** Kommerzielle Nutzung ist ohne Genehmigung nicht gestattet.

---

## Kontakt & Support

### Projektteam

- **Institution:** HTL Bulme
- **Projekttyp:** Diplomarbeit
- **Repository:** https://github.com/htlbulme/smartsubmit

### Hilfe erhalten

1. **Dokumentation prüfen:** Dieses README und Fehlerbehebungsabschnitt lesen
2. **Issues prüfen:** Bestehende GitHub-Issues durchsuchen
3. **Issue erstellen:** Bei anhaltendem Problem neues Issue erstellen mit:
   - Detaillierter Beschreibung
   - Schritten zur Reproduktion
   - Fehlermeldungen/Logs
   - Umgebungsdetails (OS, Node-Version, etc.)

### Fehler melden

**Beinhalten:**
- Erwartetes Verhalten
- Tatsächliches Verhalten
- Schritte zur Reproduktion
- Screenshots falls zutreffend
- Fehler-Logs
- Systeminformationen

---

## Änderungsprotokoll

### Version 1.0.0 (Aktuell)

**Funktionen:**
- Benutzerauthentifizierung und -autorisierung
- Rollenbasierte Zugriffskontrolle
- Admin-Panel mit Excel-Import
- Lehrer-Aufgabenerstellung
- Schüler-Aufgabenanzeige
- Datei-Upload-Unterstützung
- Mehrsprachige Oberfläche (DE, EN, RU)
- Docker-Bereitstellung
- Responsive Design

**Bekannte Einschränkungen:**
- Schülerabgabefunktionalität (in Arbeit)
- Aufgabenbewertung (geplant)
- E-Mail-Benachrichtigungen (geplant)
- Erweiterte Berichterstattung (geplant)

---

## Danksagungen

- **HTL Bulme** für Projektunterstützung
- **Prisma** für ausgezeichnetes ORM
- **React** und **Vite** Teams
- **Express.js** Community
- Alle Mitwirkenden und Tester

---

**Letzte Aktualisierung:** Januar 2026  
**Version:** 1.0.0  
**Status:** Aktive Entwicklung
