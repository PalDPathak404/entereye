const mongoose = require('mongoose');
const AttendanceLog = require('../models/AttendanceLog');
const Lecture = require('../models/Lecture');

/**
 * @desc    Log student exit from a lecture
 * @route   POST /api/logs/exit
 * @access  Private
 */
exports.logExit = async (req, res, next) => {
  try {
    // Step 1: Add Debugging
    console.log("BODY:", req.body);

    const { studentId, lectureId } = req.body;

    // Step 2: Validate Request Data
    if (!studentId || !lectureId) {
      return res.status(400).json({ message: "studentId and lectureId required" });
    }

    // Step 5: Validate IDs as Mongo ObjectIds
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // Step 6: Check Lecture Exists and is Active
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    if (!lecture.isActive) {
      return res.status(400).json({ message: "Lecture is not active" });
    }

    // Step 4: Check if student already has an open log (entryTime = null) for this lecture
    const existingLog = await AttendanceLog.findOne({
      studentId,
      lectureId,
      entryTime: null
    });

    if (existingLog) {
      return res.status(400).json({ message: "Student already outside" });
    }

    // Step 7: Create Log Safely
    const log = await AttendanceLog.create({
      studentId,
      lectureId,
      exitTime: new Date()
    });

    // Step 8: Return Response
    res.status(201).json({
      message: "Exit logged successfully",
      log
    });

  } catch (error) {
    // Step 1: Improved Error Handling
    console.error("❌ EXIT ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
