const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT token for a given user ID
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in the environment variables');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: '7d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate presence and type of required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please provide name, email, and password'
      });
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'Invalid input format'
      });
    }

    // Validate name trimmed length
    if (name.trim().length < 2) {
      return res.status(400).json({
        message: 'Name must be at least 2 characters long'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Create user (password will be hashed automatically by pre-save hook in User model)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    // Return safe JSON response without password or password hash
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Handle duplicate key error from MongoDB if race condition occurs
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Pass to centralized error handling middleware
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate presence and type of email and password
    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide both email and password'
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        message: 'Invalid input format'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Verify user exists and password matches
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return token and safe user details
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires JWT)
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware (excluding password)
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
