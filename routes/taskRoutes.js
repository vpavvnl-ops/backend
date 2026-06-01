const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middleware/authMiddleware');
const { enforceInactivityRule } = require('../middleware/inactivityRule');

// Apply protection middleware to all task routes
router.use(verifyToken, enforceInactivityRule);

// Daily Check-in
router.get('/checkin-status', taskController.checkInStatus);
router.post('/checkin', taskController.doCheckIn);

// Daily Reels
router.get('/reels', taskController.getReels);
router.get('/reel-progress', taskController.getReelProgress);
router.post('/reel-start', taskController.startReel);
router.post('/reel-complete', taskController.completeReel);

// Spin Wheel
router.post('/spin', taskController.doSpin); 
router.post('/spin-risk', taskController.riskSpin); 
router.post('/spin-accept', taskController.acceptSpin);

module.exports = router;