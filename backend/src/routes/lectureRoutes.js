const express = require('express');
const router = express.Router();
const lectureController = require('../controllers/lectureController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// @route   POST /api/lectures/start
// @desc    Start a new lecture
// @access  Private (Teacher)
router.post('/start', auth, requireRole('teacher'), lectureController.startLecture);

// @route   PUT /api/lectures/:id/end
// @desc    End an active lecture
// @access  Private (Teacher)
router.put('/:id/end', auth, requireRole('teacher'), lectureController.endLecture);

// @route   GET /api/lectures/current
// @desc    Get active lecture for a batch
// @access  Private (Authenticated)
router.get('/current', auth, lectureController.getActiveLecture);

// @route   GET /api/lectures/history
// @desc    Get inactive lectures history
// @access  Public
router.get('/history', lectureController.getLectureHistory);

// @route   DELETE /api/lectures/:id
// @desc    Delete a lecture and its logs
// @access  Public
router.delete('/:id', lectureController.deleteLecture);

module.exports = router;
