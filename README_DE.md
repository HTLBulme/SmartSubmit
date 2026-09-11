# SmartSubmit

SmartSubmit ist eine Anwendung zur Aufgabenverwaltung für Schulen: Administratoren verwalten Konten und Importe, Lehrkräfte erstellen und bewerten Aufgaben, Schüler reichen Text oder Dateien ein.

## Start und Technologie

Frontend: React, Vite, Bootstrap und Axios in `frontend/`. Backend: Express 5, Prisma 6 und MySQL 8 in `backend/`. Voraussetzungen sind Node.js 20+, npm sowie MySQL 8 oder Docker.

```bash
git clone https://github.com/HTLBulme/SmartSubmit.git
cd SmartSubmit
cd backend
npm install
cp .env.example .env
# DATABASE_URL, JWT_SECRET und optionale Provider lokal setzen
npx prisma generate
npx prisma migrate deploy
npm start

# zweites Terminal
cd frontend
npm install
echo VITE_API_URL=http://localhost:3000 > .env.development
npm run dev
```

API: `http://localhost:3000/api`; Entwicklungs-Frontend: `http://localhost:5173`. `npm run seed` ist ein bewusster Entwicklungsschritt, kein normaler Start. `npx prisma migrate reset` ist destruktiv.

## Konfiguration und Anmeldung

`backend/.env.example` als Vorlage verwenden und `.env` nie committen. Datenbankpasswörter, `JWT_SECRET`, Google-Client-Secret, SMTP-Passwort und LDAP-Bind-Passwort gehören nur in lokale bzw. Deployment-Secrets.

Google OAuth benötigt `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` und `GOOGLE_CALLBACK_URL` oder `GOOGLE_REDIRECT_URI`. Die Anmeldung findet ein Konto über Google-ID oder E-Mail. Ein bestehendes SmartSubmit-Konto derselben E-Mail wird verknüpft; neue Konten werden nicht erzeugt. Rollen, Klassen und Fächer bleiben in SmartSubmit verwaltet.

Vor der Anmeldung wird keine Rolle gewählt. Erst lokale, Google- oder LDAP-Authentifizierung liefert die zugewiesenen SmartSubmit-Rollen. Das JWT enthält nur die interne `userId` und ist sieben Tage gültig. Bei einer Rolle öffnet der Client direkt den Bereich, bei mehreren zeigt er nur zugewiesene Rollen und bestätigt die Wahl mit `POST /api/auth/select-role`; ohne Rolle endet die Anmeldung mit einer Fehlermeldung. Die aktive Rolle liegt danach pro Tab in `sessionStorage`, nicht im JWT.

### LDAP für Lehrkräfte

LDAP-Login für Lehrkräfte ist implementiert und standardmäßig deaktiviert:

```env
LDAP_TEACHER_LOGIN_ENABLED=false
LDAP_HOST=
LDAP_PORT=389
LDAP_URL=
LDAP_TEACHER_BASE_DN=
LDAP_LOGIN_ATTRIBUTE=uid
LDAP_BIND_MODE=anonymous
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=
LDAP_CONNECT_TIMEOUT_MS=5000
LDAP_OPERATION_TIMEOUT_MS=8000
LDAP_SEARCH_SIZE_LIMIT=2
LDAP_LINK_EXISTING_TEACHER_BY_EMAIL=false
```

`LDAP_URL` überschreibt Host/Port. Der Server durchsucht den Lehrkräfte-Base-DN rekursiv nach `LDAP_LOGIN_ATTRIBUTE` (standardmäßig `uid`) und prüft anschließend das Passwort durch Bind als gefundener Benutzer. `LDAP_BIND_MODE` ist `anonymous` oder `service`; der Service-Modus benötigt Bind-DN und -Passwort. Die E-Mail-Verknüpfung erlaubt nur ein bestehendes lokales Teacher-Konto mit derselben verifizierten LDAP-E-Mail.

LDAP-Konten besitzen kein lokales SmartSubmit-Passwort; eine Passwortänderung wird abgelehnt. Die LDAP-Integration ist implementiert/vorbereitet, wurde jedoch noch nicht gegen die Produktions-LDAP-Umgebung der Schule validiert.

Bestätigungen von Abgaben, Bewertungs-/Feedback-Benachrichtigungen und Erinnerungen verwenden `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD` (oder `EMAIL_PASS`) und `EMAIL_FROM`.
`PORT` und `HOST` sind optionale Server-Overrides; standardmäßig werden `3000` und `0.0.0.0` verwendet. `TRUST_PROXY` nur hinter einem bekannten Proxy mit expliziten IPs/CIDRs oder `loopback`, `linklocal`, `uniquelocal` setzen.

## Administration und Import

Administratoren können Schüler und Lehrkräfte anlegen, bearbeiten und löschen. Erforderlich sind Vorname, Nachname und E-Mail. Schüler können mehreren Klassen, Lehrkräfte mehreren Klassen und vorhandenen Fächern zugeordnet werden. Das Initialpasswort eines manuell angelegten Kontos ist Vorname plus Nachname in Kleinbuchstaben.

Importe akzeptieren XLSX und ODS, lesen das erste Tabellenblatt und haben ein Limit von **5 MiB**.

| Import | Erforderliche Spalten | Anforderungen |
| --- | --- | --- |
| Schüler | `vorname`, `nachname`, `email`, `klasse`, `jahrgang` | Alle erforderlich; `klasse` darf kommasepariert sein; `jahrgang` ist ein vierstelliges Startjahr. |
| Lehrkräfte | `vorname`, `nachname`, `email`, `klasse`, `jahrgang`, `fach_kuerzel` | Name/E-Mail erforderlich; `klasse` und `jahrgang` beide leer oder beide gesetzt; `fach_kuerzel` darf leer sein und unterstützt Kommata. |

Die UI zeigt ein gespeichertes/importiertes Jahr `2026` als `2026/27`; die API nimmt das vierstellige Startjahr an. Der Import findet Benutzer per normalisierter E-Mail, aktualisiert bestehende Benutzer, setzt die Rolle und synchronisiert importierte Klassen. Bei Lehrkräften werden Fachverknüpfungen auf die gelieferten Kürzel synchronisiert; ein leeres `fach_kuerzel` entfernt bestehende Verknüpfungen. Fehlende Klassen/Fächer werden angelegt. Ergebnisse enthalten `created`, `updated`, `success` und `failed`.

## Abgaben und Uploads

Die Aufgabenliste liefert `studentCount`, `submittedCount` und `missingCount` sowie das ältere `submissionsCount` (gleich `submittedCount`). Die Abgabenansicht zeigt die vollständige Klassenliste mit Abgegeben/Nicht abgegeben und den Filtern Alle, Abgegeben und Nicht abgegeben.

Lehrkräfte können vorhandene Abgaben mit herunterladbaren Dateien auswählen und als ZIP exportieren. Das ZIP einer ganzen Aufgabe enthält verfügbare Dateien und `submission_log.csv`. Erinnerungen gehen nur an ausgewählte Schüler, die noch in der Aufgabenklasse sind, die Student-Rolle besitzen und noch nicht abgegeben haben. Noten sind ganze Zahlen von 0 bis 100.

Aufgaben- und Abgabe-Uploads erlauben 10 Dateien pro Request mit jeweils 10 MiB. Zulässige Endungen (oder keine Endung): `jpeg`, `jpg`, `png`, `gif`, `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ods`, `ppt`, `pptx`, `txt`, `md`, `zip`, `rar`. Das ist nur eine Endungsprüfung.

## API und Deployment

Geschützte Routen benötigen `Authorization: Bearer <token>`. Antworten enthalten meist `success`; Datenfelder unterscheiden sich je Endpoint.

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `POST` | `/api/login` | Lokal `{ email, password, loginMethod: "local" }`; LDAP `{ identifier, password, loginMethod: "ldap" }`. |
| `GET` | `/api/auth/google`, `/api/auth/google/callback` | Google OAuth. |
| `POST` | `/api/auth/select-role` | Authentifiziert `{ role }`, nur zugewiesene Rolle. |
| `GET` / `POST` | `/api/admin/check`, `/api/register` | Öffentlicher Admin-Check / erster Admin. |
| `POST` | `/api/admin/import/students`, `/api/admin/import/teachers` | Admin, multipart `file`. |
| `GET/POST/PATCH` | `/api/admin/students`, `/api/admin/students/:id` | Admin Schüler. |
| `GET/POST/PATCH` | `/api/admin/teachers`, `/api/admin/teachers/:id` | Admin Lehrkräfte. |
| `GET` / `DELETE` | `/api/admin/classes`, `/api/admin/subjects`, `/api/admin/users/:id` | Admin-Stammdaten / Löschen. |
| `POST/GET/DELETE` | `/api/teacher/assignments`, `/api/teacher/assignments/:assignmentId` | Aufgaben anlegen/listen/löschen. |
| `GET` | `/api/teacher/assignments/:assignmentId/submissions`, `/download`, `/log` | Abgaben, ZIP, CSV-Log. |
| `POST` | `/api/teacher/assignments/:assignmentId/reminders` | `{ userIds: number[] }`. |
| `PATCH` | `/api/teacher/assignments/:assignmentId/archive`, `/api/teacher/submissions/:submissionId` | Archiv `{ archived }`, Bewertung `{ grade, feedback }`. |
| `GET` / `POST` | `/api/student/assignments`, `/api/student/submissions`, `/api/student/submit` | Schülerdaten und multipart Abgabe. |
| `POST` | `/api/student/delete-file`, `/api/change-password` | Datei vor Bewertung löschen / lokales Passwort ändern. |

`docker compose up -d` startet MySQL und Backend. Compose führt `prisma db push` aus, sobald die Datenbank verfügbar ist, startet danach den Server und führt **kein** `prisma migrate reset`, keinen Force-Reset und kein automatisches Seeding aus. `db-data` und `uploads-data` sind persistent. HTTPS erfordert einen korrekt konfigurierten Reverse Proxy/TLS.

```bash
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

CI läuft bei Push auf `main`; Image-Build und Deployment benötigen die konfigurierten GitHub-Secrets und SSH-Zugangsdaten.
