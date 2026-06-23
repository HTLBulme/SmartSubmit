const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken } = require('../app.utils');
const { authenticateLDAP } = require('../app.ldap');

// --- User Login with role support ---
const login = async (req, res) => {
  const { email, password, role, loginMethod } = req.body;

  // --- 1. Validate input ---
  if (!email || !password) {
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
        ldapEntry = await authenticateLDAP(email, password);
      } catch (ldapError) {
        return res.status(401).json({
          success: false,
          message: 'LDAP login failed'
        });
      }

    // Find or auto-provision the local user record
    const userEmail = ldapEntry.mail || email;
    user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        userRoles: { include: { role: true } }
      }
    });
    if (!user) {
      // Auto-create on first LDAP login — default role can be adjusted
      user = await prisma.user.create({
        data: {
          email: userEmail,
          firstName: ldapEntry.givenName || '',
          lastName: ldapEntry.sn || '',
          provider: 'ldap',
          passwordHash: null, // LDAP owns the credential, not us
        },
        // include: { userRoles: { include: { role: true } } }
      });
        // --- NEW: assign default "Student" role to new LDAP users (for Demo purposes) ---
      const studentRole = await prisma.role.findFirst({
        where: { name: 'Student' },
        select: { id: true }
      });

      if (studentRole) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: studentRole.id }
        });
      }
    // Re-fetch the user including the role we just assigned,
      // so the rest of the function (roles.map below) works correctly
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { userRoles: { include: { role: true } } }
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

    // --- 5. If a role is specified, check if user has that role ---
    if (role) {
      const hasRole = roles.some(
        r => r.name.toLowerCase() === role.toLowerCase()
      );
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `You do not have ${role} permission`
        });
      }
    }

    // --- 6. Generate token ---
    const token = generateToken(user.id);

    // --- 7. Send success response ---
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
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