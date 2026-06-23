const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
  sign: jest.fn(() => 'fake-token'),
}));

const mockPrisma = {
  role: { findFirst: jest.fn() },
  userRole: { findFirst: jest.fn(), count: jest.fn() },
  class: { findMany: jest.fn() },
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  userClasses: { findMany: jest.fn() },
  subject: { findMany: jest.fn() },
  userSubjects: { findMany: jest.fn() },
  userClass: { findMany: jest.fn() },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const app = require('../src/main');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Admin API tests', () => {
  it('returns admin existence status', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 3 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.userRole.count.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/admin/check')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.adminExists).toBe(true);
  });

  it('returns class list', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 3 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });

    mockPrisma.class.findMany.mockResolvedValue([
      { id: 1, name: '5A', year: 2026 }
    ]);

    const response = await request(app)
      .get('/api/classes')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0]).toEqual({
      id: 1,
      name: '5A',
      year: 2026
    });
  });

  it('returns students filtered by classId', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 3 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 1, firstName: 'Max', lastName: 'Mustermann', userClasses: [{ class: { id: 1, name: '5A' } }] }
    ]);

    const response = await request(app)
      .get('/api/admin/students?classId=1')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0]).toHaveProperty('firstName', 'Max');
  });

  it('returns 400 when student import file is missing', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 3 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });

    const response = await request(app)
      .post('/api/admin/import/students')
      .set('Authorization', 'Bearer token');

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message', 'No file uploaded');
  });
});
