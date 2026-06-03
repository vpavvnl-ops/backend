const express = require('express');
const router = express.Router();
const { getLatestVersion } = require('../controllers/appVersionController');

// Define the route
router.get('/version', getLatestVersion);

module.exports = router;