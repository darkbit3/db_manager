const jwt = require('jsonwebtoken');
const SQLiteUser = require('../models/SQLiteUser');
const logger = require('../config/logger');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

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

    // Check if user already exists
    const existingUser = await user.findByUsernameOrEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Create new user
    const newUser = await user.create({
      username,
      email,
      password,
      role: role || 'user'
    });

    // Generate token
    const token = generateToken(newUser.id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        },
        token
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Find user by email
    const foundUser = await user.findByEmail(email);
    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.verifyPassword(foundUser, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(foundUser.id);

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: foundUser.id,
          username: foundUser.username,
          email: foundUser.email,
          role: foundUser.role
        },
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

const getProfile = async (req, res) => {
  try {
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
    
    const foundUser = await user.findById(req.user.userId);
    
    if (!foundUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: foundUser
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
