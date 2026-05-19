const request = require('supertest');
const app = require('../src/main'); 

// --- NEW: Mock bcryptjs to control password comparison ---
jest.mock('bcryptjs', () => ({
    // Mock the compare function to control the login success/failure
    compare: jest.fn(),
    // Keep hash function as a mock for the registration test
    hash: jest.fn().mockResolvedValue('hashed-password-for-mock'),
}));
const bcrypt = require('bcryptjs');

// Mock Prisma Client to prevent database access.
jest.mock('@prisma/client', () => {
    // Define a stable mock user object for testing the password failure path
    const mockUser = {
        id: 1,
        firstname: 'Test',
        lastname: 'Tutor',
        email: 'tutor@smartsubmit.com',
        passwordHash: 'hashed-password-for-mock',
        provider: 'local',
        active: true,
        userRoles: [
            { roleId: 1, role: { name: 'Tutor' } }
        ]
        };

        const mockPrisma = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
        },
        role: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn(),
            findUnique: jest.fn(async ({ where }) => ({ id: 1, name: where.name })),
        },
        $disconnect: jest.fn(),
        $transaction: jest.fn(async (callback) => await callback(mockPrisma)),
        };

    return {
        PrismaClient: jest.fn(() => mockPrisma),
        mockUser, // Export mock user for use in tests
    };
});

// Import the mocked Prisma client factory and get the mock instance
const { PrismaClient, mockUser } = require('@prisma/client');
const prisma = new PrismaClient(); 

let server; 

describe('Authentication API', () => {
    
    // --- NEW: Clear all mocks before each test to ensure test isolation ---
    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeAll((done) => {
        server = app; 
        done();
    });

    afterAll((done) => {
        done();
    });

    it('should return 400 if registration data is incomplete', async () => {
        const response = await request(server) 
            .post('/api/register')
            .set('Accept', 'application/json') 
            .send({
                email: 'test@example.com',
                // Missing password, username, roleName
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message'); 
    });

    it('should return 401 for incorrect login credentials', async () => {
        
        // 1. Mock Prisma: Simulate finding a user with the given email.
        prisma.user.findUnique.mockResolvedValue(mockUser);

        
        // 2. Mock bcrypt: Simulate the password comparison failing (wrong password).
        // This forces the Express route to hit the 'if (!user || !(await bcrypt.compare...))' condition.
        bcrypt.compare.mockResolvedValue(false);

        const response = await request(server) 
            .post('/api/login')
            .set('Accept', 'application/json') 
            // FIX: Explicitly set the Content-Type header
            .set('Content-Type', 'application/json') 
            .send({
                email: 'tutor@smartsubmit.com',
                password: 'wrongpassword'
            });

        // Now, we expect 401 because the user was found but the password comparison failed.
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials'); 
    });
});