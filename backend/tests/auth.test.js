const request = require('supertest');
const app = require('../src/main'); 

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'signed-token'),
    verify: jest.fn((token, secret, callback) => callback(null, { userId: 1 })),
}));

jest.mock('../src/app.ldap', () => ({
    authenticateLDAP: jest.fn(),
}));

jest.mock('../src/services/ldapTeacherProvisioning', () => ({
    loadLdapLinkingPolicy: jest.fn(() => ({ linkExistingTeacherByEmail: false })),
    provisionLdapTeacher: jest.fn(),
}));

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
            update: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
        },
        userRole: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        role: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn(),
            findFirst: jest.fn(),
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
const { authenticateLDAP } = require('../src/app.ldap');
const { provisionLdapTeacher } = require('../src/services/ldapTeacherProvisioning');

const userWithRoles = (roles, overrides = {}) => ({
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    passwordHash: 'hashed-password-for-mock',
    provider: 'local',
    userRoles: roles.map((name, index) => ({
        roleId: index + 1,
        role: { name },
    })),
    ...overrides,
});

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

    it('authenticates a local user with one role without a requested role', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRoles(['Student']));
        bcrypt.compare.mockResolvedValue(true);

        const response = await request(server).post('/api/login').send({
            email: 'test@example.com',
            password: 'correct-password',
            loginMethod: 'local',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.roles).toEqual([{ id: 1, name: 'Student' }]);
        expect(response.body.data.token).toBe('signed-token');
    });

    it('returns all roles for a local multi-role user', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRoles(['Teacher', 'Admin']));
        bcrypt.compare.mockResolvedValue(true);

        const response = await request(server).post('/api/login').send({
            email: 'test@example.com',
            password: 'correct-password',
            loginMethod: 'local',
            role: 'Student',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.roles.map(({ name }) => name)).toEqual(['Teacher', 'Admin']);
    });

    it('authenticates a confirmed LDAP Teacher through the existing JWT role flow', async () => {
        const ldapProfile = {
            uid: 'teacher.one',
            dn: 'uid=teacher.one,ou=lehrer,ou=people,dc=bin,dc=at',
            mail: 'teacher@example.com',
            role: 'Teacher',
            teacherMappingConfirmed: true,
        };
        authenticateLDAP.mockResolvedValue(ldapProfile);
        provisionLdapTeacher.mockResolvedValue(userWithRoles(['Teacher'], {
            email: 'teacher@example.com', passwordHash: null, provider: 'ldap',
        }));

        const response = await request(server).post('/api/login').send({
            identifier: 'teacher.one',
            password: 'directory-password',
            loginMethod: 'ldap',
        });

        expect(response.statusCode).toBe(200);
        expect(authenticateLDAP).toHaveBeenCalledWith('teacher.one', 'directory-password');
        expect(provisionLdapTeacher).toHaveBeenCalledWith(
            ldapProfile,
            expect.objectContaining({ prismaClient: prisma }),
        );
        expect(response.body.data.user.roles.map(({ name }) => name)).toEqual(['Teacher']);
        expect(response.body.data.user.hasLocalPassword).toBe(false);
        expect(response.body.data.user.authMethod).toBe('ldap');
    });

    it('does not provision or write to Prisma when LDAP authentication fails', async () => {
        authenticateLDAP.mockRejectedValue(Object.assign(new Error('invalid'), {
            code: 'LDAP_INVALID_CREDENTIALS',
        }));

        const response = await request(server).post('/api/login').send({
            identifier: 'teacher.one',
            password: 'wrong-password',
            loginMethod: 'ldap',
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Invalid credentials or Teacher LDAP access is not permitted');
        expect(provisionLdapTeacher).not.toHaveBeenCalled();
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.userRole.create).not.toHaveBeenCalled();
    });

    it('does not provision a Student or non-Teacher LDAP result', async () => {
        authenticateLDAP.mockRejectedValue(Object.assign(new Error('not teacher'), {
            code: 'LDAP_TEACHER_NOT_FOUND',
        }));

        const response = await request(server).post('/api/login').send({
            email: 'student.one',
            password: 'directory-password',
            loginMethod: 'ldap',
        });

        expect(response.statusCode).toBe(401);
        expect(provisionLdapTeacher).not.toHaveBeenCalled();
    });

    it('keeps LDAP unavailable when the feature flag is disabled', async () => {
        authenticateLDAP.mockRejectedValue(Object.assign(new Error('disabled'), {
            code: 'LDAP_DISABLED',
        }));

        const response = await request(server).post('/api/login').send({
            email: 'teacher.one',
            password: 'directory-password',
            loginMethod: 'ldap',
        });

        expect(response.statusCode).toBe(503);
        expect(response.body.message).toBe('Teacher LDAP login is currently unavailable');
        expect(provisionLdapTeacher).not.toHaveBeenCalled();
    });

    it('returns a safe refusal when LDAP provisioning rejects missing mail or linking', async () => {
        authenticateLDAP.mockResolvedValue({
            uid: 'teacher.one', role: 'Teacher', teacherMappingConfirmed: true,
        });
        provisionLdapTeacher.mockRejectedValue(new Error('mail missing'));

        const response = await request(server).post('/api/login').send({
            email: 'teacher.one',
            password: 'directory-password',
            loginMethod: 'ldap',
        });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Teacher LDAP account cannot be linked or provisioned');
    });

    it('keeps local Admin login working', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRoles(['Admin']));
        bcrypt.compare.mockResolvedValue(true);

        const response = await request(server).post('/api/login').send({
            email: 'admin@example.com', password: 'local-password', loginMethod: 'local',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.roles.map(({ name }) => name)).toEqual(['Admin']);
        expect(authenticateLDAP).not.toHaveBeenCalled();
    });

    it('keeps local Teacher password login working after LDAP identity linking', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRoles(['Teacher'], {
            passwordHash: 'unchanged-local-hash',
            ldapExternalId: 'uuid-1',
            ldapUid: 'teacher.one',
        }));
        bcrypt.compare.mockResolvedValue(true);

        const response = await request(server).post('/api/login').send({
            email: 'teacher@example.com', password: 'local-password', loginMethod: 'local',
        });

        expect(response.statusCode).toBe(200);
        expect(bcrypt.compare).toHaveBeenCalledWith('local-password', 'unchanged-local-hash');
        expect(response.body.data.user.roles.map(({ name }) => name)).toEqual(['Teacher']);
        expect(response.body.data.user.hasLocalPassword).toBe(true);
        expect(authenticateLDAP).not.toHaveBeenCalled();
    });

    it('does not create a local password through change-password for an LDAP-only user', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRoles(['Teacher'], {
            passwordHash: null,
            ldapExternalId: 'uuid-1',
            ldapUid: 'teacher.one',
        }));

        const response = await request(server)
            .post('/api/change-password')
            .set('Authorization', 'Bearer signed-token')
            .send({ oldPassword: 'ldap-password', newPassword: 'new-password' });

        expect(response.statusCode).toBe(409);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects selecting a role that is not assigned to the authenticated user', async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 3, name: 'Admin' });
        prisma.userRole.findFirst.mockResolvedValue(null);

        const response = await request(server)
            .post('/api/auth/select-role')
            .set('Authorization', 'Bearer signed-token')
            .send({ role: 'Admin' });

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('message', 'Role is not assigned to this user');
        expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
            where: { userId: 1, roleId: 3 },
            select: { id: true },
        });
    });

    it('confirms an assigned role without changing the token', async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 2, name: 'Teacher' });
        prisma.userRole.findFirst.mockResolvedValue({ id: 20 });

        const response = await request(server)
            .post('/api/auth/select-role')
            .set('Authorization', 'Bearer signed-token')
            .send({ role: 'Teacher' });

        expect(response.statusCode).toBe(200);
        expect(response.body.data).toEqual({ role: 'Teacher' });
        expect(response.body.data).not.toHaveProperty('token');
    });
});
