const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  thresholdMinutes: {
    type: Number,
    required: true,
    default: 7
  },
  gracePeriodSeconds: {
    type: Number,
    required: true,
    default: 30
  },
  autoDeduction: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
