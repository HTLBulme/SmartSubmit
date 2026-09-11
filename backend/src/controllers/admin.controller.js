const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { prisma } = require('../app.config');
const { validateEmail } = require('../app.utils');

const MANAGED_ROLES = Object.freeze({
  student: 'Student',
  teacher: 'Teacher',
});

const MANAGED_USER_SELECT = Object.freeze({
  id: true,
  firstName: true,
  lastName: true,
  email: true,
});

function normalizeManualUserInput(body = {}) {
  return {
    firstName: typeof body.firstName === 'string' ? body.firstName.trim() : '',
    lastName: typeof body.lastName === 'string' ? body.lastName.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
  };
}

function validateManualUserInput(input) {
  if (!input.firstName || !input.lastName || !input.email) {
    return 'First name, last name and email are required';
  }
  if (input.firstName.length > 255 || input.lastName.length > 255 || input.email.length > 255) {
    return 'User data is too long';
  }
  if (!validateEmail(input.email)) return 'Invalid email';
  return null;
}

function parsePositiveId(value) {
  const id = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseSubjectIds(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parsePositiveId);
  if (parsed.some((id) => id === null)) return null;
  return [...new Set(parsed)];
}

function parseClassIds(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parsePositiveId);
  if (parsed.some((id) => id === null)) return null;
  return [...new Set(parsed)];
}

function resolveClassIds(body = {}) {
  if (Object.prototype.hasOwnProperty.call(body, 'classIds')) return parseClassIds(body.classIds);
  if (Object.prototype.hasOwnProperty.call(body, 'classId')) {
    return body.classId === null || body.classId === '' ? [] : parseClassIds([body.classId]);
  }
  return [];
}

function hashInitialPassword(firstName, lastName) {
  return bcrypt.hash(`${firstName}${lastName}`.toLowerCase(), 10);
}

function isUniqueConstraintError(error) {
  return error && error.code === 'P2002';
}

async function findManagedRole(roleName) {
  return prisma.role.findFirst({ where: { name: roleName }, select: { id: true, name: true } });
}

async function findManagedUser(userId, roleName) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      userRoles: { some: { role: { name: roleName } } },
    },
    select: { id: true },
  });
}

async function emailBelongsToAnotherUser(email, userId = null) {
  return prisma.user.findFirst({
    where: {
      email,
      ...(userId ? { id: { not: userId } } : {}),
    },
    select: { id: true },
  });
}

function sendManualUserError(res, error, fallbackMessage) {
  if (isUniqueConstraintError(error)) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

function parseImportYear(value, required = false) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return required ? null : undefined;
  }
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return Number.isInteger(year) && year > 0 ? year : null;
}

function parseImportList(value, required = false) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return required ? null : [];
  }
  if (typeof value !== 'string') return null;
  const values = [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  return values.length > 0 || !required ? values : null;
}

function validateImportIdentity(row) {
  const firstName = row?.vorname === null || row?.vorname === undefined ? '' : String(row.vorname).trim();
  const lastName = row?.nachname === null || row?.nachname === undefined ? '' : String(row.nachname).trim();
  const email = row?.email === null || row?.email === undefined ? '' : String(row.email).trim();
  if (!firstName || !lastName || !email) {
    return 'Missing required fields';
  }
  if (!validateEmail(email)) return 'Invalid email';
  return null;
}

function validateStudentImportRow(row) {
  const identityError = validateImportIdentity(row);
  if (identityError) return { error: identityError };

  const classNames = parseImportList(row.klasse, true);
  if (!classNames) return { error: 'A valid klasse is required' };
  const year = parseImportYear(row.jahrgang, true);
  if (!year) return { error: 'A valid jahrgang is required' };
  return { classNames, year };
}

function validateTeacherImportRow(row) {
  const identityError = validateImportIdentity(row);
  if (identityError) return { error: identityError };

  const hasClass = row.klasse !== null && row.klasse !== undefined && String(row.klasse).trim() !== '';
  const hasYear = row.jahrgang !== null && row.jahrgang !== undefined && String(row.jahrgang).trim() !== '';
  if (hasClass !== hasYear) return { error: 'klasse and jahrgang must be provided together' };

  const classNames = hasClass ? parseImportList(row.klasse, true) : [];
  if (hasClass && !classNames) return { error: 'Invalid klasse' };
  const year = hasYear ? parseImportYear(row.jahrgang, true) : undefined;
  if (hasYear && !year) return { error: 'Invalid jahrgang' };

  const hasSubjects = row.fach_kuerzel !== null
    && row.fach_kuerzel !== undefined
    && String(row.fach_kuerzel).trim() !== '';
  const subjectCodes = hasSubjects ? parseImportList(row.fach_kuerzel, true) : [];
  if (hasSubjects && !subjectCodes) return { error: 'Invalid fach_kuerzel' };

  return { classNames, year, subjectCodes, hasClass, hasSubjects };
}

async function ensureImportRole(tx, userId, roleName) {
  const role = await tx.role.findFirst({ where: { name: roleName } });
  if (!role) throw new Error(`${roleName} role is not configured`);
  await tx.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

async function syncImportClasses(tx, userId, classNames, year) {
  const classIds = [];
  for (const className of classNames) {
    let classRecord = await tx.class.findFirst({ where: { name: className, year } });
    if (!classRecord) {
      classRecord = await tx.class.create({ data: { name: className, year } });
    }
    classIds.push(classRecord.id);
  }

  await tx.userClass.deleteMany({ where: { userId } });
  if (classIds.length > 0) {
    await tx.userClass.createMany({
      data: [...new Set(classIds)].map((classId) => ({ userId, classId })),
      skipDuplicates: true,
    });
  }
}

async function syncImportSubjects(tx, userId, subjectCodes) {
  const subjectIds = [];
  for (const code of subjectCodes) {
    let subject = await tx.subject.findUnique({ where: { code } });
    if (!subject) subject = await tx.subject.create({ data: { name: code, code } });
    subjectIds.push(subject.id);
  }

  await tx.userSubject.deleteMany({ where: { userId } });
  if (subjectIds.length > 0) {
    await tx.userSubject.createMany({
      data: [...new Set(subjectIds)].map((subjectId) => ({ userId, subjectId })),
      skipDuplicates: true,
    });
  }
}

async function syncManualUserClasses(tx, userId, classIds) {
  await tx.userClass.deleteMany({ where: { userId } });
  if (classIds.length > 0) {
    await tx.userClass.createMany({
      data: classIds.map((classId) => ({ userId, classId })),
      skipDuplicates: true,
    });
  }
}


function importResultEntry(row, userId) {
  return {
    id: userId,
    vorname: String(row.vorname).trim(),
    nachname: String(row.nachname).trim(),
    email: String(row.email).trim().toLowerCase(),
  };
}

function pushImportResult(results, status, entry) {
  results[status].push(entry);
  results.success.push(entry);
}

function importSummaryMessage(results, label) {
  return `${results.created.length} ${label} created, ${results.updated.length} updated, ${results.failed.length} failed`;
}

function missingImportColumns(data, expectedColumns) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const headers = Object.keys(data[0]);
  return expectedColumns.filter((column) => !headers.includes(column));
}

// --- Check if admin exists ---
const checkAdminExists = async (req, res) => {
  try {
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    const adminCount = await prisma.userRole.count({
      where: { roleId: adminRole.id }
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

// --- Import students from Excel (transactional create/update by e-mail) ---
const importStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const missingColumns = missingImportColumns(data, ['vorname', 'nachname', 'email', 'klasse', 'jahrgang']);
    if (missingColumns.length > 0) {
      return res.status(400).json({ success: false, message: `Missing required columns: ${missingColumns.join(', ')}` });
    }
    const results = { created: [], updated: [], success: [], failed: [] };

    for (const row of data) {
      try {
        const validation = validateStudentImportRow(row);
        if (validation.error) {
          results.failed.push({ row, reason: validation.error });
          continue;
        }

        const vorname = String(row.vorname).trim();
        const nachname = String(row.nachname).trim();
        const email = String(row.email).trim().toLowerCase();
        const result = await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({ where: { email } });
          let user;
          let status;
          if (existingUser) {
            user = await tx.user.update({
              where: { id: existingUser.id },
              data: { firstName: vorname, lastName: nachname },
              select: MANAGED_USER_SELECT,
            });
            status = 'updated';
          } else {
            const passwordHash = await hashInitialPassword(vorname, nachname);
            user = await tx.user.create({
              data: { firstName: vorname, lastName: nachname, email, passwordHash },
              select: MANAGED_USER_SELECT,
            });
            status = 'created';
          }
          await ensureImportRole(tx, user.id, MANAGED_ROLES.student);
          await syncImportClasses(tx, user.id, validation.classNames, validation.year);
          return { user, status };
        });
        pushImportResult(results, result.status, importResultEntry({ vorname, nachname, email }, result.user.id));
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    return res.json({
      success: true,
      message: importSummaryMessage(results, 'students'),
      data: results,
    });
  } catch (error) {
    console.error('Student import error', error);
    return res.status(500).json({ success: false, message: 'Import error' });
  }
};

// --- Import teachers from Excel (transactional create/update by e-mail) ---
const importTeachers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

    const workbook = XLSX.read(req.file.buffer);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const missingColumns = missingImportColumns(data, ['vorname', 'nachname', 'email', 'klasse', 'jahrgang', 'fach_kuerzel']);
    if (missingColumns.length > 0) {
      return res.status(400).json({ success: false, message: `Missing required columns: ${missingColumns.join(', ')}` });
    }
    const results = { created: [], updated: [], success: [], failed: [] };

    for (const row of data) {
      try {
        const validation = validateTeacherImportRow(row);
        if (validation.error) {
          results.failed.push({ row, reason: validation.error });
          continue;
        }

        const vorname = String(row.vorname).trim();
        const nachname = String(row.nachname).trim();
        const email = String(row.email).trim().toLowerCase();
        const result = await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({ where: { email } });
          let user;
          let status;
          if (existingUser) {
            user = await tx.user.update({
              where: { id: existingUser.id },
              data: { firstName: vorname, lastName: nachname },
              select: MANAGED_USER_SELECT,
            });
            status = 'updated';
          } else {
            const passwordHash = await hashInitialPassword(vorname, nachname);
            user = await tx.user.create({
              data: { firstName: vorname, lastName: nachname, email, passwordHash },
              select: MANAGED_USER_SELECT,
            });
            status = 'created';
          }
          await ensureImportRole(tx, user.id, MANAGED_ROLES.teacher);
          if (validation.hasClass) await syncImportClasses(tx, user.id, validation.classNames, validation.year);
          // fach_kuerzel is the complete current set. An empty value therefore
          // intentionally clears old subject links for this teacher.
          await syncImportSubjects(tx, user.id, validation.subjectCodes);
          return { user, status };
        });
        pushImportResult(results, result.status, importResultEntry({ vorname, nachname, email }, result.user.id));
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    return res.json({
      success: true,
      message: importSummaryMessage(results, 'teachers'),
      data: results,
    });
  } catch (error) {
    console.error('Teacher import error', error);
    return res.status(500).json({ success: false, message: 'Import error' });
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
    const studentRole = await prisma.role.findFirst({ where: { name: 'Student' } });
    const users = await prisma.user.findMany({
      where: {
        userRoles: { some: { roleId: studentRole.id } }, // Relation fields (arrays) require 'some' / 'every' / 'none'
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
    const teacherRole = await prisma.role.findFirst({ where: { name: 'Teacher' } });
    const users = await prisma.user.findMany({
      where: {
        userRoles: { some: { roleId: teacherRole.id } },
        ...(subjectId && {
          userSubjects: { some: { subjectId: parseInt(subjectId) } }
        })
      },
      include: {
        userSubjects: { include: { subject: true } },
        userClasses: { include: { class: true } },
      },
      orderBy: { lastName: 'asc' }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createStudent = async (req, res) => {
  const input = normalizeManualUserInput(req.body);
  const validationError = validateManualUserInput(input);
  const classIds = resolveClassIds(req.body);

  if (validationError) return res.status(400).json({ success: false, message: validationError });
  if (!classIds) return res.status(400).json({ success: false, message: 'Invalid class selection' });

  try {
    const [studentRole, classRecords, duplicate] = await Promise.all([
      findManagedRole(MANAGED_ROLES.student),
      classIds.length > 0
        ? prisma.class.findMany({ where: { id: { in: classIds } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] })
        : Promise.resolve([]),
      emailBelongsToAnotherUser(input.email),
    ]);

    if (!studentRole) return res.status(500).json({ success: false, message: 'Student role not configured' });
    if (classRecords.length !== classIds.length) return res.status(404).json({ success: false, message: 'One or more classes were not found' });
    if (duplicate) return res.status(409).json({ success: false, message: 'Email already exists' });

    const passwordHash = await hashInitialPassword(input.firstName, input.lastName);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...input, passwordHash }, select: MANAGED_USER_SELECT });
      await tx.userRole.create({ data: { userId: created.id, roleId: studentRole.id } });
      await syncManualUserClasses(tx, created.id, classIds);
      return created;
    });

    return res.status(201).json({
      success: true,
      data: { ...user, userClasses: classRecords.map((classRecord) => ({ class: classRecord })) },
    });
  } catch (error) {
    return sendManualUserError(res, error, 'Student could not be created');
  }
};

const updateStudent = async (req, res) => {
  const userId = parsePositiveId(req.params.id);
  const input = normalizeManualUserInput(req.body);
  const validationError = validateManualUserInput(input);
  const classIds = resolveClassIds(req.body);

  if (!userId) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  if (!classIds) return res.status(400).json({ success: false, message: 'Invalid class selection' });

  try {
    const [user, classRecords, duplicate] = await Promise.all([
      findManagedUser(userId, MANAGED_ROLES.student),
      classIds.length > 0
        ? prisma.class.findMany({ where: { id: { in: classIds } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] })
        : Promise.resolve([]),
      emailBelongsToAnotherUser(input.email, userId),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
    if (classRecords.length !== classIds.length) return res.status(404).json({ success: false, message: 'One or more classes were not found' });
    if (duplicate) return res.status(409).json({ success: false, message: 'Email already exists' });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({ where: { id: userId }, data: input, select: MANAGED_USER_SELECT });
      await syncManualUserClasses(tx, userId, classIds);
      return saved;
    });

    return res.json({
      success: true,
      data: { ...updated, userClasses: classRecords.map((classRecord) => ({ class: classRecord })) },
    });
  } catch (error) {
    return sendManualUserError(res, error, 'Student could not be updated');
  }
};

const createTeacher = async (req, res) => {
  const input = normalizeManualUserInput(req.body);
  const validationError = validateManualUserInput(input);
  const subjectIds = parseSubjectIds(req.body?.subjectIds);
  const classIds = parseClassIds(req.body?.classIds);

  if (validationError) return res.status(400).json({ success: false, message: validationError });
  if (!subjectIds) return res.status(400).json({ success: false, message: 'Invalid subject selection' });
  if (!classIds) return res.status(400).json({ success: false, message: 'Invalid class selection' });

  try {
    const [teacherRole, subjectRecords, classRecords, duplicate] = await Promise.all([
      findManagedRole(MANAGED_ROLES.teacher),
      prisma.subject.findMany({ where: { id: { in: subjectIds } }, orderBy: { name: 'asc' } }),
      classIds.length > 0
        ? prisma.class.findMany({ where: { id: { in: classIds } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] })
        : Promise.resolve([]),
      emailBelongsToAnotherUser(input.email),
    ]);

    if (!teacherRole) return res.status(500).json({ success: false, message: 'Teacher role not configured' });
    if (subjectRecords.length !== subjectIds.length) {
      return res.status(404).json({ success: false, message: 'One or more subjects were not found' });
    }
    if (classRecords.length !== classIds.length) {
      return res.status(404).json({ success: false, message: 'One or more classes were not found' });
    }
    if (duplicate) return res.status(409).json({ success: false, message: 'Email already exists' });

    const passwordHash = await hashInitialPassword(input.firstName, input.lastName);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...input, passwordHash }, select: MANAGED_USER_SELECT });
      await tx.userRole.create({ data: { userId: created.id, roleId: teacherRole.id } });
      await tx.userSubject.createMany({
        data: subjectIds.map((subjectId) => ({ userId: created.id, subjectId })),
        skipDuplicates: true,
      });
      await syncManualUserClasses(tx, created.id, classIds);
      return created;
    });

    return res.status(201).json({
      success: true,
      data: {
        ...user,
        userSubjects: subjectRecords.map((subject) => ({ subject })),
        userClasses: classRecords.map((classRecord) => ({ class: classRecord })),
      },
    });
  } catch (error) {
    return sendManualUserError(res, error, 'Teacher could not be created');
  }
};

const updateTeacher = async (req, res) => {
  const userId = parsePositiveId(req.params.id);
  const input = normalizeManualUserInput(req.body);
  const validationError = validateManualUserInput(input);
  const subjectIds = parseSubjectIds(req.body?.subjectIds);
  const classIds = parseClassIds(req.body?.classIds);

  if (!userId) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  if (!subjectIds) return res.status(400).json({ success: false, message: 'Invalid subject selection' });
  if (!classIds) return res.status(400).json({ success: false, message: 'Invalid class selection' });

  try {
    const [user, subjectRecords, classRecords, duplicate] = await Promise.all([
      findManagedUser(userId, MANAGED_ROLES.teacher),
      prisma.subject.findMany({ where: { id: { in: subjectIds } }, orderBy: { name: 'asc' } }),
      classIds.length > 0
        ? prisma.class.findMany({ where: { id: { in: classIds } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] })
        : Promise.resolve([]),
      emailBelongsToAnotherUser(input.email, userId),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'Teacher not found' });
    if (subjectRecords.length !== subjectIds.length) {
      return res.status(404).json({ success: false, message: 'One or more subjects were not found' });
    }
    if (classRecords.length !== classIds.length) {
      return res.status(404).json({ success: false, message: 'One or more classes were not found' });
    }
    if (duplicate) return res.status(409).json({ success: false, message: 'Email already exists' });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({ where: { id: userId }, data: input, select: MANAGED_USER_SELECT });
      await tx.userSubject.deleteMany({ where: { userId } });
      await tx.userSubject.createMany({
        data: subjectIds.map((subjectId) => ({ userId, subjectId })),
        skipDuplicates: true,
      });
      await syncManualUserClasses(tx, userId, classIds);
      return saved;
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        userSubjects: subjectRecords.map((subject) => ({ subject })),
        userClasses: classRecords.map((classRecord) => ({ class: classRecord })),
      },
    });
  } catch (error) {
    return sendManualUserError(res, error, 'Teacher could not be updated');
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
  createStudent,
  updateStudent,
  createTeacher,
  updateTeacher,
  deleteUser
};
