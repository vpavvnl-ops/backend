const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    verifyToken
} = require('../middleware/authMiddleware');

// AUTH ROUTES
router.post('/register', authController.register);

router.post('/verify-otp', authController.verifyOtp);

router.post('/resend-otp', authController.resendOtp);

router.post('/login', authController.login);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

// USER PROFILE (PROTECTED)
router.get(
    '/profile',
    verifyToken,
    authController.getProfile
);

// CHANGE PASSWORD (PROTECTED)
router.post(
    '/change-password',
    verifyToken,
    authController.changePassword
);

// LOGOUT (PROTECTED)
router.post(
    '/logout',
    verifyToken,
    authController.logout
);

module.exports = router;