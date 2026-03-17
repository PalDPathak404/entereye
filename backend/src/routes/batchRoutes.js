const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// @route   POST /api/batches
// @desc    Create a new batch
// @access  Private/Admin
router.post('/', auth, requireRole('admin'), batchController.createBatch);

// @route   GET /api/batches
// @desc    Get all batches
// @access  Private
router.get('/', auth, batchController.getBatches);

// @route   PUT /api/batches/:id/activate
// @desc    Activate a batch
// @access  Private/Admin
router.put('/:id/activate', auth, requireRole('admin'), batchController.activateBatch);

module.exports = router;
