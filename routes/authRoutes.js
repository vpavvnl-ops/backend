const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    verifyToken
} = require('../middleware/authMiddleware');


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


module.exports = router;