const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');


// =====================================
// REGISTER
// =====================================

exports.register = async (req, res) => {

    try {

        const {
            username,
            email,
            password,
            confirm_password,
            referral_id
        } = req.body;

        // VALIDATION
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

        // PASSWORD MATCH
        if (password !== confirm_password) {

            return res.status(400).json({
                success: false,
                message: 'Password and Confirm Password do not match.'
            });

        }

        // CHECK EXISTING USER
        const existingUser = await User.findOne({ email });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });

        }

        // REFERRAL CHECK
        let referringUser = null;

        if (referral_id !== 'ADMIN123') {

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

        // HASH PASSWORD
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            password,
            salt
        );

        // GENERATE REFERRAL CODE
        const generateReferralCode = () =>
            `USER${crypto.randomBytes(3)
            .toString('hex')
            .toUpperCase()}`;

        let newReferralCode = generateReferralCode();

        while (
            await User.findOne({
                referral_code: newReferralCode
            })
        ) {

            newReferralCode = generateReferralCode();

        }

        // OTP
        const otp = '123456';

        // OTP EXPIRY
        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // CREATE USER
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            referral_code: newReferralCode,
            referred_by: referringUser
                ? referringUser._id
                : null,
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

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// VERIFY REFERRAL
// =====================================

exports.verifyReferral = async (req, res) => {

    try {

        const { referral_code } = req.body;

        if (!referral_code) {

            return res.status(400).json({
                success: false,
                message: 'Referral code is required'
            });

        }

        // ADMIN REFERRAL
        if (referral_code === 'ADMIN123') {

            return res.status(200).json({
                success: true,
                message: 'Referral code verified successfully',
                upline_name: 'Admin',
                referral_code: 'ADMIN123'
            });

        }

        const user = await User.findOne({
            referral_code
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'Invalid referral code'
            });

        }

        res.status(200).json({
            success: true,
            message: 'Referral code verified successfully',
            upline_name: user.username,
            referral_code: user.referral_code
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// VERIFY OTP
// =====================================

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

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// RESEND OTP
// =====================================

exports.resendOtp = async (req, res) => {

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

        if (user.is_verified) {

            return res.status(400).json({
                success: false,
                message: 'Account already verified'
            });

        }

        const otp = '123456';

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        user.otp = otp;
        user.otp_expiry = otp_expiry;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
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


// =====================================
// LOGIN
// =====================================

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

        // UPDATE LAST LOGIN
        user.last_login = new Date();

        await user.save();

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

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// FORGOT PASSWORD
// =====================================

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

        const otp = '123456';

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

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


// =====================================
// RESET PASSWORD
// =====================================

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

        if (user.otp !== otp) {

            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });

        }

        if (user.otp_expiry < new Date()) {

            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });

        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            newPassword,
            salt
        );

        user.password = hashedPassword;

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


// =====================================
// DASHBOARD API
// =====================================

exports.dashboard = async (req, res) => {

    try {

        const userId = req.user.userId;

        // CURRENT USER
        const user = await User.findById(userId)
        .select('-password -otp -otp_expiry');

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        // DIRECT TEAM USERS
        const directTeamUsers = await User.find({
            referred_by: user._id
        })
        .select('username email referral_code created_at');

        // DIRECT TEAM COUNT
        const directTeamCount = directTeamUsers.length;

        // TOTAL TEAM COUNT
        const totalTeamCount = await User.countDocuments({
            referred_by: user._id
        });

        // UPLINE DETAILS
        let uplineDetails = null;

        if (user.referred_by) {

            const upline = await User.findById(
                user.referred_by
            )
            .select('username email referral_code');

            if (upline) {

                uplineDetails = {
                    username: upline.username,
                    email: upline.email,
                    referral_code: upline.referral_code
                };

            }

        }

        // PROFILE COMPLETION
        let profileCompletion = 60;

        if (user.username) profileCompletion += 10;
        if (user.email) profileCompletion += 10;
        if (user.mobile) profileCompletion += 10;
        if (user.profile_image) profileCompletion += 10;

        // RESPONSE
        res.status(200).json({

            success: true,

            dashboard: {

                profile: {
                    username: user.username,
                    email: user.email,
                    mobile: user.mobile,
                    referral_code: user.referral_code,
                    is_verified: user.is_verified,
                    status: user.status,
                    rank: user.rank,
                    join_date: user.created_at,
                    last_login: user.last_login,
                    profile_completion: `${profileCompletion}%`
                },

                wallet: {
                    wallet_balance: user.wallet_balance,
                    total_income: user.total_income,
                    today_income: user.today_income,
                    monthly_income: user.monthly_income,
                    direct_income: user.direct_income,
                    level_income: user.level_income,
                    reward_income: user.reward_income,
                    offer_income: user.offer_income
                },

                team: {
                    direct_team_count: directTeamCount,
                    total_team_count: totalTeamCount,
                    direct_team_users: directTeamUsers
                },

                upline: uplineDetails

            }

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// WALLET API
// =====================================

exports.wallet = async (req, res) => {

    try {

        const userId = req.user.userId;

        const user = await User.findById(userId)
        .select(`
            wallet_balance
            total_income
            today_income
            monthly_income
            direct_income
            level_income
            reward_income
            offer_income
            updated_at
        `);

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        res.status(200).json({

            success: true,

            wallet: {

                wallet_balance: user.wallet_balance,

                income: {

                    today_income: user.today_income,

                    monthly_income: user.monthly_income,

                    total_income: user.total_income,

                    direct_income: user.direct_income,

                    level_income: user.level_income,

                    reward_income: user.reward_income,

                    offer_income: user.offer_income

                },

                last_updated: user.updated_at

            }

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// GET PROFILE
// =====================================

exports.getProfile = async (req, res) => {

    try {

        const userId = req.user.userId;

        const user = await User.findById(userId)
        .select('-password -otp -otp_expiry');

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// CHANGE PASSWORD
// =====================================

exports.changePassword = async (req, res) => {

    try {

        const userId = req.user.userId;

        const {
            oldPassword,
            newPassword
        } = req.body;

        if (!oldPassword || !newPassword) {

            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });

        }

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });

        }

        const isMatch = await bcrypt.compare(
            oldPassword,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({
                success: false,
                message: 'Old password is incorrect'
            });

        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            newPassword,
            salt
        );

        user.password = hashedPassword;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};


// =====================================
// LOGOUT
// =====================================

exports.logout = async (req, res) => {

    try {

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }

};