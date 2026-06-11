const Admin = require('../../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/admin/login
// @desc    Authenticate admin & get token
// @access  Public
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate Input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // 2. Find admin by email
    const admin = await Admin.findOne({
  email: email.toLowerCase().trim()
});
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 3. Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact super admin.'
      });
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 5. Generate JWT
    const payload = { id: admin._id, role: admin.role };
    const token = jwt.sign(payload, process.env.ADMIN_JWT_SECRET, {
      expiresIn: '7d'
    });

    // 6. Update lastLogin
    admin.lastLogin = new Date();
    await admin.save();

    // 7. Prepare response (excluding password)
    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: adminData
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @route   GET /api/admin/profile
// @desc    Get logged in admin profile
// @access  Private (Requires Token)
exports.getProfile = async (req, res) => {
  try {
    // req.admin is already attached and sanitized by adminAuth middleware
    return res.status(200).json({
      success: true,
      message: 'Admin profile retrieved successfully',
      data: req.admin
    });
  } catch (error) {
    console.error('Admin Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile'
    });
  }
};