const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken } = require('../app.utils');
const { authenticateLDAP } = require('../app.ldap');
const {
  loadLdapLinkingPolicy,
  provisionLdapTeacher,
} = require('../services/ldapTeacherProvisioning');

// --- User Login ---
const login = async (req, res) => {
  const { email, identifier, password, loginMethod } = req.body;
  const loginIdentifier = loginMethod === 'ldap' ? (identifier || email) : email;

  // --- 1. Validate input ---
  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false, 
      message: 'Email or password missing' 
    });
  }

  // --- 2. Find user ---
  try {
    let user;

    // LDAP authentication branch
    if (loginMethod === 'ldap') {
      let ldapEntry;
      try {
        ldapEntry = await authenticateLDAP(loginIdentifier, password);
      } catch (ldapError) {
        const unavailable = ['LDAP_DISABLED', 'LDAP_CONFIGURATION_ERROR', 'LDAP_SEARCH_BIND_FAILED', 'LDAP_SEARCH_FAILED']
          .includes(ldapError && ldapError.code);
        return res.status(unavailable ? 503 : 401).json({
          success: false,
          message: unavailable
            ? 'Teacher LDAP login is currently unavailable'
            : 'Invalid credentials or Teacher LDAP access is not permitted'
        });
      }

      // No database operation occurs until authenticateLDAP has completed the
      // returned-DN user bind and confirmed the Teacher subtree mapping.
      try {
        user = await provisionLdapTeacher(ldapEntry, {
          prismaClient: prisma,
          policy: loadLdapLinkingPolicy(),
        });
      } catch {
        return res.status(403).json({
          success: false,
          message: 'Teacher LDAP account cannot be linked or provisioned'
        });
      }

    } else {
      // --- 2b. EXISTING: local Prisma lookup ---
      user = await prisma.user.findUnique({
        where: { email: email },
        include: {
          userRoles: { include: { role: true } }
        }
      });

      // --- 3. Validate user and password (LOCAL ONLY) ---
      if (!user || !user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    }

    // --- 4. Get all user roles ---
    const roles = (user.userRoles || []).map(ur => ({
      id: ur.roleId,
      name: ur.role.name
    }));

    // --- 5. Generate token. The JWT identifies the user; roles remain database-backed. ---
    const token = generateToken(user.id);

    // --- 6. Send every role assigned to the authenticated local user. ---
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          hasLocalPassword: Boolean(user.passwordHash),
          authMethod: loginMethod === 'ldap' ? 'ldap' : 'local',
          roles  // Return all roles
        },
        token
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// --- User Logout ---
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

module.exports = {
  login,
  logout
};
