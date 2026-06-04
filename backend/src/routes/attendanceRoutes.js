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

// @route   GET /api/logs/outside
// @desc    Get all students currently outside for a batch
// @access  Public (for dashboard)
router.get('/outside', attendanceController.getOutsideStudents);

// @route   GET /api/logs/lecture/:lectureId
// @desc    Get all attendance logs for a specific lecture
// @access  Public
router.get('/lecture/:lectureId', attendanceController.getLogsByLecture);

module.exports = router;
