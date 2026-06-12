const express = require('express');
const router = express.Router();
console.log('ADMIN ROUTES LOADED');

const {
    loginAdmin,
    getProfile
} = require('../../controllers/admin/adminAuthController');

const { adminAuth } = require('../../middleware/adminAuthMiddleware');

router.post('/login', loginAdmin);
router.get('/profile', adminAuth, getProfile);
router.get('/check', (req, res) => {
    res.json({
        success: true,
        message: 'Admin Route Working'
    });
});

module.exports = router;