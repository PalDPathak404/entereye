const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email (explicitly select password because it's hidden by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2. Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Generate JWT
    const payload = {
      id: user._id,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });

    // 4. Return success response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
