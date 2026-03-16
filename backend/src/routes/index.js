const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');



// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});



module.exports = router;
