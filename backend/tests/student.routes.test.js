const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password-for-mock'),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
  sign: jest.fn(() => 'fake-jwt-token'),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  role: {
    findFirst: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  userRole: {
    findFirst: jest.fn(),
  },
  userClass: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  submission: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
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

describe('Backend API Integration Tests', () => {
  it('should return 401 for invalid login credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'student@example.com',
      passwordHash: 'hashed-password-for-mock',
      userRoles: [{ roleId: 1, role: { name: 'Student' } }],
      firstName: 'Test',
      lastName: 'Student',
    });
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/login')
      .send({ email: 'student@example.com', password: 'wrong' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should return a token for valid login credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'student@example.com',
      passwordHash: 'hashed-password-for-mock',
      firstName: 'Test',
      lastName: 'Student',
      userRoles: [{ roleId: 1, role: { name: 'Student' } }],
    });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/login')
      .send({ email: 'student@example.com', password: 'correct' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data.user.email).toBe('student@example.com');
  });

  it('should return student assignments for authorized student', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.userClass.findMany.mockResolvedValue([{ classId: 1 }]);
    mockPrisma.assignment.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Test Assignment',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        link: '',
        attachments: '[]',
        class: { name: '5A' },
        subject: { name: 'Math' },
        teacher: { firstName: 'Kate', lastName: 'Miller' },
      },
    ]);

    const response = await request(app)
      .get('/api/student/assignments')
      .set('Authorization', 'Bearer valid-token');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).toHaveProperty('title', 'Test Assignment');
  });

  it('should deny access when user is not a student', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.userRole.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/student/assignments')
      .set('Authorization', 'Bearer invalid-student-token');

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('message', 'Students only');
  });
});
