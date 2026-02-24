const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Passwort ändern
 * POST /api/change-password
 * Benötigt: Authorization header mit Bearer token
 * Body: { oldPassword, newPassword }
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId; // Vom authenticateToken Middleware erhalten

    // Eingaben validieren
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Altes und neues Passwort sind erforderlich'
      });
    }

    // Neue Passwortlänge validieren
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Neues Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    // Benutzer suchen
    const user = await prisma.benutzer.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Benutzer nicht gefunden'
      });
    }

    // Altes Passwort verifizieren
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwort_hash);
    
    if (!isOldPasswordValid) {
      return res.status(401).json({
        error: 'Aktuelles Passwort ist falsch'
      });
    }

    // Prüfen ob neues Passwort identisch mit altem ist
    /*
    const isSamePassword = await bcrypt.compare(newPassword, user.passwort_hash);
    
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Neues Passwort darf nicht mit dem alten übereinstimmen'
      });
    }
      */

    // Neues Passwort hashen
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Passwort aktualisieren
    await prisma.benutzer.update({
      where: { id: userId },
      data: {
        passwort_hash: hashedPassword
      }
    });

    console.log(`✅ Passwort für Benutzer ${user.email} erfolgreich geändert`);

    return res.json({
      message: 'Passwort erfolgreich geändert'
    });

  } catch (error) {
    console.error('❌ Fehler beim Ändern des Passworts:', error);
    return res.status(500).json({
      error: 'Serverfehler beim Ändern des Passworts'
    });
  }
};

module.exports = {
  changePassword
};