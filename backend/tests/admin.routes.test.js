const request = require('supertest');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
  sign: jest.fn(() => 'fake-token'),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-initial-password'),
}));

const mockPrisma = {
  role: { findFirst: jest.fn() },
  userRole: { findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  class: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  user: {
    findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
  userClasses: { findMany: jest.fn() },
  subject: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  userSubjects: { findMany: jest.fn() },
  userClass: { findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  userSubject: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  submission: { deleteMany: jest.fn() },
  assignment: { deleteMany: jest.fn() },
  $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockPrisma) }));

const app = require('../src/main');

function allowAdmin() {
  const roles = {
    Admin: { id: 3, name: 'Admin' },
    Student: { id: 1, name: 'Student' },
    Teacher: { id: 2, name: 'Teacher' },
  };
  mockPrisma.role.findFirst.mockImplementation(({ where }) => Promise.resolve(roles[where.name] || null));
  mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });
}

function importWorkbook(headers, rows) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  bcrypt.hash.mockResolvedValue('hashed-initial-password');
});

describe('Admin API tests', () => {
  it('returns admin existence status', async () => {
    allowAdmin();
    mockPrisma.userRole.count.mockResolvedValue(1);
    const response = await request(app).get('/api/admin/check').set('Authorization', 'Bearer token');
    expect(response.statusCode).toBe(200);
    expect(response.body.adminExists).toBe(true);
  });

  it('returns class list', async () => {
    mockPrisma.class.findMany.mockResolvedValue([{ id: 1, name: '5A', year: 2026 }]);
    const response = await request(app).get('/api/classes').set('Authorization', 'Bearer token');
    expect(response.statusCode).toBe(200);
    expect(response.body.data[0]).toEqual({ id: 1, name: '5A', year: 2026 });
  });

  it('returns students filtered by classId', async () => {
    allowAdmin();
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 1, firstName: 'Max', lastName: 'Mustermann', userClasses: [{ class: { id: 1, name: '5A' } }] },
    ]);
    const response = await request(app).get('/api/admin/students?classId=1').set('Authorization', 'Bearer token');
    expect(response.statusCode).toBe(200);
    expect(response.body.data[0]).toHaveProperty('firstName', 'Max');
  });

  it('returns 400 when student import file is missing', async () => {
    allowAdmin();
    const response = await request(app).post('/api/admin/import/students').set('Authorization', 'Bearer token');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message', 'No file uploaded');
  });

  it('creates a student and reports it as created', async () => {
    allowAdmin();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 101, firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com' });
    mockPrisma.class.findFirst.mockResolvedValue({ id: 11, name: '3AKIFT', year: 2026 });

    const response = await request(app)
      .post('/api/admin/import/students').set('Authorization', 'Bearer token')
      .attach('file', importWorkbook(['vorname', 'nachname', 'email', 'klasse', 'jahrgang'], [
        ['Lena', 'Bauer', 'lena@example.com', '3AKIFT', 2026],
      ]), 'students.xlsx');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.created).toHaveLength(1);
    expect(response.body.data.updated).toHaveLength(0);
    expect(response.body.data.failed).toHaveLength(0);
    expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: 101, roleId: 1 } }, update: {}, create: { userId: 101, roleId: 1 },
    });
  });

  it('updates an existing student by email and replaces its classes', async () => {
    allowAdmin();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 101, passwordHash: 'keep-me' });
    mockPrisma.user.update.mockResolvedValue({ id: 101, firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com' });
    mockPrisma.class.findFirst.mockResolvedValue({ id: 12, name: '3BKIFT', year: 2026 });

    const response = await request(app)
      .post('/api/admin/import/students').set('Authorization', 'Bearer token')
      .attach('file', importWorkbook(['vorname', 'nachname', 'email', 'klasse', 'jahrgang'], [
        ['Lena', 'Bauer', 'LENA@example.com', '3BKIFT', 2026],
      ]), 'students.xlsx');

    expect(response.body.data.created).toHaveLength(0);
    expect(response.body.data.updated).toHaveLength(1);
    expect(response.body.data.failed).toHaveLength(0);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 101 }, data: { firstName: 'Lena', lastName: 'Bauer' },
    }));
    expect(mockPrisma.user.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
    expect(mockPrisma.userClass.deleteMany).toHaveBeenCalledWith({ where: { userId: 101 } });
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 101, classId: 12 }], skipDuplicates: true,
    });
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    expect(mockPrisma.submission.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.assignment.deleteMany).not.toHaveBeenCalled();
  });

  it('deduplicates and synchronizes multiple student classes', async () => {
    allowAdmin();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 102 });
    mockPrisma.user.update.mockResolvedValue({ id: 102, firstName: 'Max', lastName: 'Muster', email: 'max@example.com' });
    mockPrisma.class.findFirst
      .mockResolvedValueOnce({ id: 13, name: '1A', year: 2026 })
      .mockResolvedValueOnce({ id: 14, name: '1B', year: 2026 });

    const response = await request(app)
      .post('/api/admin/import/students').set('Authorization', 'Bearer token')
      .attach('file', importWorkbook(['vorname', 'nachname', 'email', 'klasse', 'jahrgang'], [
        ['Max', 'Muster', 'max@example.com', '1A, 1B, 1A', 2026],
      ]), 'students.xlsx');

    expect(response.body.data.updated).toHaveLength(1);
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 102, classId: 13 }, { userId: 102, classId: 14 }], skipDuplicates: true,
    });
  });

  it('creates and updates teachers with a complete subject set', async () => {
    allowAdmin();
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 201, passwordHash: 'keep-me' });
    mockPrisma.user.create.mockResolvedValue({ id: 200, firstName: 'Anna', lastName: 'Berger', email: 'anna@example.com' });
    mockPrisma.user.update.mockResolvedValue({ id: 201, firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com' });
    mockPrisma.subject.findUnique.mockImplementation(({ where: { code } }) => Promise.resolve({
      M: { id: 21, code: 'M' }, D: { id: 22, code: 'D' }, E: { id: 23, code: 'E' },
    }[code]));

    const response = await request(app)
      .post('/api/admin/import/teachers').set('Authorization', 'Bearer token')
      .attach('file', importWorkbook(['vorname', 'nachname', 'email', 'klasse', 'jahrgang', 'fach_kuerzel'], [
        ['Anna', 'Berger', 'anna@example.com', '', '', 'M, D'],
        ['Tom', 'Lehrer', 'tom@example.com', '', '', 'M, E'],
      ]), 'teachers.xlsx');

    expect(response.body.data.created).toHaveLength(1);
    expect(response.body.data.updated).toHaveLength(1);
    expect(response.body.data.failed).toHaveLength(0);
    expect(mockPrisma.userSubject.deleteMany).toHaveBeenCalledWith({ where: { userId: 200 } });
    expect(mockPrisma.userSubject.deleteMany).toHaveBeenCalledWith({ where: { userId: 201 } });
    expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_roleId: { userId: 201, roleId: 2 } },
    }));
    expect(mockPrisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it('returns row-level failures for malformed import values', async () => {
    allowAdmin();
    const response = await request(app)
      .post('/api/admin/import/students').set('Authorization', 'Bearer token')
      .attach('file', importWorkbook(['vorname', 'nachname', 'email', 'klasse', 'jahrgang'], [
        ['Lena', 'Bauer', 'not-an-email', '3A', 2026],
      ]), 'students.xlsx');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.created).toHaveLength(0);
    expect(response.body.data.failed[0].reason).toBe('Invalid email');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('manually creates a student with the Student role and selected class', async () => {
    allowAdmin();
    mockPrisma.class.findMany.mockResolvedValue([{ id: 7, name: '1AKIFT', year: 2026 }]);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 10, firstName: 'Anna', lastName: 'Test', email: 'anna@example.com' });

    const response = await request(app)
      .post('/api/admin/students').set('Authorization', 'Bearer token')
      .send({ firstName: ' Anna ', lastName: ' Test ', email: 'ANNA@example.com', classId: 7 });

    expect(response.statusCode).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('annatest', 10);
    expect(mockPrisma.userRole.create).toHaveBeenCalledWith({ data: { userId: 10, roleId: 1 } });
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 10, classId: 7 }], skipDuplicates: true,
    });
  });

  it('edits a student and replaces the class relation without changing the user id', async () => {
    allowAdmin();
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 10 }).mockResolvedValueOnce(null);
    mockPrisma.class.findMany.mockResolvedValue([{ id: 8, name: '2AKIFT', year: 2027 }]);
    mockPrisma.user.update.mockResolvedValue({ id: 10, firstName: 'Anna', lastName: 'Neu', email: 'anna.neu@example.com' });

    const response = await request(app)
      .patch('/api/admin/students/10').set('Authorization', 'Bearer token')
      .send({ firstName: 'Anna', lastName: 'Neu', email: 'anna.neu@example.com', classId: 8 });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { firstName: 'Anna', lastName: 'Neu', email: 'anna.neu@example.com' },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    expect(mockPrisma.userClass.deleteMany).toHaveBeenCalledWith({ where: { userId: 10 } });
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 10, classId: 8 }], skipDuplicates: true,
    });
  });

  it('synchronizes multiple student classes and allows removing one without schema changes', async () => {
    allowAdmin();
    mockPrisma.class.findMany.mockResolvedValueOnce([
      { id: 7, name: '1AKIFT', year: 2026 },
      { id: 8, name: '2AKIFT', year: 2026 },
    ]).mockResolvedValueOnce([{ id: 8, name: '2AKIFT', year: 2026 }]);
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 40 })
      .mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValue({ id: 40, firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com' });
    mockPrisma.user.update.mockResolvedValue({ id: 40, firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com' });

    const createResponse = await request(app)
      .post('/api/admin/students').set('Authorization', 'Bearer token')
      .send({ firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com', classIds: [7, 8] });
    expect(createResponse.statusCode).toBe(201);
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 40, classId: 7 }, { userId: 40, classId: 8 }], skipDuplicates: true,
    });

    const updateResponse = await request(app)
      .patch('/api/admin/students/40').set('Authorization', 'Bearer token')
      .send({ firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com', classIds: [8] });
    expect(updateResponse.statusCode).toBe(200);
    expect(mockPrisma.userClass.deleteMany).toHaveBeenCalledWith({ where: { userId: 40 } });
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 40, classId: 8 }], skipDuplicates: true,
    });
  });

  it('rejects a duplicate email while manually creating a student', async () => {
    allowAdmin();
    mockPrisma.class.findMany.mockResolvedValue([{ id: 7, name: '1AKIFT', year: 2026 }]);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 99 });
    const response = await request(app)
      .post('/api/admin/students').set('Authorization', 'Bearer token')
      .send({ firstName: 'Anna', lastName: 'Test', email: 'used@example.com', classId: 7 });
    expect(response.statusCode).toBe(409);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('manually creates a teacher with the Teacher role and selected subjects', async () => {
    allowAdmin();
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: 4, name: 'Mathematik', code: 'M' }, { id: 5, name: 'Deutsch', code: 'D' },
    ]);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 20, firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com' });

    const response = await request(app)
      .post('/api/admin/teachers').set('Authorization', 'Bearer token')
      .send({ firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com', subjectIds: [4, 5, 5] });

    expect(response.statusCode).toBe(201);
    expect(mockPrisma.userRole.create).toHaveBeenCalledWith({ data: { userId: 20, roleId: 2 } });
    expect(mockPrisma.userSubject.createMany).toHaveBeenCalledWith({
      data: [{ userId: 20, subjectId: 4 }, { userId: 20, subjectId: 5 }], skipDuplicates: true,
    });
  });

  it('edits a teacher and replaces subject relations without duplicate links', async () => {
    allowAdmin();
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 20 }).mockResolvedValueOnce(null);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: 5, name: 'Deutsch', code: 'D' }, { id: 6, name: 'Englisch', code: 'E' },
    ]);
    mockPrisma.user.update.mockResolvedValue({ id: 20, firstName: 'Tom', lastName: 'Neu', email: 'tom.neu@example.com' });

    const response = await request(app)
      .patch('/api/admin/teachers/20').set('Authorization', 'Bearer token')
      .send({ firstName: 'Tom', lastName: 'Neu', email: 'tom.neu@example.com', subjectIds: [5, 6, 6] });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.userSubject.deleteMany).toHaveBeenCalledWith({ where: { userId: 20 } });
    expect(mockPrisma.userSubject.createMany).toHaveBeenCalledWith({
      data: [{ userId: 20, subjectId: 5 }, { userId: 20, subjectId: 6 }], skipDuplicates: true,
    });
  });

  it('creates a teacher with multiple classes and synchronizes classes on update', async () => {
    allowAdmin();
    mockPrisma.subject.findMany.mockResolvedValue([{ id: 4, name: 'Mathematik', code: 'M' }]);
    mockPrisma.class.findMany
      .mockResolvedValueOnce([
        { id: 7, name: '3AKIFT', year: 2026 },
        { id: 8, name: '4AKIFT', year: 2026 },
      ])
      .mockResolvedValueOnce([{ id: 8, name: '4AKIFT', year: 2026 }]);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 30, firstName: 'Anna', lastName: 'Berger', email: 'anna@example.com' });

    const createResponse = await request(app)
      .post('/api/admin/teachers').set('Authorization', 'Bearer token')
      .send({ firstName: 'Anna', lastName: 'Berger', email: 'anna@example.com', subjectIds: [4], classIds: [7, 8] });

    expect(createResponse.statusCode).toBe(201);
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 30, classId: 7 }, { userId: 30, classId: 8 }], skipDuplicates: true,
    });

    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 30 });
    mockPrisma.user.update.mockResolvedValue({ id: 30, firstName: 'Anna', lastName: 'Berger', email: 'anna@example.com' });
    const updateResponse = await request(app)
      .patch('/api/admin/teachers/30').set('Authorization', 'Bearer token')
      .send({ firstName: 'Anna', lastName: 'Berger', email: 'anna@example.com', subjectIds: [4], classIds: [8] });

    expect(updateResponse.statusCode).toBe(200);
    expect(mockPrisma.userClass.deleteMany).toHaveBeenCalledWith({ where: { userId: 30 } });
    expect(mockPrisma.userClass.createMany).toHaveBeenCalledWith({
      data: [{ userId: 30, classId: 8 }], skipDuplicates: true,
    });
  });

  it('allows a teacher to be saved without classes while retaining subject links', async () => {
    allowAdmin();
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 31 }).mockResolvedValueOnce(null);
    mockPrisma.subject.findMany.mockResolvedValue([{ id: 4, name: 'Mathematik', code: 'M' }]);
    mockPrisma.user.update.mockResolvedValue({ id: 31, firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com' });

    const response = await request(app)
      .patch('/api/admin/teachers/31').set('Authorization', 'Bearer token')
      .send({ firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com', subjectIds: [4], classIds: [] });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.userClass.deleteMany).toHaveBeenCalledWith({ where: { userId: 31 } });
    expect(mockPrisma.userClass.createMany).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([{ userId: 31 }]),
    }));
    expect(mockPrisma.userSubject.createMany).toHaveBeenCalledWith({
      data: [{ userId: 31, subjectId: 4 }], skipDuplicates: true,
    });
  });

  it.each([
    ['post', '/api/admin/students'], ['patch', '/api/admin/students/10'],
    ['post', '/api/admin/teachers'], ['patch', '/api/admin/teachers/20'],
  ])('rejects %s %s without authentication', async (method, path) => {
    const response = await request(app)[method](path).send({});
    expect(response.statusCode).toBe(401);
  });
});
