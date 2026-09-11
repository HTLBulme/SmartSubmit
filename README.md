# SmartSubmit

SmartSubmit is an assignment-management application for schools: administrators manage accounts and imports, teachers publish and assess assignments, and students submit text or files.

## Stack and local setup

- Frontend: React, Vite, Bootstrap and Axios in `frontend/`
- Backend: Express 5, Prisma 6 and MySQL 8 in `backend/`
- Authentication: JWT, Google OAuth and optional teacher LDAP login

Node.js 20+, npm and MySQL 8 (or Docker) are required.

```bash
git clone https://github.com/HTLBulme/SmartSubmit.git
cd SmartSubmit
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET and any optional provider settings locally.
npx prisma generate
npx prisma migrate deploy
npm start

# another terminal
cd frontend
npm install
echo VITE_API_URL=http://localhost:3000 > .env.development
npm run dev
```

The backend API is `http://localhost:3000/api`; the Vite development server is `http://localhost:5173`.

`npm run seed` is an explicit development operation, not normal startup. `npx prisma migrate reset` is destructive and must only be used intentionally in a disposable environment.

## Configuration

Use `backend/.env.example` as a template and never commit `.env`. Keep database passwords, `JWT_SECRET`, Google OAuth secrets, SMTP passwords and LDAP bind credentials private.

### Google OAuth

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and either `GOOGLE_CALLBACK_URL` or `GOOGLE_REDIRECT_URI`. Google sign-in finds an account by Google identity or email. A matching existing SmartSubmit account is linked; a new account is not created. SmartSubmit remains the source for roles, classes and subjects.

### Teacher LDAP login

LDAP login is implemented for teachers and disabled by default:

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

`LDAP_URL` overrides host and port. The server searches the configured teacher base DN and subtree by `LDAP_LOGIN_ATTRIBUTE` (default `uid`), then verifies the password by binding as the found user. `LDAP_BIND_MODE` is `anonymous` or `service`; service mode requires its bind DN and password. `LDAP_LINK_EXISTING_TEACHER_BY_EMAIL` only permits linking an existing local Teacher with the same verified LDAP email.

LDAP accounts have no local SmartSubmit password, and password change is rejected for them. The LDAP integration is implemented/prepared in the application, but has not yet been validated against the school's production LDAP environment.

### Email and proxy settings

Submission confirmations, grade/feedback notifications and teacher-triggered reminders use `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD` (or `EMAIL_PASS`) and `EMAIL_FROM`. An email error does not undo a saved submission or grade.

Set `TRUST_PROXY` only behind a known proxy. It accepts explicit IPs/CIDRs or `loopback`, `linklocal` and `uniquelocal`; broad all-address values are rejected.
`PORT` and `HOST` are optional server overrides; the defaults are `3000` and `0.0.0.0`.

## Authentication and roles

Users do not select a role before login. They authenticate first with a local password, Google or LDAP; the backend then returns the roles assigned to their SmartSubmit account and creates a seven-day JWT containing only internal `userId`.

- One role: the client confirms it with the backend and opens that area.
- Multiple roles: the client shows only assigned roles; the selection is confirmed by `POST /api/auth/select-role`.
- No valid role: login ends with an error.

The active role is a per-tab client context in `sessionStorage` after authentication, not a JWT claim. Backend endpoints still enforce access.

## Admin accounts and spreadsheet imports

Admins can create, edit and delete Students and Teachers. Manual creation requires first name, last name and email. Students support zero or more class links. Teachers support zero or more class links and zero or more existing subject links. A manually created account's initial local password is the lower-case first name followed by last name.

Student and teacher imports accept XLSX and ODS workbooks. The first worksheet is read and the import file limit is **5 MiB**.

| Import | Required headers | Row requirements |
| --- | --- | --- |
| Student | `vorname`, `nachname`, `email`, `klasse`, `jahrgang` | All required; `klasse` may be comma-separated; `jahrgang` is a four-digit start year. |
| Teacher | `vorname`, `nachname`, `email`, `klasse`, `jahrgang`, `fach_kuerzel` | Name/email required. `klasse` and `jahrgang` are both empty or both present. `fach_kuerzel` may be empty and supports commas. |

The UI renders a stored/imported year such as `2026` as `2026/27`; the import API accepts the four-digit start year. Imports match normalized email. Existing users are updated, given the relevant role and have imported class links synchronized. Teacher subject links are synchronized to the supplied codes; empty `fach_kuerzel` clears teacher-subject links. Missing referenced classes/subjects are created. Results expose `created`, `updated`, `success` and `failed` rows.

## Teacher submissions and uploads

Teacher assignments return `studentCount`, `submittedCount` and `missingCount` (plus legacy `submissionsCount`, equal to `submittedCount`). The submissions view uses the complete class roster and marks rows Submitted or Not submitted. It has All, Submitted and Missing filters.

Teachers can select submitted rows with downloadable files for ZIP export. The assignment ZIP includes available files and `submission_log.csv`. A reminder can be sent only to selected students who still belong to the assignment class, have the Student role and have not submitted. Grades are integers from 0 to 100; feedback/grade can send an opted-in grade notification.

Assignment and submission uploads allow up to **10 files** per request and **10 MiB per file**. Allowed extensions (or no extension) are `jpeg`, `jpg`, `png`, `gif`, `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ods`, `ppt`, `pptx`, `txt`, `md`, `zip`, `rar`. This is extension allow-listing, not MIME-content inspection.

## API overview

Protected routes require `Authorization: Bearer <token>`. Responses usually contain `success`, but data fields differ by controller.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/check` | Public: check whether an Admin exists. |
| `POST` | `/api/register` | Public: register the first Admin. |
| `POST` | `/api/login` | Local `{ email, password, loginMethod: "local" }`; LDAP `{ identifier, password, loginMethod: "ldap" }`; success returns `{ data: { user, token } }`. |
| `GET` | `/api/auth/google`, `/api/auth/google/callback` | Start/receive Google OAuth. |
| `POST` | `/api/auth/select-role` | Authenticated `{ role }`; must be assigned to caller. |
| `POST` | `/api/admin/import/students`, `/api/admin/import/teachers` | Admin multipart `file`. |
| `GET/POST/PATCH` | `/api/admin/students`, `/api/admin/students/:id` | Admin list/create/update Students. |
| `GET/POST/PATCH` | `/api/admin/teachers`, `/api/admin/teachers/:id` | Admin list/create/update Teachers. |
| `GET` | `/api/admin/classes`, `/api/admin/subjects` | Admin reference data. |
| `DELETE` | `/api/admin/users/:id` | Admin user deletion. |
| `POST/GET/DELETE` | `/api/teacher/assignments`, `/api/teacher/assignments/:assignmentId` | Teacher assignment create/list/delete. |
| `GET` | `/api/teacher/assignments/:assignmentId/submissions` | Teacher roster, submissions, assignment and counts. |
| `GET` | `/api/teacher/assignments/:assignmentId/submissions/download` | Assignment ZIP. |
| `GET` | `/api/teacher/assignments/:assignmentId/submissions/log` | Submission log CSV. |
| `POST` | `/api/teacher/assignments/:assignmentId/reminders` | Teacher `{ userIds: number[] }`. |
| `PATCH` | `/api/teacher/assignments/:assignmentId/archive` | Teacher `{ archived: boolean }`. |
| `PATCH` | `/api/teacher/submissions/:submissionId` | Teacher `{ grade, feedback }`. |
| `GET` | `/api/student/assignments`, `/api/student/submissions` | Student data. |
| `POST` | `/api/student/submit` | Student multipart `assignmentId` (or `aufgabeId`), optional `text`/`files`; text or a file required. |
| `POST` | `/api/student/delete-file` | Student `{ assignmentId, fileName }`, before grading only. |
| `POST` | `/api/change-password` | Local-password account `{ oldPassword, newPassword }`. |
| `GET` | `/api/classes`, `/api/subjects` | Authenticated teacher reference data. |

## Docker and checks

`docker compose up -d` starts MySQL and the backend. Compose generates Prisma Client and retries `prisma db push` until the database is ready, then starts the server. It does **not** run `prisma migrate reset`, force-reset data or automatically seed. `db-data` and `uploads-data` persist MySQL data and uploads.

Use a correctly configured reverse proxy/TLS setup for HTTPS. Run checks with:

```bash
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

CI runs both suites on pushes to `main`, then builds/pushes the image and deploys only when its configured GitHub secrets and SSH access succeed.
