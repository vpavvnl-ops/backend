const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
<<<<<<< HEAD
const jwt = require('jsonwebtoken');
=======
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061

// REGISTER
exports.register = async (req, res) => {

    try {

<<<<<<< HEAD
        const {
            username,
            email,
            password,
            confirm_password,
            referral_id
        } = req.body;
=======
        const { username, email, password, confirm_password, referral_id } = req.body;
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061

        if (!username || !email || !password || !confirm_password) {
<<<<<<< HEAD

=======
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            });
<<<<<<< HEAD

        }

        if (password !== confirm_password) {

=======
        }

        if (password !== confirm_password) {
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
            return res.status(400).json({
                success: false,
                message: 'Password and Confirm Password do not match.'
            });
<<<<<<< HEAD

        }

        // Existing User Check
        const existingUser = await User.findOne({ email });

        if (existingUser) {

=======
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
            return res.status(409).json({
                success: false,
                message: 'Email is already registered.'
            });
<<<<<<< HEAD

        }

        // Referral Check
=======
        }

>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
        let referringUser = null;

        if (referral_id) {

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
        }

<<<<<<< HEAD
        // Password Hash
=======
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

<<<<<<< HEAD
        // Generate Referral Code
=======
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
        const generateReferralCode = () =>
            `USER${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        let newReferralCode = generateReferralCode();

        while (await User.findOne({ referral_code: newReferralCode })) {

            newReferralCode = generateReferralCode();

        }

<<<<<<< HEAD
        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Create User
=======
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
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
            otp
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
<<<<<<< HEAD

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

// LOGIN WITH JWT
exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
=======
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required.'
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
<<<<<<< HEAD
=======
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
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
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
<<<<<<< HEAD
            message: 'Login successful',
            token
=======
            message: 'Login successful'
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
        });

    } catch (error) {

        console.error('Login Error:', error);

        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });

    }
<<<<<<< HEAD

};
=======
};
>>>>>>> c8d253e42948387cc2b63c3a380d721522c9d061
