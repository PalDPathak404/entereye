const express = require('express');
const router = express.Router();
const faceRecognitionController = require('../controllers/faceRecognitionController');

// @route   POST /api/students/recognize
// @desc    Recognize a student from face descriptor
// @access  Public (for live detection)
router.post('/recognize', faceRecognitionController.recognizeStudent);

module.exports = router;
