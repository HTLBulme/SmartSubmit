const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { prisma } = require('../app.config');
const { validateEmail } = require('../app.utils');

// --- Check if admin exists ---
const checkAdminExists = async (req, res) => {
  try {
    const adminCount = await prisma.userRole.count({
      where: { roleId: 3 }
    });

    res.json({
      success: true,
      adminExists: adminCount > 0
    });
  } catch (error) {
    console.error('Admin check error', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// --- Import students from Excel ---
const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang } = row;

        if (!vorname || !nachname || !email || !klasse || !jahrgang) {
          results.failed.push({ row, reason: 'Missing required fields' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row, reason: 'Invalid email' });
          continue;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          results.failed.push({ row, reason: 'Email already exists' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        const klasseNames = klasse.split(',').map(k => k.trim());

        await prisma.$transaction(async (tx) => {
          // --- 1. Create user ---
          const user = await tx.user.create({
            data: {
              firstName: vorname,
              lastName: nachname,
              email: email,
              passwordHash: hashedPassword
            }
          });

          // --- 2. Assign student role ---
          await tx.userRole.create({
            data: { userId: user.id, roleId: 1 }
          });

          // --- 3. Create/link classes ---
          for (const klasseName of klasseNames) {
            let klasseRecord = await tx.class.findFirst({
              where: { name: klasseName, year: parseInt(jahrgang) }
            });

            if (!klasseRecord) {
              klasseRecord = await tx.class.create({
                data: { name: klasseName, year: parseInt(jahrgang) }
              });
            }

            await tx.userClass.create({
              data: { userId: user.id, classId: klasseRecord.id }
            });
          }
        });

        results.success.push({ vorname, nachname, email });
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} students imported, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import error' });
  }
};

// --- Import teachers from Excel ---
const importTeachers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { vorname, nachname, email, klasse, jahrgang, fach_kuerzel } = row;

        if (!vorname || !nachname || !email) {
          results.failed.push({ row, reason: 'Missing required fields' });
          continue;
        }

        if (!validateEmail(email)) {
          results.failed.push({ row, reason: 'Invalid email' });
          continue;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          results.failed.push({ row, reason: 'Email already exists' });
          continue;
        }

        const initialPassword = `${vorname}${nachname}`.toLowerCase();
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        await prisma.$transaction(async (tx) => {
          // --- 1. Create user ---
          const user = await tx.user.create({
            data: {
              firstName: vorname,
              lastName: nachname,
              email,
              passwordHash: hashedPassword
            }
          });

          // --- 2. Assign teacher role ---
          await tx.userRole.create({
            data: { userId: user.id, roleId: 2 }
          });

          // --- 3. Link to classes (if provided) ---
          if (klasse && jahrgang) {
            const klasseNames = klasse.split(',').map(k => k.trim());

            for (const klasseName of klasseNames) {
              let klasseRecord = await tx.class.findFirst({
                where: { name: klasseName, year: parseInt(jahrgang) }
              });

              if (!klasseRecord) {
                klasseRecord = await tx.class.create({
                  data: { name: klasseName, year: parseInt(jahrgang) }
                });
              }

              await tx.userClass.create({
                data: { userId: user.id, classId: klasseRecord.id }
              });
            }
          }

          // --- 4. Link to subjects (if provided) ---
          if (fach_kuerzel) {
            const fachKuerzels = fach_kuerzel.split(',').map(k => k.trim());

            for (const kuerzel of fachKuerzels) {
              let subject = await tx.subject.findUnique({
                where: { code: kuerzel }
              });

              if (!subject) {
                subject = await tx.subject.create({
                  data: { name: kuerzel, code: kuerzel }
                });
              }

              const existing = await tx.userSubject.findFirst({
                where: { userId: user.id, subjectId: subject.id }
              });

              if (!existing) {
                await tx.userSubject.create({
                  data: { userId: user.id, subjectId: subject.id }
                });
              }
            }
          }
        });

        results.success.push({ vorname, nachname, email });
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} teachers imported, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import error' });
  }
};

// NEW: Get all classes for dropdown
const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: [{ year: 'asc' }, { name: 'asc' }]
    });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get students filtered by class (all students if no classId provided)
const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.query; //req.query is an object in Express that contains the URL query parameters.
    const users = await prisma.user.findMany({
      where: {
        userRoles: { some: { roleId: 1 } }, // Relation fields (arrays) require 'some' / 'every' / 'none'
        ...(classId && {
          userClasses: { some: { classId: parseInt(classId) } } //// Spread operator merges the result into the where object; if classId is truthy, && returns the right-hand object and its properties are merged in, otherwise nothing is added
        })
      },
      include: {
        userClasses: { include: { class: true } }
      },
      orderBy: { lastName: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get all subjects for dropdown
const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get teachers filtered by subject (all teachers if no subjectId provided)
const getTeachersBySubject = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const users = await prisma.user.findMany({
      where: {
        userRoles: { some: { roleId: 2 } },
        ...(subjectId && {
          userSubjects: { some: { subjectId: parseInt(subjectId) } }
        })
      },
      include: {
        userSubjects: { include: { subject: true } }
      },
      orderBy: { lastName: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Delete a user by id (cascades via Prisma schema)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

module.exports = {
  checkAdminExists,
  importStudents,
  importTeachers,
  // NEW: exported functions for student/teacher management
  getClasses,
  getStudentsByClass,
  getSubjects,
  getTeachersBySubject,
  deleteUser
};