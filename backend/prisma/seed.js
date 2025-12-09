// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();

// 1. Чистим таблицы
// СНАЧАЛА связи и зависимые таблицы:
// await client.benutzerRolle.deleteMany({});
// await client.benutzerKlasse.deleteMany({});
// await client.benutzerFach.deleteMany({});
// await client.abgabe.deleteMany({});
// await client.aufgabe.deleteMany({});

// ПОТОМ базовые сущности:
// await client.benutzer.deleteMany({});
// await client.klasse.deleteMany({});
// await client.fach.deleteMany({});

// 2. Базовые данные

const members = {
  data: [
    {
      vorname: "Anna",
      nachname: "Admin",
      email: "admin@gmail.com", //admin123
      passwort_hash: "$2a$10$AfOaXj3/GK59f/4NCMiP1..RtzoIGOMnfkp0eN/82XPdHeJq72t4e"
    },
    {
      vorname: "Jon",
      nachname: "Student",
      email: "jstud@gmail.com", // js123
      passwort_hash: "$2a$10$DKRgqJPmPX5gd2JbBjJvjOVk/qP2YiUrkmtGvJeCeRqFf4IpFpl0C"
    },
    {
      vorname: "Song",
      nachname: "Dev",
      email: "sdev@gmail.com", // sd123
      passwort_hash: "$2a$10$kTr1FHDTzrtu4sQQYi2T/ePs/GcTRSm42XCWk6J/J427zJuPLajia"
    },
    {
      vorname: "Anh",
      nachname: "Teacher",
      email: "ateach@gmail.com", // at123
      passwort_hash: "$2a$10$gAcir0yYpbr2/j0.jFUbG.WI9dgyisYqPeE38KtjPcnAtzaj4OJtK"
    },
    {
      vorname: "Nata",
      nachname: "Student",
      email: "nstud@example.com", // ns123
      passwort_hash: "$2a$10$91.fEk/jF.x9jGpvSX0iPe6Re1iwvtpw9WKh211WGLBfIDxy.UQUm"
    }
  ]
};

// await client.benutzer.createMany(members);

const klassen = {
  data: [
    { name: "1AKIFT", jahrgang: 2024 },
    { name: "2AKIFT", jahrgang: 2023 },
    { name: "3AKIFT", jahrgang: 2022 },
    { name: "4AKIFT", jahrgang: 2021 }
  ]
};

// await client.klasse.createMany(klassen);

const fachs = {
  data: [
    { name: "DatenBank",  kuerzel: "DB" },
    { name: "Informatik", kuerzel: "INF" },
    { name: "Mathematik", kuerzel: "MATH" },
    { name: "Englisch",   kuerzel: "ENG" },
    { name: "Deutsch",    kuerzel: "DEU" },
    { name: "Ethik",      kuerzel: "ETH" }
  ]
};

// await client.fach.createMany(fachs);

// Функции связок остаются как есть
// async function connectBenutzerRolle(userEmail, rollenName) {
//   const user = await client.benutzer.findFirst({ where: { email: userEmail } });
//   const rolle = await client.rolle.findFirst({ where: { bezeichnung: rollenName } });

//   if (!user || !rolle) {
//     console.warn('❗Kein Benutzer oder Rolle:', userEmail, rollenName);
//     return;
//   }

//   await client.benutzerRolle.create({
//     data: {
//       benutzer_id: user.id,
//       rolle_id: rolle.id,
//     },
//   });
// }

// async function connectBenutzerKlasse(userEmail, klassenName) {
//   const user = await client.benutzer.findFirst({ where: { email: userEmail } });
//   const klasse = await client.klasse.findFirst({ where: { name: klassenName } });

//   if (!user || !klasse) {
//     console.warn('❗Kein Benutzer oder Klasse:', userEmail, klassenName);
//     return;
//   }

//   await client.benutzerKlasse.create({
//     data: {
//       benutzer_id: user.id,
//       klasse_id: klasse.id,
//     },
//   });
// }

// async function connectBenutzerFach(userEmail, fachKuerzel) {
//   const user = await client.benutzer.findFirst({ where: { email: userEmail } });
//   const fach = await client.fach.findFirst({ where: { kuerzel: fachKuerzel } });

//   if (!user || !fach) {
//     console.warn('❗Kein Benutzer oder Fach:', userEmail, fachKuerzel);
//     return;
//   }

//   await client.benutzerFach.create({
//     data: {
//       benutzer_id: user.id,
//       fach_id: fach.id,
//     },
//   });
// }

// 2. Связи Benutzer <-> Rolle
// await connectBenutzerRolle('admin@gmail.com', 'Admin');
// await connectBenutzerRolle('ateach@gmail.com', 'Lehrer');
// await connectBenutzerRolle('jstud@gmail.com', 'Schüler');
// await connectBenutzerRolle('nstud@example.com', 'Schüler');

// 3. Связи Benutzer <-> Klasse
// await connectBenutzerKlasse('jstud@gmail.com', '3AKIFT');
// await connectBenutzerKlasse('nstud@example.com', '3AKIFT');
// await connectBenutzerKlasse('ateach@gmail.com', '3AKIFT');

// 4. Связи Benutzer <-> Fach
// await connectBenutzerFach('ateach@gmail.com', 'DB');
// await connectBenutzerFach('ateach@gmail.com', 'INF');
// await connectBenutzerFach('jstud@gmail.com', 'MATH');

console.log("✔ Seed completed");
await client.$disconnect();
