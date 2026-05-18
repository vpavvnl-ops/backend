const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// REGISTER
exports.register = async (req, res) => {

    try {

        const {
            username,
            email,
            password,
            confirm_password,
            referral_id
        } = req.body;

        // Validation
        if (
            !username ||
            !email ||
            !password ||
            !confirm_password ||
            !referral_id
        ) {

            return res.status(400).json({
                success: false,
                message: 'All fields including Referral ID are required.'
            });

        }

        // Password Match
        if (password !== confirm_password) {

            return res.status(400).json({
                success: false,
                message: 'Password and Confirm Password do not match.'
            });

        }

        // Existing User Check
        const existingUser = await User.findOne({ email });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: 'Email is already registered.'
            });

        }

        // Referral Check
        let referringUser = null;

        if (referral_id !== "ADMIN123") {

            referringUser = await User.findOne({
                referral_code: referral_id
            });

            if (!referringUser) {

                return res.status(400).json({
                    success: false,
                    message: 'Invalid Referral ID.'
                });

            }
        }

        // Password Hash
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Referral Code
        const generateReferralCode = () =>
            `USER${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        let newReferralCode = generateReferralCode();

        while (await User.findOne({ referral_code: newReferralCode })) {

            newReferralCode = generateReferralCode();

        }

        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Create User
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            referral_code: newReferralCode,
            referred_by: referringUser ? referringUser._id : null,
            otp,
            otp_expiry,
            is_verified: false
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            otp,
            referral_code: newReferralCode
        });

    } catch (error) {

        console.error('Registration Error:', error);

        res.status(500).json({
            success: false,
            message: 'Server error during registration.'
        });

    }

};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {

    try {

        const { email, otp } = req.body;

        if (!email || !otp) {

            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required.'
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });

        }

        if (user.is_verified) {

            return res.status(400).json({
                success: false,
                message: 'Account already verified.'
            });

        }

        if (user.otp !== otp) {

            return res.status(400).json({
                success: false,
                message: 'Invalid OTP.'
            });

        }

        if (user.otp_expiry < new Date()) {

            return res.status(400).json({
                success: false,
                message: 'OTP expired.'
            });

        }

        user.is_verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Account verified successfully.'
        });

    } catch (error) {

        console.error('OTP Error:', error);

        res.status(500).json({
            success: false,
            message: 'Server error.'
        });

    }

};

// LOGIN
exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        if (!user.is_verified) {

            return res.status(400).json({
                success: false,
                message: 'Please verify your account first'
            });

        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });

        }

        // JWT TOKEN
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                referral_code: user.referral_code
            }
        });

    } catch (error) {

        console.error('Login Error:', error);

        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });

    }

};

// FORGOT PASSWORD OTP SEND
exports.forgotPassword = async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // OTP Expiry
        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Save OTP
        user.otp = otp;
        user.otp_expiry = otp_expiry;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            otp
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};

// RESET PASSWORD WITH OTP
exports.resetPassword = async (req, res) => {

    try {

        const {
            email,
            otp,
            newPassword
        } = req.body;

        if (
            !email ||
            !otp ||
            !newPassword
        ) {

            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        // OTP Check
        if (user.otp !== otp) {

            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });

        }

        // OTP Expiry Check
        if (user.otp_expiry < new Date()) {

            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });

        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            newPassword,
            salt
        );

        // Update Password
        user.password = hashedPassword;

        // Clear OTP
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};