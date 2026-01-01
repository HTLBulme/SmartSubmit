const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if data already exists (to avoid duplicate seeding)
  const existingUsers = await prisma.benutzer.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping...');
    return;
  }

  console.log('Creating seed data...');

  // Create Roles
  console.log('Creating roles...');
  const adminRole = await prisma.rolle.create({
    data: {
      bezeichnung: 'Admin',
      beschreibung: 'System Administrator mit vollen Rechten',
    },
  });

  const lehrerRole = await prisma.rolle.create({
    data: {
      bezeichnung: 'Lehrer',
      beschreibung: 'Lehrkräfte können Aufgaben erstellen und bewerten',
    },
  });

  const schuelerRole = await prisma.rolle.create({
    data: {
      bezeichnung: 'Schüler',
      beschreibung: 'Schüler können Aufgaben ansehen und abgeben',
    },
  });

  // Create Subjects (Fächer)
  console.log('Creating subjects...');
  const mathematik = await prisma.fach.create({
    data: { name: 'Mathematik', kuerzel: 'MATH' },
  });

  const deutsch = await prisma.fach.create({
    data: { name: 'Deutsch', kuerzel: 'DE' },
  });

  const englisch = await prisma.fach.create({
    data: { name: 'Englisch', kuerzel: 'EN' },
  });

  const informatik = await prisma.fach.create({
    data: { name: 'Informatik', kuerzel: 'INF' },
  });

  const physik = await prisma.fach.create({
    data: { name: 'Physik', kuerzel: 'PHY' },
  });

  // Create Classes (Klassen)
  console.log('Creating classes...');
  const klasse5a = await prisma.klasse.create({
    data: { name: '5A', jahrgang: 2024 },
  });

  const klasse5b = await prisma.klasse.create({
    data: { name: '5B', jahrgang: 2024 },
  });

  const klasse4a = await prisma.klasse.create({
    data: { name: '4A', jahrgang: 2025 },
  });

  // Create Admin User
  console.log('Creating admin user...');
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const admin = await prisma.benutzer.create({
    data: {
      vorname: 'Admin',
      nachname: 'System',
      email: 'admin@smartsubmit.com',
      passwort_hash: hashedPasswordAdmin,
      aktiv: true,
    },
  });

  await prisma.benutzerRolle.create({
    data: {
      benutzer_id: admin.id,
      rolle_id: adminRole.id,
    },
  });

  // Create Teachers (Lehrer)
  console.log('Creating teachers...');
  const hashedPasswordTeacher = await bcrypt.hash('lehrer123', 10);

  const lehrer1 = await prisma.benutzer.create({
    data: {
      vorname: 'Maria',
      nachname: 'Müller',
      email: 'maria.mueller@smartsubmit.com',
      passwort_hash: hashedPasswordTeacher,
      aktiv: true,
    },
  });

  await prisma.benutzerRolle.create({
    data: {
      benutzer_id: lehrer1.id,
      rolle_id: lehrerRole.id,
    },
  });

  // Assign subjects to teacher
  await prisma.benutzerFach.createMany({
    data: [
      { benutzer_id: lehrer1.id, fach_id: mathematik.id },
      { benutzer_id: lehrer1.id, fach_id: informatik.id },
    ],
  });

  const lehrer2 = await prisma.benutzer.create({
    data: {
      vorname: 'Thomas',
      nachname: 'Schmidt',
      email: 'thomas.schmidt@smartsubmit.com',
      passwort_hash: hashedPasswordTeacher,
      aktiv: true,
    },
  });

  await prisma.benutzerRolle.create({
    data: {
      benutzer_id: lehrer2.id,
      rolle_id: lehrerRole.id,
    },
  });

  await prisma.benutzerFach.createMany({
    data: [
      { benutzer_id: lehrer2.id, fach_id: deutsch.id },
      { benutzer_id: lehrer2.id, fach_id: englisch.id },
    ],
  });

  // Create Students (Schüler)
  console.log('Creating students...');
  const hashedPasswordStudent = await bcrypt.hash('schueler123', 10);

  const studenten = [
    { vorname: 'Max', nachname: 'Mustermann', email: 'max.mustermann@student.com', klasse: klasse5a },
    { vorname: 'Anna', nachname: 'Weber', email: 'anna.weber@student.com', klasse: klasse5a },
    { vorname: 'Leon', nachname: 'Fischer', email: 'leon.fischer@student.com', klasse: klasse5a },
    { vorname: 'Sophie', nachname: 'Wagner', email: 'sophie.wagner@student.com', klasse: klasse5b },
    { vorname: 'Felix', nachname: 'Becker', email: 'felix.becker@student.com', klasse: klasse5b },
    { vorname: 'Laura', nachname: 'Hoffmann', email: 'laura.hoffmann@student.com', klasse: klasse4a },
  ];

  for (const student of studenten) {
    const schueler = await prisma.benutzer.create({
      data: {
        vorname: student.vorname,
        nachname: student.nachname,
        email: student.email,
        passwort_hash: hashedPasswordStudent,
        aktiv: true,
      },
    });

    // Assign student role
    await prisma.benutzerRolle.create({
      data: {
        benutzer_id: schueler.id,
        rolle_id: schuelerRole.id,
      },
    });

    // Assign to class
    await prisma.benutzerKlasse.create({
      data: {
        benutzer_id: schueler.id,
        klasse_id: student.klasse.id,
      },
    });
  }

  // Create Assignments (Aufgaben)
  console.log('Creating assignments...');
  
  const aufgabe1 = await prisma.aufgabe.create({
    data: {
      titel: 'Quadratische Gleichungen lösen',
      beschreibung: 'Lösen Sie die Aufgaben auf Seite 45-47 im Mathematikbuch. Zeigen Sie alle Rechenschritte.',
      anhaenge: JSON.stringify(['/uploads/mathe_aufgaben.pdf']),
      termin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      klasse_id: klasse5a.id,
      fach_id: mathematik.id,
      lehrer_id: lehrer1.id,
    },
  });

  const aufgabe2 = await prisma.aufgabe.create({
    data: {
      titel: 'Einführung in Python',
      beschreibung: 'Schreiben Sie ein Python-Programm, das die Fibonacci-Folge bis zur 10. Zahl berechnet.',
      anhaenge: null,
      termin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      klasse_id: klasse5a.id,
      fach_id: informatik.id,
      lehrer_id: lehrer1.id,
    },
  });

  const aufgabe3 = await prisma.aufgabe.create({
    data: {
      titel: 'Gedichtanalyse: Goethe',
      beschreibung: 'Analysieren Sie das Gedicht "Erlkönig" von Johann Wolfgang von Goethe. Mindestens 2 Seiten.',
      anhaenge: JSON.stringify(['/uploads/erlkoenig.pdf']),
      termin: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      klasse_id: klasse5b.id,
      fach_id: deutsch.id,
      lehrer_id: lehrer2.id,
    },
  });

  // Create Sample Submissions (Abgaben)
  console.log('Creating sample submissions...');
  
  // Get a student from class 5A
  const schuelerInKlasse5a = await prisma.benutzer.findFirst({
    where: {
      benutzer_klassen: {
        some: { klasse_id: klasse5a.id }
      },
      benutzer_rollen: {
        some: { rolle_id: schuelerRole.id }
      }
    }
  });

  if (schuelerInKlasse5a) {
    await prisma.abgabe.create({
      data: {
        aufgabe_id: aufgabe1.id,
        schueler_id: schuelerInKlasse5a.id,
        dateien: JSON.stringify(['/uploads/max_mathe_loesung.pdf']),
        abgabe_zeitpunkt: new Date(),
        bewertung: 85,
        feedback: 'Sehr gute Arbeit! Die Rechenschritte sind klar dargestellt.',
      },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('\nSummary:');
  console.log(`   - ${await prisma.rolle.count()} Roles`);
  console.log(`   - ${await prisma.fach.count()} Subjects`);
  console.log(`   - ${await prisma.klasse.count()} Classes`);
  console.log(`   - ${await prisma.benutzer.count()} Users`);
  console.log(`   - ${await prisma.aufgabe.count()} Assignments`);
  console.log(`   - ${await prisma.abgabe.count()} Submissions`);
  console.log('\nTest Credentials:');
  console.log('   Admin: admin@smartsubmit.com / admin123');
  console.log('   Teacher: maria.mueller@smartsubmit.com / lehrer123');
  console.log('   Student: max.mustermann@student.com / schueler123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
