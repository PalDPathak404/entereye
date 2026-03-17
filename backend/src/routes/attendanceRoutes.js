const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

// @route   POST /api/logs/exit
// @desc    Log student exit
// @access  Private
router.post('/exit', auth, attendanceController.logExit);

// @route   POST /api/logs/entry
// @desc    Log student entry
// @access  Private
router.post('/entry', auth, attendanceController.logEntry);

module.exports = router;
