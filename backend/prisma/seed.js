import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SmartSubmit…");

  // ==================================
  // 1. Очистка системных таблиц
  // ==================================
  await prisma.benutzerFach.deleteMany({});
  await prisma.benutzerKlasse.deleteMany({});
  await prisma.benutzerRolle.deleteMany({});

  await prisma.rolle.deleteMany({});
  await prisma.benutzer.deleteMany({});
  await prisma.klasse.deleteMany({});
  await prisma.fach.deleteMany({});

  // ==================================
  // 2. Роли
  // ==================================
  const adminRole = await prisma.rolle.create({
    data: { bezeichnung: "Admin", beschreibung: "Systemadministrator" }
  });

  const lehrerRole = await prisma.rolle.create({
    data: { bezeichnung: "Lehrer", beschreibung: "Lehrperson" }
  });

  const schuelerRole = await prisma.rolle.create({
    data: { bezeichnung: "Schueler", beschreibung: "Schüleraccount" }
  });

  // ==================================
  // 3. Пользователи
  // ==================================
  const admin = await prisma.benutzer.create({
    data: {
      vorname: "Anna",
      nachname: "Admin",
      email: "admin@gmail.com",
      passwort_hash: "HASH1"
    }
  });

  const lehrer = await prisma.benutzer.create({
    data: {
      vorname: "Anh",
      nachname: "Teacher",
      email: "teacher@gmail.com",
      passwort_hash: "HASH2"
    }
  });

  const schueler1 = await prisma.benutzer.create({
    data: {
      vorname: "Jon",
      nachname: "Student",
      email: "jon@student.at",
      passwort_hash: "HASH3"
    }
  });

  const schueler2 = await prisma.benutzer.create({
    data: {
      vorname: "Nata",
      nachname: "Student",
      email: "nata@student.at",
      passwort_hash: "HASH4"
    }
  });

  // ==================================
  // 4. Назначение ролей
  // ==================================
  await prisma.benutzerRolle.createMany({
    data: [
      { benutzer_id: admin.id, rolle_id: adminRole.id },
      { benutzer_id: lehrer.id, rolle_id: lehrerRole.id },
      { benutzer_id: schueler1.id, rolle_id: schuelerRole.id },
      { benutzer_id: schueler2.id, rolle_id: schuelerRole.id }
    ]
  });

  // ==================================
  // 5. Классы
  // ==================================
  const klasse = await prisma.klasse.create({
    data: { name: "3AKIFT", jahrgang: 2024 }
  });

  // ==================================
  // 6. Связь Benutzer → Klasse
  // ==================================
  await prisma.benutzerKlasse.createMany({
    data: [
      { benutzer_id: schueler1.id, klasse_id: klasse.id },
      { benutzer_id: schueler2.id, klasse_id: klasse.id },
      { benutzer_id: lehrer.id, klasse_id: klasse.id } // Lehrer преподаёт в этом классе
    ]
  });

  // ==================================
  // 7. Fächer
  // ==================================
  const fachMathe = await prisma.fach.create({
    data: { name: "Mathematik", kuerzel: "MATH" }
  });

  const fachDB = await prisma.fach.create({
    data: { name: "Datenbank", kuerzel: "DB" }
  });

  // ==================================
  // 8. Связь Lehrer → Fach
  // ==================================
  await prisma.benutzerFach.createMany({
    data: [
      { benutzer_id: lehrer.id, fach_id: fachMathe.id },
      { benutzer_id: lehrer.id, fach_id: fachDB.id }
    ]
  });

  console.log("✔ Seed completed.");
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
