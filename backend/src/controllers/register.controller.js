const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken, validateEmail } = require('../app.utils');

// --- Admin Registration (only first admin can register) ---
const register = async (req, res) => {
  try {
    const { email, password, roleId } = req.body;

    // --- 1. Validate required fields ---
    if (!email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and role are required'
      });
    }


    // --- 2. Check if admin already exists ---
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    const adminCount = await prisma.userRole.count({
      where: { roleId: adminRole.id }
    });

    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Registration is disabled. Please contact the administrator.'
      });
    }

    // --- 3. Only allow admin registration (roleId must be adminRole.id) ---
    if (parseInt(roleId) !== adminRole.id) {
      return res.status(400).json({
        success: false,
        message: 'Only admin registration is allowed'
      });
    }

    // --- 4. Validate email format ---
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // --- 5. Check if email already exists ---
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address already registered'
      });
    }

    // --- 6. Check password strength ---
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }


    // --- 7. Hash password ---
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- 8. Create user and assign role (using transaction) ---
    const newUser = await prisma.$transaction(async (tx) => {
      // --- Create user (default name: Admin) ---
      const user = await tx.user.create({
        data: {
          firstName: 'Admin',
          lastName: 'System',
          email: email,
          passwordHash: hashedPassword
        }
      });

      // --- Assign admin role ---
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id
        }
      });

      return user;
    });

    // --- 9. Generate token ---
    const token = generateToken(newUser.id);

    // --- 10. Send success response ---
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Registrierung Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  register
};