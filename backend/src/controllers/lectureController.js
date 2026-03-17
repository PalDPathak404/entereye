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

/**
 * @desc    End an active lecture
 * @route   PUT /api/lectures/:id/end
 * @access  Private (Teacher)
 */
exports.endLecture = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lecture = await Lecture.findById(id);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    if (!lecture.isActive) {
      return res.status(400).json({ message: 'Lecture already ended' });
    }

    lecture.endTime = new Date();
    lecture.isActive = false;

    await lecture.save();

    res.status(200).json({
      message: 'Lecture ended successfully',
      lecture
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active lecture for a batch
 * @route   GET /api/lectures/current?batchId=...
 * @access  Private (Authenticated)
 */
exports.getActiveLecture = async (req, res, next) => {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID is required' });
    }

    const lecture = await Lecture.findOne({ batchId, isActive: true });

    if (!lecture) {
      return res.status(200).json({
        message: 'No active lecture',
        lecture: null
      });
    }

    res.status(200).json({
      lecture
    });
  } catch (error) {
    next(error);
  }
};
