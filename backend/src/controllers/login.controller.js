const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken } = require('../app.utils');

// --- User Login with role support ---
const login = async (req, res) => {
  const { email, password, role } = req.body;

  // --- 1. Validate input ---
  if (!email || !password) {
    return res.status(400).json({
      success: false, 
      message: 'Email or password missing' 
    });
  }

  // --- 2. Find user ---
  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: {
        userRoles: { include: { role: true } }
      }
    });
    // --- 3. Validate user and password ---
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // --- 4. Get all user roles ---
    const roles = user.userRoles.map(ur => ({
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