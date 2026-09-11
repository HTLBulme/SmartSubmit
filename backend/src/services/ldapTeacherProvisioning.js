const { validateEmail } = require('../app.utils');

class LdapProvisioningError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LdapProvisioningError';
    this.code = code;
  }
}

function isEnabled(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function loadLdapLinkingPolicy(env = process.env) {
  return {
    linkExistingTeacherByEmail: isEnabled(env.LDAP_LINK_EXISTING_TEACHER_BY_EMAIL),
  };
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasRole(user, roleName) {
  return Array.isArray(user && user.userRoles) && user.userRoles.some(
    (assignment) => assignment && assignment.role && assignment.role.name === roleName
  );
}

function identityUpdate(profile, existingUser) {
  const entryUUID = clean(profile.entryUUID);
  const currentExternalId = clean(existingUser && existingUser.ldapExternalId);
  if (entryUUID && currentExternalId && entryUUID !== currentExternalId) {
    throw new LdapProvisioningError('LDAP_IDENTITY_CONFLICT', 'LDAP external identity does not match');
  }

  return {
    ldapExternalId: entryUUID || currentExternalId || null,
    ldapUid: clean(profile.uid),
    ldapDn: clean(profile.dn),
  };
}

async function provisionLdapTeacher(profile, options) {
  const prismaClient = options && options.prismaClient;
  const policy = (options && options.policy) || loadLdapLinkingPolicy();

  if (!prismaClient || typeof prismaClient.$transaction !== 'function') {
    throw new TypeError('A Prisma client is required');
  }
  if (!profile || profile.teacherMappingConfirmed !== true || profile.role !== 'Teacher') {
    throw new LdapProvisioningError('LDAP_MAPPING_NOT_CONFIRMED', 'Teacher LDAP mapping was not confirmed');
  }

  const uid = clean(profile.uid);
  const dn = clean(profile.dn);
  const mail = clean(profile.mail).toLowerCase();
  const externalId = clean(profile.entryUUID);

  if (!uid || !dn) {
    throw new LdapProvisioningError('LDAP_IDENTITY_INCOMPLETE', 'LDAP uid or DN is missing');
  }
  if (!mail || !validateEmail(mail)) {
    throw new LdapProvisioningError('LDAP_MAIL_REQUIRED', 'A valid LDAP mail attribute is required');
  }

  return prismaClient.$transaction(async (tx) => {
    const teacherRole = await tx.role.findFirst({
      where: { name: 'Teacher' },
      select: { id: true, name: true },
    });
    if (!teacherRole) {
      throw new LdapProvisioningError('TEACHER_ROLE_MISSING', 'Teacher role is not configured');
    }

    const identityFilters = [{ ldapUid: uid }];
    if (externalId) identityFilters.unshift({ ldapExternalId: externalId });

    let user = await tx.user.findFirst({
      where: { OR: identityFilters },
      include: { userRoles: { include: { role: true } } },
    });

    if (user && user.active === false) {
      throw new LdapProvisioningError('LOCAL_USER_INACTIVE', 'The local user is inactive');
    }

    if (!user) {
      const emailUser = await tx.user.findUnique({
        where: { email: mail },
        include: { userRoles: { include: { role: true } } },
      });

      if (emailUser) {
        if (!policy.linkExistingTeacherByEmail || !hasRole(emailUser, 'Teacher')) {
          throw new LdapProvisioningError(
            'LDAP_EMAIL_LINK_REQUIRED',
            'An existing account requires an explicit Teacher email-linking policy'
          );
        }
        if (emailUser.active === false) {
          throw new LdapProvisioningError('LOCAL_USER_INACTIVE', 'The local user is inactive');
        }
        if (clean(emailUser.ldapExternalId) || clean(emailUser.ldapUid)) {
          throw new LdapProvisioningError('LDAP_IDENTITY_CONFLICT', 'The existing account is already linked');
        }

        user = await tx.user.update({
          where: { id: emailUser.id },
          data: identityUpdate(profile, emailUser),
          include: { userRoles: { include: { role: true } } },
        });
      } else {
        const firstName = clean(profile.givenName);
        const lastName = clean(profile.sn) || clean(profile.gecos) || clean(profile.displayName) || clean(profile.cn);
        user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email: mail,
            passwordHash: null,
            provider: 'ldap',
            ...identityUpdate(profile, null),
          },
          include: { userRoles: { include: { role: true } } },
        });
      }
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: identityUpdate(profile, user),
        include: { userRoles: { include: { role: true } } },
      });
    }

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: teacherRole.id } },
      update: {},
      create: { userId: user.id, roleId: teacherRole.id },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } } },
    });
  });
}

module.exports = {
  LdapProvisioningError,
  loadLdapLinkingPolicy,
  provisionLdapTeacher,
};
