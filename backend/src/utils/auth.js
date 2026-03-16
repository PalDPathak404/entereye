const bcrypt = require('bcryptjs');

/**
 * Hash a password
 * @param {string} password - Raw password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

module.exports = {
  hashPassword,
};
