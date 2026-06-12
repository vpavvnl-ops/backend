const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the token
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the dedicated admin secret
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

      // Retrieve admin from database and explicitly exclude the password
      const admin = await Admin.findById(decoded.id).select('-password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, admin not found'
        });
      }

      // Check if the admin account is active
      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, admin account is deactivated'
        });
      }

      // Attach the sanitized admin object to the request
      req.admin = admin;
      next();
    } catch (error) {
      console.error('Admin Auth Middleware Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

module.exports = { adminAuth };