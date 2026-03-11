const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Change password ---
// POST /api/change-password
// Requires: Authorization header with Bearer token
// Body: { oldPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId; // Set by authenticateToken middleware

    // --- Validate input --- 
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Old and new password are required'
      });
    }

    // --- Validate new password length ---
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // --- Find user ---
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // --- Verify old password ---
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    
    if (!isOldPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // --- Check if new password is identical to old password ---
    /*
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Neues Passwort darf nicht mit dem alten übereinstimmen'
      });
    }
      */

    // --- Hash new password ---
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // --- Update password ---
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword
      }
    });

    console.log(`✅ Password for user ${user.email} changed successfully`);

    return res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    return res.status(500).json({
      error: 'Server error while changing password'
    });
  }
};

module.exports = {
  changePassword
};