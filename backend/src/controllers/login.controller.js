const bcrypt = require('bcryptjs');
const { prisma } = require('../app.config');
const { generateToken } = require('../app.utils');

/**
 * User Login with role support
 */
const login = async (req, res) => {
  const { email, passwort, role } = req.body;

  // 1. Validate input
  if (!email || !passwort) {
    return res.status(400).json({
      success: false, 
      message: 'Email oder Passwort fehlen' 
    });
  }

  // 2. Find user
  try {
    const user = await prisma.benutzer.findUnique({
      where: { email: email },
      include: {
        benutzer_rollen: { include: { rolle: true } }
      }
    });
    
    // 3. Validate user and password
    if (!user || !await bcrypt.compare(passwort, user.passwort_hash)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Falsche Anmeldedaten' 
      });
    }

    // 4. Get all user roles
    const roles = user.benutzer_rollen.map(br => ({
      id: br.rolle_id,
      bezeichnung: br.rolle.bezeichnung
    }));
    
    // 5. If a role is specified, check if user has that role
    if (role) {
      const hasRole = roles.some(
        r => r.bezeichnung.toLowerCase() === role.toLowerCase()
      );
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Sie haben keine ${role}-Berechtigung`
        });
      }
    }

    // 6. Generate token
    const token = generateToken(user.id);
    
    // 7. Send success response
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          vorname: user.vorname,
          nachname: user.nachname,
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
      message: 'Server Fehler' 
    });
  }
};

/**
 * User Logout
 */
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Abmeldung erfolgreich'
  });
};

module.exports = {
  login,
  logout
};