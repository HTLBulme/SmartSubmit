const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if data already exists (to avoid duplicate seeding)
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping...');
    return;
  }

  console.log('Creating seed data...');

  // Create Roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      id: 3,
      name: 'Admin',
      description: 'System Administrator with full rights',
    },
  });

  const teacherRole = await prisma.role.create({
    data: {
      id: 2,
      name: 'Teacher',
      description: 'Teachers can create and grade assignments',
    },
  });

  const studentRole = await prisma.role.create({
    data: {
      id: 1,
      name: 'Student',
      description: 'Students can view and submit assignments',
    },
  });

  // Create Subjects
  console.log('Creating subjects...');
  const math = await prisma.subject.create({
    data: { name: 'Mathematics', code: 'MATH' },
  });

  const german = await prisma.subject.create({
    data: { name: 'German', code: 'DE' },
  });

  const english = await prisma.subject.create({
    data: { name: 'English', code: 'EN' },
  });

  const cs = await prisma.subject.create({
    data: { name: 'Computer Science', code: 'CS' },
  });

  const physics = await prisma.subject.create({
    data: { name: 'Physics', code: 'PHY' },
  });

  // Create Classes
  console.log('Creating classes...');
  const class5a = await prisma.class.create({
    data: { name: '5A', year: 2024 },
  });

  const class5b = await prisma.class.create({
    data: { name: '5B', year: 2024 },
  });

  const class4a = await prisma.class.create({
    data: { name: '4A', year: 2025 },
  });

  // Create Admin User
  console.log('Creating admin user...');
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@smartsubmit.com',
      passwordHash: hashedPasswordAdmin,
      active: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  // Create Teachers
  console.log('Creating teachers...');
  const hashedPasswordTeacher = await bcrypt.hash('lehrer123', 10);

  const teacher1 = await prisma.user.create({
    data: {
      firstName: 'Maria',
      lastName: 'Müller',
      email: 'maria.mueller@smartsubmit.com',
      passwordHash: hashedPasswordTeacher,
      active: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: teacher1.id,
      roleId: teacherRole.id,
    },
  });

  // Assign subjects to teacher
  await prisma.userSubject.createMany({
    data: [
      { userId: teacher1.id, subjectId: math.id },
      { userId: teacher1.id, subjectId: cs.id },
    ],
  });

  const teacher2 = await prisma.user.create({
    data: {
      firstName: 'Thomas',
      lastName: 'Schmidt',
      email: 'thomas.schmidt@smartsubmit.com',
      passwordHash: hashedPasswordTeacher,
      active: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: teacher2.id,
      roleId: teacherRole.id,
    },
  });

  await prisma.userSubject.createMany({
    data: [
      { userId: teacher2.id, subjectId: german.id },
      { userId: teacher2.id, subjectId: english.id },
    ],
  });

  // Create Students (Schüler)
  console.log('Creating students...');
  const hashedPasswordStudent = await bcrypt.hash('schueler123', 10);

  const students = [
    { firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@student.com', classObj: class5a },
    { firstName: 'Anna', lastName: 'Weber', email: 'anna.weber@student.com', classObj: class5a },
    { firstName: 'Leon', lastName: 'Fischer', email: 'leon.fischer@student.com', classObj: class5a },
    { firstName: 'Sophie', lastName: 'Wagner', email: 'sophie.wagner@student.com', classObj: class5b },
    { firstName: 'Felix', lastName: 'Becker', email: 'felix.becker@student.com', classObj: class5b },
    { firstName: 'Laura', lastName: 'Hoffmann', email: 'laura.hoffmann@student.com', classObj: class4a },
  ];

  for (const student of students) {
    const studentUser = await prisma.user.create({
      data: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        passwordHash: hashedPasswordStudent,
        active: true,
      },
    });

    // Assign student role
    await prisma.userRole.create({
      data: {
        userId: studentUser.id,
        roleId: studentRole.id,
      },
    });

    // Assign to class
    await prisma.userClass.create({
      data: {
        userId: studentUser.id,
        classId: student.classObj.id,
      },
    });
  }

  // Create Assignments
  console.log('Creating assignments...');
  
  const assignment1 = await prisma.assignment.create({
    data: {
      title: 'Solving quadratic equations',
      description: 'Solve the problems on pages 45-47 in the math book. Show all steps.',
      attachments: JSON.stringify(['/uploads/mathe_aufgaben.pdf']),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      classId: class5a.id,
      subjectId: math.id,
      teacherId: teacher1.id,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      title: 'Introduction to Python',
      description: 'Write a Python program that calculates the Fibonacci sequence up to the 10th number.',
      attachments: null,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      classId: class5a.id,
      subjectId: cs.id,
      teacherId: teacher1.id,
    },
  });

  const assignment3 = await prisma.assignment.create({
    data: {
      title: 'Poetry analysis: Goethe',
      description: 'Analyze the poem "Erlkönig" by Johann Wolfgang von Goethe. At least 2 pages.',
      attachments: JSON.stringify(['/uploads/erlkoenig.pdf']),
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      classId: class5b.id,
      subjectId: german.id,
      teacherId: teacher2.id,
    },
  });

  // Create Sample Submissions
  console.log('Creating sample submissions...');
  
  // Get a student from class 5A
  const studentInClass5a = await prisma.user.findFirst({
    where: {
      userClasses: {
        some: { classId: class5a.id }
      },
      userRoles: {
        some: { roleId: studentRole.id }
      }
    }
  });

  if (studentInClass5a) {
    await prisma.submission.create({
      data: {
        assignmentId: assignment1.id,
        studentId: studentInClass5a.id,
        files: JSON.stringify(['/uploads/max_mathe_loesung.pdf']),
        submittedAt: new Date(),
        grade: 85,
        feedback: 'Very good work! All steps are clearly shown.',
      },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('\nSummary:');
  console.log(`   - ${await prisma.role.count()} Roles`);
  console.log(`   - ${await prisma.subject.count()} Subjects`);
  console.log(`   - ${await prisma.class.count()} Classes`);
  console.log(`   - ${await prisma.user.count()} Users`);
  console.log(`   - ${await prisma.assignment.count()} Assignments`);
  console.log(`   - ${await prisma.submission.count()} Submissions`);
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
