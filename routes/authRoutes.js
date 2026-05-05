const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registration Route
router.post('/register', authController.register);

// OTP Verification Route
router.post('/verify-otp', authController.verifyOtp);

module.exports = router;