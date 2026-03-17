const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// @route   GET /api/settings
// @desc    Get system settings
// @access  Private
router.get('/', auth, settingsController.getSettings);

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (Admin)
router.put('/', auth, requireRole('admin'), settingsController.updateSettings);

module.exports = router;
