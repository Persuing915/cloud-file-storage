const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect private routes by verifying Bearer JWT
 */
const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and follows Bearer scheme
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      // Extract the token after 'Bearer '
      token = req.headers.authorization.split(' ')[1];

      if (!token || token.trim() === '') {
        return res.status(401).json({
          message: 'Not authorized, token missing'
        });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('Error: JWT_SECRET is not defined in .env');
        return res.status(500).json({
          message: 'Server configuration error'
        });
      }

      // Verify token signature and expiration
      const decoded = jwt.verify(token, secret);

      // Find user by decoded ID, excluding the password field
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          message: 'Not authorized, user not found'
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        message: 'Not authorized, token invalid or expired'
      });
    }
  }

  // If Authorization header is missing or does not start with 'Bearer '
  return res.status(401).json({
    message: 'Not authorized, no token provided'
  });
};

module.exports = {
  protect
};
