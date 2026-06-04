const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// @route   POST /api/students
// @desc    Register a new student
// @access  Public (for dashboard registration)
router.post('/', studentController.registerStudent);

// @route   GET /api/students
// @desc    Get all students
// @access  Public (for dashboard)
router.get('/', studentController.getStudents);

module.exports = router;
