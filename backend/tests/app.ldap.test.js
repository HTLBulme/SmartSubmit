const { EventEmitter } = require('events');
const ldap = require('ldapjs');
const {
  TeacherLdapError,
  authenticateTeacherLDAP,
  loadTeacherLdapConfig,
} = require('../src/app.ldap');

const teacherBaseDn = 'ou=lehrer,ou=people,dc=bin,dc=at';

function config(overrides = {}) {
  return {
    enabled: true,
    url: 'ldap://127.0.0.1:1389',
    teacherBaseDn,
    loginAttribute: 'uid',
    bindMode: 'anonymous',
    bindDn: '',
    bindPassword: '',
    connectTimeoutMs: 100,
    operationTimeoutMs: 100,
    searchSizeLimit: 2,
    attributes: ['uid', 'mail', 'gecos', 'givenname', 'sn', 'cn', 'displayname', 'entryuuid', 'objectclass', 'memberof'],
    ...overrides,
  };
}

function entry(dn, attributes = {}) {
  return {
    pojo: {
      objectName: dn,
      attributes: Object.entries(attributes).map(([type, value]) => ({
        type,
        values: Array.isArray(value) ? value : [value],
      })),
    },
  };
}

function fakeLdapClient({ entries = [], bindErrors = [], searchError = null, status = 0 } = {}) {
  const response = new EventEmitter();
  const client = {
    bind: jest.fn((dn, password, callback) => {
      const error = bindErrors[client.bind.mock.calls.length - 1] || null;
      queueMicrotask(() => callback(error));
    }),
    search: jest.fn((base, options, callback) => {
      queueMicrotask(() => {
        callback(null, response);
        queueMicrotask(() => {
          if (searchError) return response.emit('error', searchError);
          entries.forEach((item) => response.emit('searchEntry', item));
          response.emit('end', { status });
        });
      });
    }),
    unbind: jest.fn((callback) => queueMicrotask(() => callback && callback())),
    on: jest.fn(),
  };
  return client;
}

function fakeLdapModule(client) {
  return {
    createClient: jest.fn(() => client),
    EqualityFilter: ldap.EqualityFilter,
    parseDN: ldap.parseDN,
  };
}

const validEntry = (uid = 'teacher.one') => entry(
  `uid=teacher-test,${teacherBaseDn}`,
  {
    uid,
    mail: 'teacher.one@example.com',
    gecos: 'Teacher',
    givenName: 'Test',
    entryUUID: 'uuid-1',
    objectClass: ['inetOrgPerson', 'posixAccount'],
  }
);

describe('Teacher LDAP adapter', () => {
  it('keeps Teacher LDAP disabled by default', () => {
    expect(loadTeacherLdapConfig({}).enabled).toBe(false);
    expect(loadTeacherLdapConfig({}).teacherBaseDn).toBe(teacherBaseDn);
  });

  it('uses an escaped equality filter, Teacher subtree search, and returned-DN user bind', async () => {
    const uid = 'teacher*)(uid=*)';
    const client = fakeLdapClient({ entries: [validEntry(uid)] });
    const ldapModule = fakeLdapModule(client);

    const profile = await authenticateTeacherLDAP(uid, 'directory-password', {
      config: config(),
      ldapModule,
    });

    expect(profile.role).toBe('Teacher');
    expect(profile.teacherMappingConfirmed).toBe(true);
    expect(profile).not.toHaveProperty('password');
    expect(JSON.stringify(profile)).not.toContain('directory-password');
    expect(client.search).toHaveBeenCalledTimes(1);
    const [base, options] = client.search.mock.calls[0];
    expect(base).toBe(teacherBaseDn);
    expect(options.scope).toBe('sub');
    expect(options.sizeLimit).toBe(2);
    expect(options.filter.toString()).toContain('\\2a');
    expect(options.filter.toString()).toContain('\\28');
    expect(client.bind.mock.calls).toEqual([
      ['', '', expect.any(Function)],
      [`uid=teacher-test,${teacherBaseDn}`, 'directory-password', expect.any(Function)],
    ]);
    expect(client.unbind).toHaveBeenCalledTimes(1);
  });

  it('supports service search bind without treating its DN as the user DN', async () => {
    const client = fakeLdapClient({ entries: [validEntry()] });
    await authenticateTeacherLDAP('teacher.one', 'directory-password', {
      config: config({
        bindMode: 'service',
        bindDn: 'cn=ldap-reader,dc=bin,dc=at',
        bindPassword: 'service-secret',
      }),
      ldapModule: fakeLdapModule(client),
    });

    expect(client.bind.mock.calls[0].slice(0, 2)).toEqual([
      'cn=ldap-reader,dc=bin,dc=at',
      'service-secret',
    ]);
    expect(client.bind.mock.calls[1][0]).toBe(`uid=teacher-test,${teacherBaseDn}`);
  });

  it('rejects zero entries without attempting user bind', async () => {
    const client = fakeLdapClient({ entries: [] });
    await expect(authenticateTeacherLDAP('student.one', 'password', {
      config: config(), ldapModule: fakeLdapModule(client),
    })).rejects.toMatchObject({ code: 'LDAP_TEACHER_NOT_FOUND' });
    expect(client.bind).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate uid results', async () => {
    const client = fakeLdapClient({ entries: [validEntry(), validEntry()] });
    await expect(authenticateTeacherLDAP('teacher.one', 'password', {
      config: config(), ldapModule: fakeLdapModule(client),
    })).rejects.toMatchObject({ code: 'LDAP_IDENTITY_AMBIGUOUS' });
    expect(client.bind).toHaveBeenCalledTimes(1);
  });

  it('rejects an entry outside the configured Teacher subtree', async () => {
    const outside = entry('uid=teacher.one,ou=people,dc=bin,dc=at', {
      uid: 'teacher.one', mail: 'teacher.one@example.com',
    });
    const client = fakeLdapClient({ entries: [outside] });
    await expect(authenticateTeacherLDAP('teacher.one', 'password', {
      config: config(), ldapModule: fakeLdapModule(client),
    })).rejects.toMatchObject({ code: 'LDAP_NOT_TEACHER' });
    expect(client.bind).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid user password and always unbinds', async () => {
    const client = fakeLdapClient({
      entries: [validEntry()],
      bindErrors: [null, new Error('invalid credentials')],
    });
    await expect(authenticateTeacherLDAP('teacher.one', 'wrong-password', {
      config: config(), ldapModule: fakeLdapModule(client),
    })).rejects.toMatchObject({ code: 'LDAP_INVALID_CREDENTIALS' });
    expect(client.unbind).toHaveBeenCalledTimes(1);
  });

  it('fails before creating a client when the feature flag is disabled', async () => {
    const client = fakeLdapClient();
    const ldapModule = fakeLdapModule(client);
    await expect(authenticateTeacherLDAP('teacher.one', 'password', {
      config: config({ enabled: false }), ldapModule,
    })).rejects.toBeInstanceOf(TeacherLdapError);
    expect(ldapModule.createClient).not.toHaveBeenCalled();
  });
});
