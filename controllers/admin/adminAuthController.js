const Admin = require('../../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// =====================================
// ADMIN LOGIN
// =====================================

exports.loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password'
            });
        }

        const admin = await Admin.findOne({
            email: email.toLowerCase().trim()
        });

        console.log('====================');
        console.log('LOGIN EMAIL:', email);
        console.log('ADMIN FOUND:', admin);
        console.log('====================');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            admin.password
        );

        console.log('PASSWORD MATCH:', isMatch);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const payload = {
            id: admin._id,
            role: admin.role
        };

        const token = jwt.sign(
            payload,
            process.env.ADMIN_JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        admin.lastLogin = new Date();
        await admin.save();

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    isActive: admin.isActive,
                    lastLogin: admin.lastLogin
                }
            }
        });

    } catch (error) {

        console.error('ADMIN LOGIN ERROR:', error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// =====================================
// ADMIN PROFILE
// =====================================

exports.getProfile = async (req, res) => {
    try {

        return res.status(200).json({
            success: true,
            message: 'Admin profile retrieved successfully',
            data: req.admin
        });

    } catch (error) {

        console.error('ADMIN PROFILE ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error retrieving profile'
        });

    }
};