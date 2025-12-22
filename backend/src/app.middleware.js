const jwt = require('jsonwebtoken');
const { prisma } = require('./app.config');

/**
 * Authenticate token and extract userId
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
                                      
  if (!token) {
    return res.status(401).json({ success: false, message: 'Kein Token' });
  }
                           
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token ungültig' });
    }
    req.userId = decoded.userId;
    next();
  });
};

/**
 * Check if user has admin role
 */
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
                                        
  if (!token) {
    return res.status(401).json({ success: false, message: 'Kein Token' });
  }
                             
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token ungültig' });
    }

    const userRole = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: decoded.userId, rolle_id: 3 }
    });

    if (!userRole) {
      return res.status(403).json({ success: false, message: 'Nur für Admins' });
    } 

    req.userId = decoded.userId;
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateAdmin
};