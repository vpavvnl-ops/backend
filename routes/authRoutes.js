const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    verifyToken
} = require('../middleware/authMiddleware');

router.post('/register', authController.register);

router.post('/verify-otp', authController.verifyOtp);

router.post('/login', authController.login);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

// PROTECTED ROUTE
router.get('/profile', verifyToken, (req, res) => {

    res.status(200).json({
        success: true,
        message: 'Protected route accessed',
        user: req.user
    });

});

module.exports = router;