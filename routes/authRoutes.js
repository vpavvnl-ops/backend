const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    verifyToken
} = require('../middleware/authMiddleware');

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
    authController.dashboard
);


// =====================================
// WALLET (PROTECTED)
// =====================================

router.get(
    '/wallet',
    verifyToken,
    authController.wallet
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
// DIRECT TEAM
router.get(
    '/direct-team',
    verifyToken,
    authController.getDirectTeam
);
// TEAM SUMMARY
router.get(
    '/team-summary',
    verifyToken,
    authController.getTeamSummary
);
// REFERRAL DETAILS
router.get(
    '/referral-details',
    verifyToken,
    authController.getReferralDetails
);
console.log("REFERRAL ROUTE LOADED");
module.exports = router;