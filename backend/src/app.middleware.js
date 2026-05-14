const jwt = require('jsonwebtoken');
const { prisma } = require('./app.config');

// --- Authenticate token and extract userId ---
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
                                      
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
                           
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId || decoded.id;
    next();
  });
};

// --- Check if user has admin role ---
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
                                        
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
                             
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }

    try {
      // Query Admin role by name (more robust than hard-coded roleId)
      const adminRole = await prisma.role.findFirst({
        where: { name: 'Admin' },
        select: { id: true }
      });

      if (!adminRole) {
        return res.status(403).json({ success: false, message: 'Admin role not configured' });
      }

      const userRole = await prisma.userRole.findFirst({
        where: { userId: decoded.userId, roleId: adminRole.id }
      });

      if (!userRole) {
        return res.status(403).json({ success: false, message: 'Admins only' });
      } 

      req.userId = decoded.userId;
      next();
    } catch (error) {
      console.error('Error checking admin role:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });
};

module.exports = {
  authenticateToken,
  authenticateAdmin
};