const {
  provisionLdapTeacher,
} = require('../src/services/ldapTeacherProvisioning');

const teacherRole = { id: 2, name: 'Teacher' };
const teacherAssignment = { roleId: 2, role: teacherRole };

function profile(overrides = {}) {
  return {
    uid: 'teacher.one',
    dn: 'uid=teacher.one,ou=lehrer,ou=people,dc=bin,dc=at',
    mail: 'teacher.one@example.com',
    entryUUID: 'uuid-1',
    givenName: 'Test',
    gecos: 'Teacher',
    role: 'Teacher',
    teacherMappingConfirmed: true,
    ...overrides,
  };
}

function prismaMock(overrides = {}) {
  const tx = {
    role: { findFirst: jest.fn().mockResolvedValue(teacherRole) },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
  };
  Object.assign(tx.user, overrides.user || {});
  Object.assign(tx.role, overrides.role || {});
  Object.assign(tx.userRole, overrides.userRole || {});
  const prismaClient = {
    $transaction: jest.fn((callback) => callback(tx)),
  };
  return { prismaClient, tx };
}

describe('LDAP Teacher provisioning', () => {
  it('rejects missing mail before starting a transaction', async () => {
    const { prismaClient } = prismaMock();
    await expect(provisionLdapTeacher(profile({ mail: '' }), { prismaClient }))
      .rejects.toMatchObject({ code: 'LDAP_MAIL_REQUIRED' });
    expect(prismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('creates an LDAP-only Teacher without storing the LDAP password', async () => {
    const created = {
      id: 10, firstName: 'Test', lastName: 'Teacher', email: 'teacher.one@example.com',
      passwordHash: null, provider: 'ldap', ldapExternalId: 'uuid-1', ldapUid: 'teacher.one',
      userRoles: [], active: true,
    };
    const finalUser = { ...created, userRoles: [teacherAssignment] };
    const { prismaClient, tx } = prismaMock({
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(finalUser),
        create: jest.fn().mockResolvedValue(created),
      },
    });

    const result = await provisionLdapTeacher(profile({ password: 'directory-password' }), { prismaClient });
    expect(result).toEqual(finalUser);
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        passwordHash: null,
        provider: 'ldap',
        ldapExternalId: 'uuid-1',
        ldapUid: 'teacher.one',
      }),
    }));
    expect(JSON.stringify(tx.user.create.mock.calls)).not.toContain('directory-password');
    expect(tx.userRole.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { userId: 10, roleId: 2 },
    }));
  });

  it('does not create a duplicate on repeated login', async () => {
    const existing = {
      id: 11, email: 'teacher.one@example.com', passwordHash: null, provider: 'ldap',
      ldapExternalId: 'uuid-1', ldapUid: 'teacher.one', active: true,
      userRoles: [teacherAssignment],
    };
    const finalUser = { ...existing };
    const { prismaClient, tx } = prismaMock({
      user: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        findUnique: jest.fn().mockResolvedValue(finalUser),
      },
    });

    await provisionLdapTeacher(profile(), { prismaClient });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 11 } }));
  });

  it('refuses automatic email linking by default', async () => {
    const localTeacher = {
      id: 12, email: 'teacher.one@example.com', passwordHash: 'local-hash', provider: null,
      ldapExternalId: null, ldapUid: null, active: true, userRoles: [teacherAssignment],
    };
    const { prismaClient, tx } = prismaMock({
      user: { findUnique: jest.fn().mockResolvedValue(localTeacher) },
    });

    await expect(provisionLdapTeacher(profile(), { prismaClient }))
      .rejects.toMatchObject({ code: 'LDAP_EMAIL_LINK_REQUIRED' });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.userRole.upsert).not.toHaveBeenCalled();
  });

  it('links an existing local Teacher only with explicit policy and preserves its password', async () => {
    const localTeacher = {
      id: 13, email: 'teacher.one@example.com', passwordHash: 'local-hash', provider: null,
      oauthId: null, ldapExternalId: null, ldapUid: null, active: true,
      userRoles: [teacherAssignment],
    };
    const linked = { ...localTeacher, ldapExternalId: 'uuid-1', ldapUid: 'teacher.one' };
    const { prismaClient, tx } = prismaMock({
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce(localTeacher)
          .mockResolvedValueOnce(linked),
        update: jest.fn().mockResolvedValue(linked),
      },
    });

    await provisionLdapTeacher(profile(), {
      prismaClient,
      policy: { linkExistingTeacherByEmail: true },
    });
    const updateData = tx.user.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('passwordHash');
    expect(updateData).not.toHaveProperty('provider');
    expect(updateData).not.toHaveProperty('oauthId');
  });

  it('preserves Google identity when explicitly linking an existing Google Teacher', async () => {
    const googleTeacher = {
      id: 14, email: 'teacher.one@example.com', passwordHash: null, provider: 'google',
      oauthId: 'google-id', ldapExternalId: null, ldapUid: null, active: true,
      userRoles: [teacherAssignment],
    };
    const linked = { ...googleTeacher, ldapExternalId: 'uuid-1', ldapUid: 'teacher.one' };
    const { prismaClient, tx } = prismaMock({
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce(googleTeacher)
          .mockResolvedValueOnce(linked),
        update: jest.fn().mockResolvedValue(linked),
      },
    });

    await provisionLdapTeacher(profile(), {
      prismaClient,
      policy: { linkExistingTeacherByEmail: true },
    });
    const updateData = tx.user.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('provider');
    expect(updateData).not.toHaveProperty('oauthId');
  });

  it('never grants Teacher when mapping confirmation is missing', async () => {
    const { prismaClient } = prismaMock();
    await expect(provisionLdapTeacher(profile({ teacherMappingConfirmed: false }), { prismaClient }))
      .rejects.toMatchObject({ code: 'LDAP_MAPPING_NOT_CONFIRMED' });
    expect(prismaClient.$transaction).not.toHaveBeenCalled();
  });
});
