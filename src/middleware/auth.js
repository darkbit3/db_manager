const jwt = require('jsonwebtoken');
const SQLiteUser = require('../models/SQLiteUser');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get the model manager and user model
    const modelManager = global.modelManager;
    if (!modelManager) {
      return res.status(500).json({
        success: false,
        error: 'Model manager not initialized'
      });
    }

    const userModel = modelManager.getModel('User');
    if (!userModel) {
      return res.status(500).json({
        success: false,
        error: 'User model not initialized'
      });
    }

    // Initialize SQLiteUser model
    const user = new SQLiteUser();
    await user.initialize(userModel.connection);
    
    const foundUser = await user.findById(decoded.userId);

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
    }

    req.user = foundUser;
    req.user.id = foundUser.id; // Add id for compatibility
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
