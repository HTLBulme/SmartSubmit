// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();

// 1. Чистим таблицы

await client.benutzer.deleteMany({}); //
await client.rolle.deleteMany({});  //
await client.klasse.deleteMany({}); //
await client.fach.deleteMany({}); //
await client.aufgabe.deleteMany({}); 
await client.abgabe.deleteMany({}); 
await client.benutzerRolle.deleteMany({}); 
await client.benutzerKlasse.deleteMany({}); 
await client.benutzerFach.deleteMany({});

const members = {
data: [{
  vorname: "Anna",
  nachname: "Admin",
  email: "admin@gmail.com",
  passwort_hash: "$2b$10$h2QpNMTiEETipap8vCdi7uHE1Qf3Z5zrqY5vA2ltsuq6g19VHNtTO"
},
{
  vorname: "Jon",
  nachname: "Student",
  email: "jstud@gmail.com",
  passwort_hash: "$2b$10$sxMql8cjNT2UGbFLErQqteUIk2wOI1ShvnLVtpVSkLFslPj31aum2"
},
{
  vorname: "Song",
  nachname: "Dev",
  email: "sdev@gmail.com",
  passwort_hash: "$2b$10$orZ4PAgK6tbqhGI/qJwBJuIAsvzAMZ6tnlxCb8OzvYoyTgm7GncgW"
},
{
  vorname: "Anh",
  nachname: "Teacher",
  email: "ateach@gmail.com",
  passwort_hash: "$2b$10$FV8o0p37eJtwfnKmy71SuutIjLKRfeOq7FQsmdtpBcJqASqtVyhl."
},
{
  vorname: "Nata",
  nachname: "Student",
  email: "nstud@example.com",
  passwort_hash: "$2b$10$NDHGSlfK6tp3nYtTGoHVKOdGfIeAfpip/H5QoH02y4r9yc5yu5aWm"
}
]};

await client.benutzer.createMany(members);

const rolles = {
data: [
    { bezeichnung: "Admin", beschreibung: "Systemadministrator" },
    { bezeichnung: "Lehrer", beschreibung: "Lehrperson" },
    { bezeichnung: "Schueler", beschreibung: "Schüleraccount" }
  ]
}

await client.rolle.createMany(rolles);

const klassen = {
data: [
    { name: "1AKIFT", jahrgang: 2024 },
    { name: "2AKIFT", jahrgang: 2023 },
    { name: "3AKIFT", jahrgang: 2022 },
    { name: "4AKIFT", jahrgang: 2021 }
  ]
}
 
await client.klasse.createMany(klassen);

const fachs = {
data: [
    { name: "DatenBank", kuerzel: "DB" },
    { name: "Informatik", kuerzel: "INF" },
    { name: "Mathematik", kuerzel: "MATH" },
    { name: "Englisch", kuerzel: "ENG" },
    { name: "Deutsch", kuerzel: "DEU" },
    { name: "Ethik", kuerzel: "ETH" }
  ]
}
await client.fach.createMany(fachs);
 

console.log("✔ Seed completed");
