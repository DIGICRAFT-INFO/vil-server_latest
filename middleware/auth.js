const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - must be logged in
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
  }
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
};

// Admin or SuperAdmin only
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied - Admin only' });
  }
};

// SuperAdmin only
const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied - SuperAdmin only' });
  }
};

module.exports = { protect, adminOnly, superAdminOnly };
