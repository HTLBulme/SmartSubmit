const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
  sign: jest.fn(() => 'fake-token'),
}));

const mockPrisma = {
  role: { findFirst: jest.fn() },
  userRole: { findFirst: jest.fn() },
  class: { findFirst: jest.fn(), create: jest.fn() },
  subject: { findFirst: jest.fn(), create: jest.fn() },
  userSubject: { findFirst: jest.fn(), create: jest.fn() },
  assignment: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  submission: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn() },
  $disconnect: jest.fn(),
  $transaction: jest.fn(async (callback) => await callback(mockPrisma)),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const app = require('../src/main');

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
      { id: 1, title: 'Task A', dueDate: new Date(), class: { name: '5A' }, subject: { name: 'Math' }, archived: false, submissions: [] }
    ]);

    const response = await request(app)
      .get('/api/teacher/assignments')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toHaveProperty('title', 'Task A');
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
});
