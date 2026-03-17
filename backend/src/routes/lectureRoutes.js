const express = require('express');
const router = express.Router();
console.log('lectureRoutes.js file executed');
const lectureController = require('../controllers/lectureController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// @route   POST /api/lectures/start
// @desc    Start a new lecture
// @access  Private (Teacher)
router.post('/start', auth, requireRole('teacher'), lectureController.startLecture);

module.exports = router;
