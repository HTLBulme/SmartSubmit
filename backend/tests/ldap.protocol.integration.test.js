const ldap = require('ldapjs');
const { authenticateTeacherLDAP } = require('../src/app.ldap');

const teacherBaseDn = 'ou=lehrer,ou=people,dc=bin,dc=at';
const teacherDn = `uid=teacher.integration,${teacherBaseDn}`;
const serviceDn = 'cn=ldap-reader,dc=bin,dc=at';

describe('Teacher LDAP protocol integration', () => {
  let server;
  let url;

  beforeAll((done) => {
    server = ldap.createServer();

    server.bind(serviceDn, (req, res, next) => {
      if (req.credentials !== 'reader-password') return next(new ldap.InvalidCredentialsError());
      res.end();
      return next();
    });

    server.bind(teacherDn, (req, res, next) => {
      if (req.credentials !== 'teacher-password') return next(new ldap.InvalidCredentialsError());
      res.end();
      return next();
    });

    server.search(teacherBaseDn, (req, res, next) => {
      const attributes = {
        uid: 'teacher.integration',
        mail: 'teacher.integration@example.com',
        gecos: 'Integration Teacher',
        givenName: 'Integration',
        entryUUID: 'integration-uuid',
        objectClass: ['top', 'inetOrgPerson', 'posixAccount'],
      };
      if (req.filter.matches(attributes)) res.send({ dn: teacherDn, attributes });
      res.end();
      return next();
    });

    server.listen(0, '127.0.0.1', () => {
      url = server.url;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('performs real service bind, subtree search, returned-DN bind, and attribute decoding', async () => {
    const profile = await authenticateTeacherLDAP('teacher.integration', 'teacher-password', {
      config: {
        enabled: true,
        url,
        teacherBaseDn,
        loginAttribute: 'uid',
        bindMode: 'service',
        bindDn: serviceDn,
        bindPassword: 'reader-password',
        connectTimeoutMs: 1000,
        operationTimeoutMs: 1000,
        searchSizeLimit: 2,
        attributes: ['uid', 'mail', 'gecos', 'givenname', 'entryuuid', 'objectclass'],
      },
    });

    expect(profile).toEqual(expect.objectContaining({
      dn: teacherDn,
      uid: 'teacher.integration',
      mail: 'teacher.integration@example.com',
      entryUUID: 'integration-uuid',
      role: 'Teacher',
      teacherMappingConfirmed: true,
    }));
    expect(profile.objectClass).toEqual(expect.arrayContaining(['inetOrgPerson', 'posixAccount']));
  });
});
