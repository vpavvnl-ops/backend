const express = require('express');
const router = express.Router();
const featureController = require('../controllers/featureController');
const { verifyToken } = require('../middleware/authMiddleware');
const { enforceInactivityRule } = require('../middleware/inactivityRule');
const upload = require('../middleware/uploadMiddleware'); // Using existing upload middleware

// =====================================
// MLM / REFERRAL TREE
// =====================================

router.get(
    '/referral-tree', 
    verifyToken, 
    enforceInactivityRule, 
    featureController.getReferralTree
);

// =====================================
// LEADERBOARD
// =====================================

router.get(
    '/leaderboard', 
    featureController.getLeaderboard
);

// =====================================
// PRIME MEMBERSHIP REQUEST
// =====================================

router.post(
    '/prime-request', 
    verifyToken, 
    upload.single('payment_proof'), 
    featureController.submitPrimeRequest
);

module.exports = router;