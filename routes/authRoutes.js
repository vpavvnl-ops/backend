const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    verifyToken
} = require('../middleware/authMiddleware');

const {
    enforceInactivityRule
} = require('../middleware/inactivityRule'); // NEW: Added to check 15-day Prime rule dynamically

const upload = require('../middleware/uploadMiddleware');


// =====================================
// AUTH ROUTES
// =====================================

// REGISTER
router.post(
    '/register',
    authController.register
);

// VERIFY REFERRAL
router.post(
    '/verify-referral',
    authController.verifyReferral
);

// VERIFY OTP
router.post(
    '/verify-otp',
    authController.verifyOtp
);

// RESEND OTP
router.post(
    '/resend-otp',
    authController.resendOtp
);

// LOGIN
router.post(
    '/login',
    authController.login
);

// FORGOT PASSWORD
router.post(
    '/forgot-password',
    authController.forgotPassword
);

// RESET PASSWORD
router.post(
    '/reset-password',
    authController.resetPassword
);

// ADD INCOME
router.post(
    '/add-income',
    verifyToken,
    authController.addIncome
);


// =====================================
// DASHBOARD (PROTECTED)
// =====================================

router.get(
    '/dashboard',
    verifyToken,
    enforceInactivityRule,
    authController.dashboard
);


// =====================================
// WALLET (PROTECTED)
// =====================================

router.get(
    '/wallet',
    verifyToken,
    enforceInactivityRule,
    authController.wallet
);
// =====================================
// ADD FUND
// =====================================

router.post(
    '/add-fund-request',
    verifyToken,
    upload.single('payment_proof'),
    authController.requestAddFund
);

router.get(
    '/add-fund-history',
    verifyToken,
    authController.getAddFundHistory
);


// =====================================
// TRANSACTION HISTORY (PROTECTED)
// =====================================

router.get(
    '/transaction-history',
    verifyToken,
    authController.getTransactionHistory
);


// =====================================
// WITHDRAW REQUEST (PROTECTED)
// =====================================

router.post(
    '/withdraw-request',
    verifyToken,
    enforceInactivityRule,
    authController.withdrawRequest
);


// =====================================
// WITHDRAW HISTORY (PROTECTED)
// =====================================

router.get(
    '/withdraw-history',
    verifyToken,
    authController.getWithdrawHistory
);


// =====================================
// ADVANCED KYC (PROTECTED)
// =====================================

// UPDATE KYC
router.post(
    '/update-kyc',
    verifyToken,

    upload.fields([

        {
            name: 'aadhaar_front_image',
            maxCount: 1
        },

        {
            name: 'aadhaar_back_image',
            maxCount: 1
        },

        {
            name: 'pan_card_image',
            maxCount: 1
        },

        {
            name: 'selfie_image',
            maxCount: 1
        },

        {
            name: 'self_auth_image',
            maxCount: 1
        },

        {
            name: 'signature_image',
            maxCount: 1
        }

    ]),

    authController.updateKyc
);


// GET KYC
router.get(
    '/get-kyc',
    verifyToken,
    authController.getKyc
);


// =====================================
// USER PROFILE (PROTECTED)
// =====================================

router.get(
    '/profile',
    verifyToken,
    enforceInactivityRule,
    authController.getProfile
);


// =====================================
// CHANGE PASSWORD (PROTECTED)
// =====================================

router.post(
    '/change-password',
    verifyToken,
    authController.changePassword
);


// =====================================
// LOGOUT (PROTECTED)
// =====================================

router.post(
    '/logout',
    verifyToken,
    authController.logout
);

// =====================================
// DIRECT TEAM
// =====================================

router.get(
    '/direct-team',
    verifyToken,
    authController.getDirectTeam
);

// =====================================
// TEAM SUMMARY
// =====================================

router.get(
    '/team-summary',
    verifyToken,
    authController.getTeamSummary
);

// =====================================
// REFERRAL DETAILS
// =====================================

router.get(
    '/referral-details',
    verifyToken,
    authController.getReferralDetails
);

// =====================================
// INCOME SUMMARY
// =====================================

router.get(
    '/income-summary',
    verifyToken,
    authController.getIncomeSummary
);

// =====================================
// DOWNLINE INCOME (PROTECTED)
// =====================================

router.get(
    '/downline-income',
    verifyToken,
    authController.getDownlineIncome
);

// =====================================
// LEVEL INCOME HISTORY (PROTECTED)
// =====================================

router.get(
    '/level-income-history',
    verifyToken,
    authController.getLevelIncomeHistory
);

// =====================================
// NOTIFICATIONS (PROTECTED)
// =====================================

router.get(
    '/notifications',
    verifyToken,
    authController.getNotifications
);

// =====================================
// DASHBOARD SUMMARY
// =====================================

router.get(
    '/dashboard-summary',
    verifyToken,
    enforceInactivityRule,
    authController.getDashboardSummary
);

// =====================================
// RANK PROGRESS (PROTECTED)
// =====================================

router.get(
    '/rank-progress',
    verifyToken,
    authController.getRankProgress
);
router.post(
    '/generate-add-fund-qr',
    verifyToken,
    authController.generateAddFundQR
);
router.put(
    '/update-profile',
    verifyToken,
    authController.updateProfile
);

console.log("REFERRAL ROUTE LOADED");

module.exports = router;