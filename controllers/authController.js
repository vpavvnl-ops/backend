const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Settings = require('../models/Settings'); // Added for withdrawal rules
const AddFundRequest = require('../models/AddFundRequest');
const QRCode = require('qrcode');

// =====================================
// REGISTER
// =====================================

exports.register = async (req, res) => {
    try {
        const {
            username,
            email,
            mobile,
            password,
            confirm_password,
            referral_id
        } = req.body;

        if (
            !username ||
            !email ||
            !mobile ||
            !password ||
            !confirm_password ||
            !referral_id
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields including Referral ID are required.'
            });
        }

        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10 digit mobile number'
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
            if (existingUser.is_verified === false) {
                await User.deleteOne({ _id: existingUser._id });
            } else {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered.'
                });
            }
        }

        const existingMobile = await User.findOne({ mobile });

        if (existingMobile) {
            if (existingMobile.is_verified === false) {
                await User.deleteOne({ _id: existingMobile._id });
            } else {
                return res.status(409).json({
                    success: false,
                    message: 'Mobile number already registered'
                });
            }
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
            mobile,
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
                    join_date: user.created_at || user.createdAt,
                    last_login: user.last_login,
                    kyc_status: user.kyc_status,
                    is_prime: user.is_prime || false,
                    is_active: user.is_active !== false
                },
                wallet: {
                    available_balance: user.available_balance || 0,
                    locked_balance: user.locked_balance || 0,
                    wallet_balance: user.wallet_balance || 0,
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
                    total_team_count: user.total_team_count || 0,
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
                available_balance: user.available_balance || 0,
                locked_balance: user.locked_balance || 0,
                wallet_balance: user.wallet_balance || 0,
                income: {
                    today_income: user.today_income,
                    monthly_income: user.monthly_income,
                    total_income: user.total_income,
                    direct_income: user.direct_income,
                    level_income: user.level_income,
                    reward_income: user.reward_income,
                    offer_income: user.offer_income
                },
                last_updated: user.updated_at || user.updatedAt
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

    }
     catch (error) {
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
            newPassword,
            confirmPassword
        } = req.body;

        if (
            !oldPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message: 'Old password, new password and confirm password are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm password do not match'
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
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            username,
            mobile,
            full_name
        } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (username) {
            user.username = username;
        }

        if (mobile) {

            const existingMobile = await User.findOne({
                mobile,
                _id: { $ne: userId }
            });

            if (existingMobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Mobile number already exists'
                });
            }

            user.mobile = mobile;
        }

        if (full_name) {
            user.full_name = full_name;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                username: user.username,
                email: user.email,
                mobile: user.mobile,
                full_name: user.full_name,
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
        const { amount, type, description } = req.body;

        if (!amount || !type) {
            return res.status(400).json({ success: false, message: 'Amount and type are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // UPDATE WALLET (Adding to available and synced wallet balance)
        user.available_balance = (user.available_balance || 0) + Number(amount);
        user.wallet_balance = (user.wallet_balance || 0) + Number(amount);
        user.total_income = (user.total_income || 0) + Number(amount);

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
            available_balance: user.available_balance,
            wallet_balance: user.wallet_balance,
            transaction
        });

    } catch (error) {
        console.log("ADD INCOME ERROR =>", error);
        res.status(500).json({ success: false, message: 'Income add failed' });
    }
};

// =====================================
// WITHDRAW REQUEST
// =====================================

exports.withdrawRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount } = req.body;
        const withdrawAmount = Number(amount);

        if (!withdrawAmount || withdrawAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (!user.is_prime) return res.status(400).json({ success: false, message: 'Only Prime members can withdraw' });
        if (!user.is_active) return res.status(400).json({ success: false, message: 'ID is inactive. Please reactivate.' });
        
        // KYC Check
        if (user.kyc_status !== 'Approved') {
            return res.status(400).json({ success: false, message: 'KYC must be Approved to withdraw funds.' });
        }

        // Mon-Fri allowed only
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return res.status(400).json({ success: false, message: 'Withdrawals allowed Monday to Friday only.' });
        }

        const settings = await Settings.findOne() || { min_withdrawal: 500, monthly_withdrawal_limit: 3, tds_percentage: 5 };

        if (withdrawAmount < settings.min_withdrawal) {
            return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${settings.min_withdrawal}` });
        }

        // Deduct from Available Balance only
        if ((user.available_balance || 0) < withdrawAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient Available Balance. Locked balance cannot be withdrawn.' });
        }

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthWithdrawals = await Withdrawal.countDocuments({
            user: userId,
            createdAt: { $gte: startOfMonth }
        });

        if (thisMonthWithdrawals >= settings.monthly_withdrawal_limit) {
            return res.status(400).json({ success: false, message: `Monthly limit of ${settings.monthly_withdrawal_limit} withdrawals reached.` });
        }

        // Calculate TDS & Deductions
        const tdsAmount = (withdrawAmount * settings.tds_percentage) / 100;
        const payableAmount = withdrawAmount - tdsAmount;

        user.available_balance -= withdrawAmount;
        user.wallet_balance -= withdrawAmount;
        await user.save();

        const withdrawal = await Withdrawal.create({
            user: user._id,
            amount: withdrawAmount,
            tds_deducted: tdsAmount,
            payable_amount: payableAmount,
            status: 'Pending'
        });

        const transaction = await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: withdrawAmount,
            description: `Withdrawal request (TDS ₹${tdsAmount} deducted). Payable: ₹${payableAmount}`,
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            available_balance: user.available_balance,
            wallet_balance: user.wallet_balance,
            withdrawal,
            transaction
        });

    } catch (error) {
        console.log("WITHDRAW ERROR =>", error);
        res.status(500).json({ success: false, message: 'Withdrawal request failed' });
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

// =====================================
// RANK PROGRESS
// =====================================

exports.getRankProgress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const directTeamCount = await User.countDocuments({ referred_by: userId });
        const teamCount = user.total_team_count || 0;
        const isPrime = user.is_prime;

        // Define Rank Plan
        const rankPlan = [
            { name: 'Basic', requiredDirect: 0, requiredTeam: 0, requiresPrime: false },
            { name: 'Starter', requiredDirect: 0, requiredTeam: 0, requiresPrime: true },
            { name: 'Silver', requiredDirect: 2, requiredTeam: 0, requiresPrime: true },
            { name: 'Gold', requiredDirect: 10, requiredTeam: 0, requiresPrime: true },
            { name: 'Platinum', requiredDirect: 50, requiredTeam: 0, requiresPrime: true },
            { name: 'Diamond', requiredDirect: 0, requiredTeam: 5000, requiresPrime: true },
            { name: 'Crown Diamond', requiredDirect: 0, requiredTeam: 25000, requiresPrime: true },
            { name: 'Global Crown', requiredDirect: 0, requiredTeam: 50000, requiresPrime: true }
        ];

        let currentRankIndex = 0;

        // Determine Current Rank
        for (let i = 1; i < rankPlan.length; i++) {
            const rank = rankPlan[i];
            if (!isPrime && rank.requiresPrime) break;
            
            if (directTeamCount >= rank.requiredDirect && teamCount >= rank.requiredTeam) {
                currentRankIndex = i;
            } else {
                break;
            }
        }

        const currentRankObj = rankPlan[currentRankIndex];
        let nextRankObj = currentRankIndex + 1 < rankPlan.length ? rankPlan[currentRankIndex + 1] : null;

        let nextRank = 'Achieved';
        let requiredDirectTeam = 0;
        let remainingDirectTeam = 0;
        let requiredTotalTeam = 0;
        let remainingTotalTeam = 0;
        let progressPercentage = 100;

        // Calculate progress if not at highest rank
        if (nextRankObj) {
            nextRank = nextRankObj.name;
            
            if (nextRankObj.name === 'Starter') {
                progressPercentage = isPrime ? 100 : 0;
            } else if (nextRankObj.requiredTeam > 0) {
                // Team-based progress (Diamond and above)
                requiredTotalTeam = nextRankObj.requiredTeam;
                remainingTotalTeam = Math.max(0, nextRankObj.requiredTeam - teamCount);
                
                const currentRankReq = currentRankObj.requiredTeam || 0;
                const earnedInCurrentLevel = Math.max(0, teamCount - currentRankReq);
                const requiredForNextLevel = nextRankObj.requiredTeam - currentRankReq;
                
                progressPercentage = requiredForNextLevel > 0 ? Math.round((earnedInCurrentLevel / requiredForNextLevel) * 100) : 100;
            } else {
                // Direct-based progress (Silver to Platinum)
                requiredDirectTeam = nextRankObj.requiredDirect;
                remainingDirectTeam = Math.max(0, nextRankObj.requiredDirect - directTeamCount);
                
                const currentRankReq = currentRankObj.requiredDirect || 0;
                const earnedInCurrentLevel = Math.max(0, directTeamCount - currentRankReq);
                const requiredForNextLevel = nextRankObj.requiredDirect - currentRankReq;
                
                progressPercentage = requiredForNextLevel > 0 ? Math.round((earnedInCurrentLevel / requiredForNextLevel) * 100) : 100;
            }
        }

        // Keep bounds safe
        progressPercentage = Math.min(100, Math.max(0, progressPercentage));

        res.status(200).json({
            success: true,
            rank_progress: {
                current_rank: currentRankObj.name,
                current_direct_team: directTeamCount,
                current_total_team: teamCount,
                next_rank: nextRank,
                required_direct_team: requiredDirectTeam,
                remaining_direct_team: remainingDirectTeam,
                required_total_team: requiredTotalTeam,
                remaining_total_team: remainingTotalTeam,
                progress_percentage: progressPercentage
            }
        });

    } catch (error) {
        console.log("RANK PROGRESS ERROR =>", error);
        res.status(500).json({ success: false, message: 'Failed to fetch rank progress' });
    }
};
// =====================================
// ADD FUND REQUEST
// =====================================

exports.requestAddFund = async (req, res) => {
    try {

        const userId = req.user.userId;

        const {
            amount,
            transaction_id
        } = req.body;

        const payment_proof =
            req.file
                ? req.file.path
                : req.body.payment_proof;

        if (!amount || Number(amount) < 100) {
            return res.status(400).json({
                success: false,
                message: 'Minimum add fund amount is ₹100'
            });
        }

        if (!transaction_id || !payment_proof) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID and Payment Proof are required'
            });
        }

        const duplicateTx =
            await AddFundRequest.findOne({
                transaction_id
            });

        if (duplicateTx) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID already used'
            });
        }

        const existingPending =
            await AddFundRequest.findOne({
                user: userId,
                status: 'pending'
            });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending add fund request.'
            });
        }

        await AddFundRequest.create({
            user: userId,
            amount: Number(amount),
            payment_method: 'manual',
            transaction_id,
            payment_proof,
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            message: 'Add Fund Request Submitted Successfully'
        });

    } catch (error) {

        console.log(
            'ADD FUND ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};
// =====================================
// ADD FUND HISTORY
// =====================================

exports.getAddFundHistory = async (req, res) => {
    try {

        const userId = req.user.userId;

        const history =
            await AddFundRequest.find({
                user: userId
            })
            .sort({
                createdAt: -1
            });

        res.status(200).json({
            success: true,
            history
        });

    } catch (error) {

        console.log(
            'ADD FUND HISTORY ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};
// =====================================
// GENERATE ADD FUND QR
// =====================================

exports.generateAddFundQR = async (req, res) => {
    try {

        const { amount } = req.body;

        if (!amount || Number(amount) < 100) {
            return res.status(400).json({
                success: false,
                message: 'Minimum add fund amount is ₹100'
            });
        }

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({});
        }

        const txnRef = `DTASK${Date.now()}`;

const upiLink =
`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.company_name)}&tr=${txnRef}&tn=${encodeURIComponent('D-Task Payment')}&am=${amount}&cu=INR`;

        const qrCodeImage = await QRCode.toDataURL(upiLink);

        res.status(200).json({
            success: true,
            amount: Number(amount),
            upi_id: settings.upi_id,
            company_name: settings.company_name,
            upi_link: upiLink,
            qr_code: qrCodeImage
        });

    } catch (error) {

        console.log(
            'GENERATE QR ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};

// =====================================
// ADMIN: REJECT WITHDRAWAL (WITH AUTOMATIC REFUND)
// =====================================

exports.rejectWithdrawal = async (req, res) => {
    try {
        const { withdrawalId, rejectReason } = req.body;
        
        // 1. Find and validate the withdrawal request
        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return resexports.approveWithdrawal.status(404).json({ success: false, message: 'Withdrawal request not found' });
        }
        
        // 2. Prevent duplicate rejections (Idempotency check)
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot reject. Withdrawal is already ${withdrawal.status}` 
            });
        }

        const reason = rejectReason || 'Rejected by Admin due to policy violation';

        // 3. Atomically refund both balances to prevent race conditions
        const updatedUser = await User.findOneAndUpdate(
            { _id: withdrawal.user },
            { 
                $inc: { 
                    available_balance: withdrawal.amount, 
                    wallet_balance: withdrawal.amount 
                } 
            },
            { returnDocument: 'after' } // Returns the updated document with the new balances
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User associated with this withdrawal not found' });
        }

        // 4. Update the withdrawal record
        withdrawal.status = 'Rejected';
        withdrawal.rejectReason = reason;
        await withdrawal.save();

        // 5. Update the corresponding pending transaction
        await Transaction.findOneAndUpdate(
            { 
                user: withdrawal.user, 
                type: 'withdrawal', 
                amount: withdrawal.amount, 
                status: 'pending' 
            },
            { 
                status: 'failed', 
                description: `Withdrawal Rejected: ${reason}` 
            },
            { sort: { createdAt: -1 } } // Ensures we update the most recent matching transaction
        );

        // 6. Return success with the dynamically updated balances
        res.status(200).json({ 
            success: true, 
            message: 'Withdrawal rejected successfully. Funds have been refunded to the user.',
            refunded_amount: withdrawal.amount,
            updated_balances: {
                available_balance: updatedUser.available_balance,
                wallet_balance: updatedUser.wallet_balance
            }
        });

    } catch (error) {
        console.error("REJECT WITHDRAWAL ERROR =>", error);
        res.status(500).json({ success: false, message: 'Server Error processing rejection' });
    }
};
// =====================================
// ADMIN APPROVE WITHDRAWAL
// =====================================

exports.approveWithdrawal = async (req, res) => {
    try {

        const { withdrawalId } = req.body;

        const withdrawal = await Withdrawal.findById(withdrawalId);

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Withdrawal is already ${withdrawal.status}`
            });
        }

        withdrawal.status = 'Approved';
        withdrawal.approvedAt = new Date();

        await withdrawal.save();

        await Transaction.findOneAndUpdate(
            {
                user: withdrawal.user,
                type: 'withdrawal',
                amount: withdrawal.amount,
                status: 'pending'
            },
            {
                status: 'success'
            },
            {
                sort: { createdAt: -1 }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Withdrawal approved successfully'
        });

    } catch (error) {

        console.log(
            'APPROVE WITHDRAWAL ERROR =>',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });

    }
};