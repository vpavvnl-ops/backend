const express = require('express');
const router = express.Router();

const {
    loginAdmin
} = require('../../controllers/admin/adminAuthController');

router.post('/login', loginAdmin);

module.exports = router;