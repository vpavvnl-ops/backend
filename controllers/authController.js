const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');

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

        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Password and Confirm Password do not match.'
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

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

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            password,
            salt
        );

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

        const otp = '123456';

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

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

        user.last_login = new Date();

        await user.save();

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

        const user = await User.findById(userId)
        .select('-password -otp -otp_expiry');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const directTeamUsers = await User.find({
            referred_by: user._id
        })
        .select('username email referral_code created_at');

        const directTeamCount = directTeamUsers.length;

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
                    kyc_status: user.kyc_status
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

        const user = await User.findById(userId);

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
// ADVANCED KYC UPDATE
// =====================================

exports.updateKyc = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            full_name,
            aadhaar_number,
            pan_number,
            bank_name,
            account_number,
            ifsc_code
        } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.full_name = full_name;
        user.aadhaar_number = aadhaar_number;
        user.pan_number = pan_number;
        user.bank_name = bank_name;
        user.account_number = account_number;
        user.ifsc_code = ifsc_code;

        if (req.files && req.files['aadhaar_front_image']) {
            user.aadhaar_front_image =
                req.files['aadhaar_front_image'][0].path;
        }

        if (req.files && req.files['aadhaar_back_image']) {
            user.aadhaar_back_image =
                req.files['aadhaar_back_image'][0].path;
        }

        if (req.files && req.files['pan_card_image']) {
            user.pan_card_image =
                req.files['pan_card_image'][0].path;
        }

        if (req.files && req.files['selfie_image']) {
            user.selfie_image =
                req.files['selfie_image'][0].path;
        }

        if (req.files && req.files['self_auth_image']) {
            user.self_auth_image =
                req.files['self_auth_image'][0].path;
        }

        if (req.files && req.files['signature_image']) {
            user.signature_image =
                req.files['signature_image'][0].path;
        }

        user.kyc_status = 'Pending';

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Advanced KYC submitted successfully',
            kyc_status: user.kyc_status,
            documents: {
                aadhaar_front_image:
                    user.aadhaar_front_image,
                aadhaar_back_image:
                    user.aadhaar_back_image,
                pan_card_image:
                    user.pan_card_image,
                selfie_image:
                    user.selfie_image,
                self_auth_image:
                    user.self_auth_image,
                signature_image:
                    user.signature_image
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
// GET KYC DETAILS
// =====================================

exports.getKyc = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId)
        .select(`
            full_name
            aadhaar_number
            pan_number
            bank_name
            account_number
            ifsc_code
            aadhaar_front_image
            aadhaar_back_image
            pan_card_image
            selfie_image
            self_auth_image
            signature_image
            kyc_status
        `);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            kyc: user
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

// =====================================
// TRANSACTION HISTORY
// =====================================

exports.getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            user: userId
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Transaction history fetch failed'
        });
    }
};

// =====================================
// ADD INCOME + TRANSACTION
// =====================================

exports.addIncome = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            amount,
            type,
            description
        } = req.body;

        if (!amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'Amount and type are required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // UPDATE WALLET
        user.wallet_balance += Number(amount);
        user.total_income += Number(amount);

        // INCOME TYPE UPDATE
        if (type === 'direct_income') {
            user.direct_income += Number(amount);
        } else if (type === 'level_income') {
            user.level_income += Number(amount);
        } else if (type === 'reward_income') {
            user.reward_income += Number(amount);
        } else if (type === 'offer_income') {
            user.offer_income += Number(amount);
        }

        await user.save();

        // CREATE TRANSACTION
        const transaction = await Transaction.create({
            user: user._id,
            type,
            amount,
            description: description || 'Income added',
            status: 'success'
        });

        res.status(200).json({
            success: true,
            message: 'Income added successfully',
            wallet_balance: user.wallet_balance,
            transaction
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Income add failed'
        });
    }
};

// =====================================
// WITHDRAW REQUEST
// =====================================

exports.withdrawRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal amount is required'
            });
        }

        const withdrawAmount = Number(amount);

        if (withdrawAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal amount'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.wallet_balance < withdrawAmount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // DEDUCT WALLET BALANCE
        user.wallet_balance -= withdrawAmount;
        await user.save();

        // CREATE WITHDRAWAL REQUEST
        const withdrawal = await Withdrawal.create({
            user: user._id,
            amount: withdrawAmount,
            status: 'Pending'
        });

        // CREATE TRANSACTION HISTORY ENTRY
        const transaction = await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: withdrawAmount,
            description: 'Withdrawal request submitted',
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            wallet_balance: user.wallet_balance,
            withdrawal,
            transaction
        });

    } catch (error) {
        console.log("WITHDRAW ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Withdrawal request failed'
        });
    }
};

// =====================================
// WITHDRAW HISTORY
// =====================================

exports.getWithdrawHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const withdrawals = await Withdrawal.find({
            user: userId
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            success: true,
            count: withdrawals.length,
            withdrawals
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Withdraw history fetch failed'
        });
    }
};

// =====================================
// DIRECT TEAM
// =====================================

exports.getDirectTeam = async (req, res) => {
    try {
        const userId = req.user.userId;

        const directTeam = await User.find({
            referred_by: userId
        })
        .select('username email referral_code rank status kyc_status createdAt')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: directTeam.length,
            direct_team: directTeam
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch direct team'
        });
    }
};

// =====================================
// TEAM SUMMARY
// =====================================

exports.getTeamSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const directTeamCount = await User.countDocuments({
            referred_by: userId
        });

        res.status(200).json({
            success: true,
            team_summary: {
                referral_code: user.referral_code,
                direct_team_count: directTeamCount,
                total_team_count: user.total_team_count || 0,
                rank: user.rank,
                status: user.status,
                kyc_status: user.kyc_status
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team summary'
        });
    }
};

// =====================================
// =====================================
// REFERRAL DETAILS
// =====================================

exports.getReferralDetails = async (req, res) => {
    try {

        const userId = req.user.userId;

        console.log("USER ID:", userId);

        const user = await User.findById(userId);

        console.log("USER DATA:", user);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const referral_link = `https://d-task.in/register?ref=${user.referral_code}`;

        return res.status(200).json({
            success: true,
            referral: {
                username: user.username,
                referral_code: user.referral_code,
                referral_link,
                referred_by: user.referred_by || "Admin"
            }
        });

    } catch (error) {

        console.log("REFERRAL ERROR =>", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });

    }
} // Add this line at the top of your authController.js ONLY if it is not already there
// const Transaction = require('../models/Transaction');

// =====================================
// INCOME SUMMARY
// =====================================

exports.getIncomeSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch user to get wallet balance
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Fetch all transactions for this user
        const transactions = await Transaction.find({ user: userId });

        // Initialize calculation variables
        let total_income = 0;
        let direct_income = 0;
        let level_income = 0;
        let total_withdrawal = 0;
        let pending_withdrawal = 0;

        // Calculate based on transaction type and status
        transactions.forEach((tx) => {
            const amount = Number(tx.amount) || 0;

            // Total income (everything except withdrawals)
            if (tx.type !== 'withdrawal') {
                total_income += amount;
            }

            // Specific income types
            if (tx.type === 'direct_income') {
                direct_income += amount;
            } else if (tx.type === 'level_income') {
                level_income += amount;
            }

            // Withdrawal logic
            if (tx.type === 'withdrawal') {
                total_withdrawal += amount;
                
                // Check for pending withdrawal (case-insensitive)
                if (tx.status && tx.status.toLowerCase() === 'pending') {
                    pending_withdrawal += amount;
                }
            }
        });

        // Send Response
        res.status(200).json({
            success: true,
            income_summary: {
                total_income: total_income,
                direct_income: direct_income,
                level_income: level_income,
                wallet_balance: user.wallet_balance || 0,
                total_withdrawal: total_withdrawal,
                pending_withdrawal: pending_withdrawal
            }
        });

    } catch (error) {
        console.log("INCOME SUMMARY ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch income summary'
        });
    }
}
// =====================================
// DOWNLINE INCOME
// =====================================

exports.getDownlineIncome = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Find all direct downline members
        const directTeam = await User.find({ referred_by: userId })
            .select('username email referral_code rank status');

        // 2. Fetch and calculate total income for each member concurrently
        const downline_income = await Promise.all(
            directTeam.map(async (member) => {
                
                // Fetch only non-withdrawal transactions for this specific member
                const transactions = await Transaction.find({
                    user: member._id,
                    type: { $ne: 'withdrawal' }
                });

                // Calculate total income safely
                let total_income = 0;
                transactions.forEach((tx) => {
                    total_income += Number(tx.amount) || 0;
                });

                // Return formatted member object
                return {
                    username: member.username,
                    email: member.email,
                    referral_code: member.referral_code,
                    rank: member.rank,
                    status: member.status,
                    total_income: total_income
                };
            })
        );

        // 3. Send successful response
        res.status(200).json({
            success: true,
            count: downline_income.length,
            downline_income: downline_income
        });

    } catch (error) {
        console.log("DOWNLINE INCOME ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch downline income'
        });
    }
}
// =====================================
// LEVEL INCOME HISTORY
// =====================================

exports.getLevelIncomeHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            user: userId,
            type: 'level_income'
        }).sort({ createdAt: -1 });

        let total_level_income = 0;
        
        const level_income_history = transactions.map((tx) => {
            total_level_income += Number(tx.amount) || 0;
            return {
                amount: tx.amount,
                description: tx.description,
                status: tx.status,
                createdAt: tx.createdAt
            };
        });

        res.status(200).json({
            success: true,
            count: level_income_history.length,
            total_level_income: total_level_income,
            level_income_history: level_income_history
        });

    } catch (error) {
        console.log("LEVEL INCOME HISTORY ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch level income history'
        });
    }
}
// =====================================
// NOTIFICATIONS
// =====================================

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({ user: userId })
            .select('type amount description status createdAt')
            .sort({ createdAt: -1 })
            .limit(20);

        const notifications = transactions.map((tx) => {
            return {
                type: tx.type,
                amount: tx.amount,
                description: tx.description,
                status: tx.status,
                createdAt: tx.createdAt
            };
        });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications: notifications
        });

    } catch (error) {
        console.log("NOTIFICATIONS ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');

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

        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Password and Confirm Password do not match.'
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

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

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(
            password,
            salt
        );

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

        const otp = '123456';

        const otp_expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

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

        user.last_login = new Date();

        await user.save();

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

        const user = await User.findById(userId)
        .select('-password -otp -otp_expiry');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const directTeamUsers = await User.find({
            referred_by: user._id
        })
        .select('username email referral_code created_at');

        const directTeamCount = directTeamUsers.length;

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
                    kyc_status: user.kyc_status
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

        const user = await User.findById(userId);

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
// ADVANCED KYC UPDATE
// =====================================

exports.updateKyc = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            full_name,
            aadhaar_number,
            pan_number,
            bank_name,
            account_number,
            ifsc_code
        } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.full_name = full_name;
        user.aadhaar_number = aadhaar_number;
        user.pan_number = pan_number;
        user.bank_name = bank_name;
        user.account_number = account_number;
        user.ifsc_code = ifsc_code;

        if (req.files && req.files['aadhaar_front_image']) {
            user.aadhaar_front_image =
                req.files['aadhaar_front_image'][0].path;
        }

        if (req.files && req.files['aadhaar_back_image']) {
            user.aadhaar_back_image =
                req.files['aadhaar_back_image'][0].path;
        }

        if (req.files && req.files['pan_card_image']) {
            user.pan_card_image =
                req.files['pan_card_image'][0].path;
        }

        if (req.files && req.files['selfie_image']) {
            user.selfie_image =
                req.files['selfie_image'][0].path;
        }

        if (req.files && req.files['self_auth_image']) {
            user.self_auth_image =
                req.files['self_auth_image'][0].path;
        }

        if (req.files && req.files['signature_image']) {
            user.signature_image =
                req.files['signature_image'][0].path;
        }

        user.kyc_status = 'Pending';

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Advanced KYC submitted successfully',
            kyc_status: user.kyc_status,
            documents: {
                aadhaar_front_image:
                    user.aadhaar_front_image,
                aadhaar_back_image:
                    user.aadhaar_back_image,
                pan_card_image:
                    user.pan_card_image,
                selfie_image:
                    user.selfie_image,
                self_auth_image:
                    user.self_auth_image,
                signature_image:
                    user.signature_image
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
// GET KYC DETAILS
// =====================================

exports.getKyc = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId)
        .select(`
            full_name
            aadhaar_number
            pan_number
            bank_name
            account_number
            ifsc_code
            aadhaar_front_image
            aadhaar_back_image
            pan_card_image
            selfie_image
            self_auth_image
            signature_image
            kyc_status
        `);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            kyc: user
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

// =====================================
// TRANSACTION HISTORY
// =====================================

exports.getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            user: userId
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Transaction history fetch failed'
        });
    }
};

// =====================================
// ADD INCOME + TRANSACTION
// =====================================

exports.addIncome = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            amount,
            type,
            description
        } = req.body;

        if (!amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'Amount and type are required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // UPDATE WALLET
        user.wallet_balance += Number(amount);
        user.total_income += Number(amount);

        // INCOME TYPE UPDATE
        if (type === 'direct_income') {
            user.direct_income += Number(amount);
        } else if (type === 'level_income') {
            user.level_income += Number(amount);
        } else if (type === 'reward_income') {
            user.reward_income += Number(amount);
        } else if (type === 'offer_income') {
            user.offer_income += Number(amount);
        }

        await user.save();

        // CREATE TRANSACTION
        const transaction = await Transaction.create({
            user: user._id,
            type,
            amount,
            description: description || 'Income added',
            status: 'success'
        });

        res.status(200).json({
            success: true,
            message: 'Income added successfully',
            wallet_balance: user.wallet_balance,
            transaction
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Income add failed'
        });
    }
};

// =====================================
// WITHDRAW REQUEST
// =====================================

exports.withdrawRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal amount is required'
            });
        }

        const withdrawAmount = Number(amount);

        if (withdrawAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal amount'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.wallet_balance < withdrawAmount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // DEDUCT WALLET BALANCE
        user.wallet_balance -= withdrawAmount;
        await user.save();

        // CREATE WITHDRAWAL REQUEST
        const withdrawal = await Withdrawal.create({
            user: user._id,
            amount: withdrawAmount,
            status: 'Pending'
        });

        // CREATE TRANSACTION HISTORY ENTRY
        const transaction = await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: withdrawAmount,
            description: 'Withdrawal request submitted',
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            wallet_balance: user.wallet_balance,
            withdrawal,
            transaction
        });

    } catch (error) {
        console.log("WITHDRAW ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Withdrawal request failed'
        });
    }
};

// =====================================
// WITHDRAW HISTORY
// =====================================

exports.getWithdrawHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const withdrawals = await Withdrawal.find({
            user: userId
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            success: true,
            count: withdrawals.length,
            withdrawals
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Withdraw history fetch failed'
        });
    }
};

// =====================================
// DIRECT TEAM
// =====================================

exports.getDirectTeam = async (req, res) => {
    try {
        const userId = req.user.userId;

        const directTeam = await User.find({
            referred_by: userId
        })
        .select('username email referral_code rank status kyc_status createdAt')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: directTeam.length,
            direct_team: directTeam
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch direct team'
        });
    }
};

// =====================================
// TEAM SUMMARY
// =====================================

exports.getTeamSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const directTeamCount = await User.countDocuments({
            referred_by: userId
        });

        res.status(200).json({
            success: true,
            team_summary: {
                referral_code: user.referral_code,
                direct_team_count: directTeamCount,
                total_team_count: user.total_team_count || 0,
                rank: user.rank,
                status: user.status,
                kyc_status: user.kyc_status
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team summary'
        });
    }
};

// =====================================
// REFERRAL DETAILS
// =====================================

exports.getReferralDetails = async (req, res) => {
    try {

        const userId = req.user.userId;

        console.log("USER ID:", userId);

        const user = await User.findById(userId);

        console.log("USER DATA:", user);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const referral_link = `https://d-task.in/register?ref=${user.referral_code}`;

        return res.status(200).json({
            success: true,
            referral: {
                username: user.username,
                referral_code: user.referral_code,
                referral_link,
                referred_by: user.referred_by || "Admin"
            }
        });

    } catch (error) {

        console.log("REFERRAL ERROR =>", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });

    }
};

// =====================================
// INCOME SUMMARY
// =====================================

exports.getIncomeSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch user to get wallet balance
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Fetch all transactions for this user
        const transactions = await Transaction.find({ user: userId });

        // Initialize calculation variables
        let total_income = 0;
        let direct_income = 0;
        let level_income = 0;
        let total_withdrawal = 0;
        let pending_withdrawal = 0;

        // Calculate based on transaction type and status
        transactions.forEach((tx) => {
            const amount = Number(tx.amount) || 0;

            // Total income (everything except withdrawals)
            if (tx.type !== 'withdrawal') {
                total_income += amount;
            }

            // Specific income types
            if (tx.type === 'direct_income') {
                direct_income += amount;
            } else if (tx.type === 'level_income') {
                level_income += amount;
            }

            // Withdrawal logic
            if (tx.type === 'withdrawal') {
                total_withdrawal += amount;
                
                // Check for pending withdrawal (case-insensitive)
                if (tx.status && tx.status.toLowerCase() === 'pending') {
                    pending_withdrawal += amount;
                }
            }
        });

        // Send Response
        res.status(200).json({
            success: true,
            income_summary: {
                total_income: total_income,
                direct_income: direct_income,
                level_income: level_income,
                wallet_balance: user.wallet_balance || 0,
                total_withdrawal: total_withdrawal,
                pending_withdrawal: pending_withdrawal
            }
        });

    } catch (error) {
        console.log("INCOME SUMMARY ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch income summary'
        });
    }
};

// =====================================
// DOWNLINE INCOME
// =====================================

exports.getDownlineIncome = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Find all direct downline members
        const directTeam = await User.find({ referred_by: userId })
            .select('username email referral_code rank status');

        // 2. Fetch and calculate total income for each member concurrently
        const downline_income = await Promise.all(
            directTeam.map(async (member) => {
                
                // Fetch only non-withdrawal transactions for this specific member
                const transactions = await Transaction.find({
                    user: member._id,
                    type: { $ne: 'withdrawal' }
                });

                // Calculate total income safely
                let total_income = 0;
                transactions.forEach((tx) => {
                    total_income += Number(tx.amount) || 0;
                });

                // Return formatted member object
                return {
                    username: member.username,
                    email: member.email,
                    referral_code: member.referral_code,
                    rank: member.rank,
                    status: member.status,
                    total_income: total_income
                };
            })
        );

        // 3. Send successful response
        res.status(200).json({
            success: true,
            count: downline_income.length,
            downline_income: downline_income
        });

    } catch (error) {
        console.log("DOWNLINE INCOME ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch downline income'
        });
    }
};

// =====================================
// LEVEL INCOME HISTORY
// =====================================

exports.getLevelIncomeHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            user: userId,
            type: 'level_income'
        }).sort({ createdAt: -1 });

        let total_level_income = 0;
        
        const level_income_history = transactions.map((tx) => {
            total_level_income += Number(tx.amount) || 0;
            return {
                amount: tx.amount,
                description: tx.description,
                status: tx.status,
                createdAt: tx.createdAt
            };
        });

        res.status(200).json({
            success: true,
            count: level_income_history.length,
            total_level_income: total_level_income,
            level_income_history: level_income_history
        });

    } catch (error) {
        console.log("LEVEL INCOME HISTORY ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch level income history'
        });
    }
};

// =====================================
// NOTIFICATIONS
// =====================================

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({ user: userId })
            .select('type amount description status createdAt')
            .sort({ createdAt: -1 })
            .limit(20);

        const notifications = transactions.map((tx) => {
            return {
                type: tx.type,
                amount: tx.amount,
                description: tx.description,
                status: tx.status,
                createdAt: tx.createdAt
            };
        });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications: notifications
        });

    } catch (error) {
        console.log("NOTIFICATIONS ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

// =====================================
// DASHBOARD SUMMARY
// =====================================

exports.getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const directTeamCount = await User.countDocuments({
            referred_by: userId
        });

        const transactions = await Transaction.find({ user: userId })
            .sort({ createdAt: -1 });

        let total_income = 0;
        let direct_income = 0;
        let level_income = 0;
        let total_withdrawal = 0;
        let pending_withdrawal = 0;

        transactions.forEach((tx) => {
            const amount = Number(tx.amount) || 0;

            if (tx.type !== 'withdrawal') {
                total_income += amount;
            }

            if (tx.type === 'direct_income') {
                direct_income += amount;
            } else if (tx.type === 'level_income') {
                level_income += amount;
            }

            if (tx.type === 'withdrawal') {
                total_withdrawal += amount;
                
                if (tx.status && tx.status.toLowerCase() === 'pending') {
                    pending_withdrawal += amount;
                }
            }
        });

        const latest_notifications = transactions.slice(0, 5).map((tx) => ({
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            status: tx.status,
            createdAt: tx.createdAt
        }));

        res.status(200).json({
            success: true,
            dashboard: {
                wallet_balance: user.wallet_balance || 0,
                total_income: total_income,
                direct_income: direct_income,
                level_income: level_income,
                total_withdrawal: total_withdrawal,
                pending_withdrawal: pending_withdrawal,
                direct_team_count: directTeamCount,
                referral_code: user.referral_code,
                rank: user.rank,
                kyc_status: user.kyc_status,
                latest_notifications: latest_notifications
            }
        });

    } catch (error) {
        console.log("DASHBOARD SUMMARY ERROR =>", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard summary'
        });
    }
};