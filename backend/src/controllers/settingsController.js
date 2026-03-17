const Settings = require('../models/Settings');

/**
 * @desc    Get system settings
 * @route   GET /api/settings
 * @access  Private (Authenticated)
 */
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    res.status(200).json({
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/settings
 * @access  Private (Admin)
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { thresholdMinutes, gracePeriodSeconds, autoDeduction } = req.body;

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings({});
    }

    if (thresholdMinutes !== undefined) settings.thresholdMinutes = thresholdMinutes;
    if (gracePeriodSeconds !== undefined) settings.gracePeriodSeconds = gracePeriodSeconds;
    if (autoDeduction !== undefined) settings.autoDeduction = autoDeduction;

    await settings.save();

    res.status(200).json({
      message: "Settings updated successfully",
      settings
    });
  } catch (error) {
    next(error);
  }
};
