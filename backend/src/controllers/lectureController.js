const Lecture = require('../models/Lecture');

/**
 * @desc    Start a new lecture
 * @route   POST /api/lectures/start
 * @access  Private (Teacher)
 */
exports.startLecture = async (req, res, next) => {
  try {
    const { batchId, subject } = req.body;
    const teacherId = req.user.id;

    // 1. Validate batchId and subject
    if (!batchId || !subject) {
      return res.status(400).json({ message: 'Batch ID and subject are required' });
    }

    // 2. Check if there is already an active lecture for this batch
    const activeLecture = await Lecture.findOne({ batchId, isActive: true });
    if (activeLecture) {
      return res.status(400).json({ message: 'Lecture already active for this batch' });
    }

    // 3. Create new lecture
    const lecture = new Lecture({
      teacherId,
      batchId,
      subject,
      isActive: true,
      startTime: new Date()
    });

    // 4. Save to DB
    await lecture.save();

    res.status(201).json({
      message: 'Lecture started successfully',
      lecture
    });
  } catch (error) {
    next(error);
  }
};
