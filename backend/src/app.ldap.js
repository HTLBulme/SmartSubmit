const ldap = require('ldapjs');

const DEFAULT_ATTRIBUTES = Object.freeze([
  'uid', 'mail', 'gecos', 'givenname', 'sn', 'cn', 'displayname',
  'entryuuid', 'objectclass', 'memberof',
]);

class TeacherLdapError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TeacherLdapError';
    this.code = code;
  }
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).trim().toLowerCase() === 'true';
}

function parseInteger(value, defaultValue, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : defaultValue;
}

function loadTeacherLdapConfig(env = process.env) {
  const host = env.LDAP_HOST || '172.16.90.249';
  const port = parseInteger(env.LDAP_PORT, 389, 1, 65535);
  return {
    enabled: parseBoolean(env.LDAP_TEACHER_LOGIN_ENABLED, false),
    url: env.LDAP_URL || `ldap://${host}:${port}`,
    teacherBaseDn: env.LDAP_TEACHER_BASE_DN || 'ou=lehrer,ou=people,dc=bin,dc=at',
    loginAttribute: env.LDAP_LOGIN_ATTRIBUTE || 'uid',
    bindMode: String(env.LDAP_BIND_MODE || 'anonymous').trim().toLowerCase(),
    bindDn: env.LDAP_BIND_DN || '',
    bindPassword: env.LDAP_BIND_PASSWORD || '',
    connectTimeoutMs: parseInteger(env.LDAP_CONNECT_TIMEOUT_MS, 5000, 250, 60000),
    operationTimeoutMs: parseInteger(env.LDAP_OPERATION_TIMEOUT_MS, 8000, 250, 60000),
    searchSizeLimit: parseInteger(env.LDAP_SEARCH_SIZE_LIMIT, 2, 2, 10),
    attributes: DEFAULT_ATTRIBUTES.slice(),
  };
}

function validateConfig(config) {
  if (!config.enabled) throw new TeacherLdapError('LDAP_DISABLED', 'Teacher LDAP login is disabled');
  if (!/^ldaps?:\/\//i.test(config.url)) {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'LDAP URL is invalid');
  }
  if (!config.teacherBaseDn) {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'Teacher LDAP search base is missing');
  }
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(config.loginAttribute)) {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'LDAP login attribute is invalid');
  }
  if (!['anonymous', 'service'].includes(config.bindMode)) {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'LDAP bind mode must be anonymous or service');
  }
  if (config.bindMode === 'service' && (!config.bindDn || !config.bindPassword)) {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'LDAP service bind credentials are missing');
  }
}

function firstValue(value) {
  if (Array.isArray(value)) return value.find((item) => String(item).trim() !== '') || '';
  return value === undefined || value === null ? '' : String(value);
}

function normalizeSearchEntry(entry) {
  const normalized = Object.create(null);
  const pojo = entry && entry.pojo;
  const dn = firstValue(
    (pojo && pojo.objectName) ||
    (entry && entry.objectName && entry.objectName.toString()) ||
    (entry && entry.dn && entry.dn.toString()) ||
    (entry && entry.object && entry.object.dn)
  );

  if (pojo && Array.isArray(pojo.attributes)) {
    for (const attribute of pojo.attributes) {
      if (!attribute || typeof attribute.type !== 'string') continue;
      normalized[attribute.type.toLowerCase()] = Array.isArray(attribute.values)
        ? attribute.values.map(String)
        : [String(attribute.values || '')];
    }
  } else if (entry && entry.object && typeof entry.object === 'object') {
    for (const [name, value] of Object.entries(entry.object)) {
      if (name.toLowerCase() === 'dn') continue;
      normalized[name.toLowerCase()] = Array.isArray(value) ? value.map(String) : [String(value)];
    }
  }

  const get = (name) => firstValue(normalized[name.toLowerCase()]);
  const getAll = (name) => (normalized[name.toLowerCase()] || []).slice();
  return {
    dn, uid: get('uid'), mail: get('mail'), gecos: get('gecos'),
    givenName: get('givenName'), sn: get('sn'), cn: get('cn'),
    displayName: get('displayName'), entryUUID: get('entryUUID'),
    objectClass: getAll('objectClass'), memberOf: getAll('memberOf'),
  };
}

function isDnWithinBase(dn, baseDn, ldapModule = ldap) {
  try {
    return ldapModule.parseDN(dn).childOf(ldapModule.parseDN(baseDn));
  } catch {
    return false;
  }
}

function bind(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (error) => error ? reject(error) : resolve());
  });
}

function search(client, baseDn, options) {
  return new Promise((resolve, reject) => {
    client.search(baseDn, options, (searchError, response) => {
      if (searchError) return reject(searchError);
      const entries = [];
      let settled = false;
      const finish = (callback) => {
        if (settled) return;
        settled = true;
        callback();
      };
      response.on('searchEntry', (entry) => entries.push(normalizeSearchEntry(entry)));
      response.on('error', (error) => finish(() => reject(error)));
      response.on('end', (result) => finish(() => {
        const status = result && Number.isInteger(result.status) ? result.status : 0;
        if (status !== 0 && entries.length <= 1) {
          return reject(new TeacherLdapError('LDAP_SEARCH_FAILED', 'LDAP search did not complete successfully'));
        }
        resolve(entries);
      }));
    });
  });
}

function unbindQuietly(client) {
  if (!client) return Promise.resolve();
  return new Promise((resolve) => {
    try { client.unbind(() => resolve()); } catch { resolve(); }
  });
}

async function authenticateTeacherLDAP(identifier, password, options = {}) {
  const ldapModule = options.ldapModule || ldap;
  const config = options.config || loadTeacherLdapConfig();
  validateConfig(config);

  const uid = typeof identifier === 'string' ? identifier.trim() : '';
  if (!uid || typeof password !== 'string' || password.length === 0) {
    throw new TeacherLdapError('LDAP_INVALID_CREDENTIALS', 'LDAP credentials are invalid');
  }

  let client;
  try {
    client = ldapModule.createClient({
      url: config.url,
      connectTimeout: config.connectTimeoutMs,
      timeout: config.operationTimeoutMs,
      reconnect: false,
    });
  } catch {
    throw new TeacherLdapError('LDAP_CONFIGURATION_ERROR', 'LDAP client could not be created');
  }
  client.on('error', () => {});

  try {
    try {
      if (config.bindMode === 'service') await bind(client, config.bindDn, config.bindPassword);
      else await bind(client, '', '');
    } catch {
      throw new TeacherLdapError('LDAP_SEARCH_BIND_FAILED', 'LDAP search bind failed');
    }

    const filter = new ldapModule.EqualityFilter({
      attribute: config.loginAttribute,
      value: uid,
    });

    let entries;
    try {
      entries = await search(client, config.teacherBaseDn, {
        filter,
        scope: 'sub',
        sizeLimit: config.searchSizeLimit,
        timeLimit: Math.max(1, Math.ceil(config.operationTimeoutMs / 1000)),
        attributes: config.attributes,
      });
    } catch (error) {
      if (error instanceof TeacherLdapError) throw error;
      throw new TeacherLdapError('LDAP_SEARCH_FAILED', 'LDAP Teacher search failed');
    }

    if (entries.length === 0) {
      throw new TeacherLdapError('LDAP_TEACHER_NOT_FOUND', 'Teacher LDAP identity was not found');
    }
    if (entries.length !== 1) {
      throw new TeacherLdapError('LDAP_IDENTITY_AMBIGUOUS', 'LDAP identity is ambiguous');
    }

    const profile = entries[0];
    if (!profile.dn || !isDnWithinBase(profile.dn, config.teacherBaseDn, ldapModule)) {
      throw new TeacherLdapError('LDAP_NOT_TEACHER', 'LDAP identity is outside the Teacher subtree');
    }
    if (!profile.uid || profile.uid.toLowerCase() !== uid.toLowerCase()) {
      throw new TeacherLdapError('LDAP_IDENTITY_MISMATCH', 'LDAP uid does not match the requested identity');
    }

    try {
      await bind(client, profile.dn, password);
    } catch {
      throw new TeacherLdapError('LDAP_INVALID_CREDENTIALS', 'LDAP credentials are invalid');
    }

    return { ...profile, role: 'Teacher', teacherMappingConfirmed: true };
  } finally {
    await unbindQuietly(client);
  }
}

module.exports = {
  DEFAULT_ATTRIBUTES,
  TeacherLdapError,
  authenticateLDAP: authenticateTeacherLDAP,
  authenticateTeacherLDAP,
  isDnWithinBase,
  loadTeacherLdapConfig,
  normalizeSearchEntry,
};
