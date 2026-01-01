const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken, validateEmail } = require('../app.utils');

/**
 * Admin Registration (only first admin can register)
 */
const register = async (req, res) => {
  try {
    const { email, password, roleId } = req.body;

    // 1. Validate required fields
    if (!email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Email, Passwort und Rolle sind erforderlich'
      });
    }

    // 2. Check if admin already exists
    const adminCount = await prisma.benutzerRolle.count({
      where: { rolle_id: 3 }
    });

    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Registrierung ist deaktiviert. Bitte wenden Sie sich an den Administrator.'
      });
    }

    // 3. Only allow admin registration (roleId must be 3)
    if (parseInt(roleId) !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Nur Admin-Registrierung ist erlaubt'
      });
    }

    // 4. Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige E-Mail-Adresse'
      });
    }

    // 5. Check if email already exists
    const existingUser = await prisma.benutzer.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse bereits registriert'
      });
    }

    // 6. Check password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create user and assign role (using transaction)
    const newUser = await prisma.$transaction(async (tx) => {
      // Create user (default name: Admin)
      const user = await tx.benutzer.create({
        data: {
          vorname: 'Admin',
          nachname: 'System',
          email: email,
          passwort_hash: hashedPassword
        }
      });

      // Assign admin role
      await tx.benutzerRolle.create({
        data: {
          benutzer_id: user.id,
          rolle_id: 3
        }
      });

      return user;
    });

    // 9. Generate token
    const token = generateToken(newUser.id);

    // 10. Send success response
    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
      data: {
        user: {
          id: newUser.id,
          vorname: newUser.vorname,
          nachname: newUser.nachname,
          email: newUser.email
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Registrierung Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
};

module.exports = {
  register
};