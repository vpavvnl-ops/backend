const express = require('express');
const router = express.Router();


const {
    loginAdmin,
    getProfile
} = require('../../controllers/admin/adminAuthController');

const { adminAuth } = require('../../middleware/adminAuthMiddleware');

router.post('/login', loginAdmin);
router.get('/profile', adminAuth, getProfile);


module.exports = router;