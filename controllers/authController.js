const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOtpEmail } = require('../utils/emailService');

// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, email, password, confirm_password, referral_id } = req.body;

        // 1. Basic Validation
        if (!username || !email || !password || !confirm_password || !referral_id) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ success: false, message: 'Password and Confirm Password do not match.' });
        }

        // 2. Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email is already registered.' });
        }

        // 3. Referral Logic (UPDATED ✅)
        let referringUser = null;

        if (referral_id !== "ADMIN123") {
            referringUser = await User.findOne({ referral_code: referral_id });

            if (!referringUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Referral ID. Referring user not found.'
                });
            }
        }

        // 4. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Generate Unique Referral Code
        const generateReferralCode = () => `USER${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        let newReferralCode = generateReferralCode();

        while (await User.findOne({ referral_code: newReferralCode })) {
            newReferralCode = generateReferralCode();
        }

        // 6. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

        // 7. Create User
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

        // 8. Send OTP Email (temporary off)
// await sendOtpEmail(email, otp);

// 9. Send Response (OTP direct दिखाओ)
res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    otp: otp
});

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ success: false, message: 'Account is already verified.' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        if (user.otp_expiry < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        user.is_verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Account verified successfully. You can now log in.'
        });

    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
    }
};