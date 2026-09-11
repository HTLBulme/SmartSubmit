const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
  sign: jest.fn(() => 'fake-token'),
}));

jest.mock('../src/app.email', () => ({
  sendSubmissionConfirmation: jest.fn().mockResolvedValue({ success: true, messageId: 'mail-1' }),
  sendGradeNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'mail-1' }),
  sendAssignmentReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'mail-1' }),
  verifyEmailTransport: jest.fn().mockResolvedValue({ success: true, configured: true }),
}));

const mockPrisma = {
  role: { findFirst: jest.fn() },
  userRole: { findFirst: jest.fn() },
  class: { findFirst: jest.fn(), create: jest.fn() },
  subject: { findFirst: jest.fn(), create: jest.fn() },
  userSubject: { findFirst: jest.fn(), create: jest.fn() },
  userClass: { findMany: jest.fn() },
  assignment: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  submission: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  $disconnect: jest.fn(),
  $transaction: jest.fn(async (callback) => await callback(mockPrisma)),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const app = require('../src/main');
const { sendAssignmentReminder } = require('../src/app.email');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Teacher API tests', () => {
  it('returns 403 when a non-teacher tries to create an assignment', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 2 });
    mockPrisma.userRole.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/teacher/assignments')
      .set('Authorization', 'Bearer token')
      .send({ class: '5A', subject: 'Math', title: 'Test', dueDate: '2026-06-01T12:00:00Z' });

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('message', 'Only for teachers');
  });

  it('creates a new assignment for a valid teacher', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 2 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 10 });
    mockPrisma.class.findFirst.mockResolvedValue(null);
    mockPrisma.class.create.mockResolvedValue({ id: 3, name: '5A', year: 2026 });
    mockPrisma.subject.findFirst.mockResolvedValue(null);
    mockPrisma.subject.create.mockResolvedValue({ id: 4, name: 'Math', code: 'Math' });
    mockPrisma.userSubject.findFirst.mockResolvedValue(null);
    mockPrisma.assignment.create.mockResolvedValue({
      id: 1,
      title: 'Test Assignment',
      description: 'Description',
      link: null,
      dueDate: new Date('2026-06-01T12:00:00Z'),
      class: { name: '5A' },
      subject: { name: 'Math' },
      teacher: { firstName: 'Anna', lastName: 'Smith' },
      attachments: null
    });

    const response = await request(app)
      .post('/api/teacher/assignments')
      .set('Authorization', 'Bearer token')
      .send({ class: '5A', subject: 'Math', title: 'Test Assignment', text: 'Hello', dueDate: '2026-06-01T12:00:00Z' });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('title', 'Test Assignment');
  });

  it('returns teacher assignments list', async () => {
    mockPrisma.assignment.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Task A',
        description: 'Description',
        dueDate: new Date(),
        classId: 5,
        class: { name: '5A' },
        subject: { name: 'Math' },
        archived: false,
        link: null,
        attachments: null,
      }
    ]);
    mockPrisma.role.findFirst.mockResolvedValue({ id: 3 });
    mockPrisma.userClass.findMany.mockResolvedValue([
      { classId: 5, userId: 10 },
      { classId: 5, userId: 11 },
    ]);
    mockPrisma.submission.findMany.mockResolvedValue([
      { assignmentId: 1, studentId: 10 },
    ]);

    const response = await request(app)
      .get('/api/teacher/assignments')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toHaveProperty('title', 'Task A');
    expect(response.body.data[0]).toMatchObject({
      studentCount: 2,
      submittedCount: 1,
      missingCount: 1,
      submissionsCount: 1,
    });
    expect(mockPrisma.userClass.findMany).toHaveBeenCalledWith({
      where: {
        classId: { in: [5] },
        user: { userRoles: { some: { roleId: 3 } } },
      },
      select: { classId: true, userId: true },
    });
  });

  it('rejects grading when grade is invalid', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 2 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 10 });
    mockPrisma.submission.findFirst.mockResolvedValue({ id: 5, assignment: { teacherId: 1 } });

    const response = await request(app)
      .patch('/api/teacher/submissions/5')
      .set('Authorization', 'Bearer token')
      .send({ grade: 'abc' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message', 'Invalid grade (0-100)');
  });

  it('returns all relevant students even when nobody submitted', async () => {
    mockPrisma.role.findFirst
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 1 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 10 });
    mockPrisma.assignment.findFirst.mockResolvedValue({
      id: 10,
      title: 'Task',
      dueDate: new Date('2026-09-30T12:00:00.000Z'),
      classId: 5,
      class: { name: '5A' },
      subject: { name: 'Math' },
    });
    mockPrisma.userClass.findMany.mockResolvedValue([
      { user: { id: 20, firstName: 'Amy', lastName: 'One', email: 'amy@example.com' } },
      { user: { id: 21, firstName: 'Ben', lastName: 'Two', email: 'ben@example.com' } },
    ]);
    mockPrisma.submission.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/teacher/assignments/10/submissions')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.counts).toEqual({ all: 2, submitted: 0, missing: 2 });
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((row) => row.status === 'missing')).toBe(true);
    expect(mockPrisma.userClass.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        classId: 5,
        user: { userRoles: { some: { roleId: 1 } } },
      },
    }));
  });

  it('does not expose an assignment owned by another teacher', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 2 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 10 });
    mockPrisma.assignment.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/teacher/assignments/99/submissions')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(404);
    expect(mockPrisma.assignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 99, teacherId: 1 },
    }));
  });

  it('sends reminders only to students still missing after server-side revalidation', async () => {
    mockPrisma.role.findFirst
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 1 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 10 });
    mockPrisma.assignment.findFirst.mockResolvedValue({
      id: 10,
      classId: 5,
      title: 'Quadratische Gleichungen',
      dueDate: new Date('2026-09-30T12:00:00.000Z'),
    });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 20, firstName: 'Amy', lastName: 'One', email: 'amy@example.com' },
    ]);

    const response = await request(app)
      .post('/api/teacher/assignments/10/reminders')
      .set('Authorization', 'Bearer token')
      .send({ userIds: [20, 21] });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [20, 21] },
        userClasses: { some: { classId: 5 } },
        userRoles: { some: { roleId: 1 } },
        submissions: { none: { assignmentId: 10 } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    expect(sendAssignmentReminder).toHaveBeenCalledWith(
      'amy@example.com',
      'Amy One',
      'Quadratische Gleichungen',
      new Date('2026-09-30T12:00:00.000Z'),
    );
    expect(response.body.data).toMatchObject({
      requestedCount: 2,
      eligibleCount: 1,
      sentCount: 1,
      failedCount: 1,
    });
    expect(response.body.data.failed).toContainEqual({
      userId: 21,
      reason: 'notEligibleOrAlreadySubmitted',
    });
  });
});
