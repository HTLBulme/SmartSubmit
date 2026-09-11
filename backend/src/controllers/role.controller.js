const { prisma } = require('../app.config');

const APP_ROLES = new Set(['Admin', 'Teacher', 'Student']);

const selectRole = async (req, res) => {
  const roleName = typeof req.body?.role === 'string' ? req.body.role.trim() : '';

  if (!APP_ROLES.has(roleName)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role'
    });
  }

  try {
    const role = await prisma.role.findFirst({
      where: { name: roleName },
      select: { id: true, name: true }
    });

    if (!role) {
      return res.status(403).json({
        success: false,
        message: 'Role is not assigned to this user'
      });
    }

    const assignment = await prisma.userRole.findFirst({
      where: { userId: Number(req.userId), roleId: role.id },
      select: { id: true }
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'Role is not assigned to this user'
      });
    }

    return res.json({
      success: true,
      data: { role: role.name }
    });
  } catch (error) {
    console.error('Error validating active role:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { selectRole };
