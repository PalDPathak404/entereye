const mongoose = require('mongoose');
const AttendanceLog = require('../models/AttendanceLog');
const Lecture = require('../models/Lecture');

/**
 * @desc    Log student exit from a lecture
 * @route   POST /api/logs/exit
 * @access  Private
 */
exports.logExit = async (req, res) => {
  try {
    console.log("📥 EXIT BODY:", req.body);

    const { studentId, lectureId } = req.body;

    // Validate input
    if (!studentId || !lectureId) {
      return res.status(400).json({ message: "studentId and lectureId required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(lectureId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // Check lecture
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    if (!lecture.isActive) {
      return res.status(400).json({ message: "Lecture is not active" });
    }

    // Check existing open log
    const existingLog = await AttendanceLog.findOne({
      studentId,
      lectureId,
      entryTime: null
    });

    if (existingLog) {
      return res.status(400).json({ message: "Student already outside" });
    }

    // Create log
    const log = await AttendanceLog.create({
      studentId,
      lectureId,
      exitTime: new Date()
    });

    // 🔥 SOCKET EMIT (ROOM-BASED)
    const io = req.app.get('socketio');

    if (io) {
      const batchId = lecture.batchId.toString();

      console.log("🚀 EMIT student_exit →", {
        studentId,
        lectureId,
        batchId
      });

      io.to(batchId).emit('student_exit', {
        studentId,
        lectureId,
        exitTime: log.exitTime
      });
    }

    return res.status(201).json({
      message: "Exit logged successfully",
      log
    });

  } catch (error) {
    console.error("❌ EXIT ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get all students currently outside for a batch
 * @route   GET /api/logs/outside
 * @access  Public (for dashboard)
 */
exports.getOutsideStudents = async (req, res) => {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({ message: "Invalid batchId" });
    }

    // Find all logs where entryTime is null
    const logs = await AttendanceLog.find({ entryTime: null })
      .populate({
        path: 'studentId',
        match: { batchId: batchId },
        select: 'name rollNo'
      });

    // Filter logs where studentId matched the batchId
    // and format for frontend
    const outsideStudents = logs
      .filter(log => log.studentId !== null)
      .map(log => ({
        studentId: log.studentId._id,
        name: log.studentId.name,
        rollNo: log.studentId.rollNo,
        exitTime: log.exitTime,
        lectureId: log.lectureId
      }));

    return res.status(200).json({
      students: outsideStudents
    });

  } catch (error) {
    console.error("❌ GET OUTSIDE ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


/**
 * @desc    Log student entry back into a lecture
 * @route   POST /api/logs/entry
 * @access  Private
 */
exports.logEntry = async (req, res) => {
  try {
    console.log("📥 ENTRY BODY:", req.body);

    const { studentId, lectureId } = req.body;

    // Validate input
    if (!studentId || !lectureId) {
      return res.status(400).json({ message: "studentId and lectureId required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(lectureId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    // Find open log
    const log = await AttendanceLog.findOne({
      studentId,
      lectureId,
      entryTime: null
    });

    if (!log) {
      return res.status(404).json({ message: "No active exit found" });
    }

    // Get lecture
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    // Set entry time
    const entryTime = new Date();
    log.entryTime = entryTime;

    // Calculate duration (in minutes)
    const diffMs = entryTime - log.exitTime;
    const duration = Math.round(diffMs / (1000 * 60));
    log.duration = duration;

    // Threshold logic
    const THRESHOLD = 7;
    log.status = duration > THRESHOLD ? 'exceeded' : 'normal';

    await log.save();

    // 🔥 SOCKET EMIT (ROOM-BASED)
    const io = req.app.get('socketio');

    if (io) {
      const batchId = lecture.batchId.toString();

      console.log("🚀 EMIT student_entry →", {
        studentId,
        lectureId,
        duration: log.duration,
        status: log.status,
        batchId
      });

      io.to(batchId).emit('student_entry', {
        studentId,
        lectureId,
        entryTime: log.entryTime,
        duration: log.duration,
        status: log.status
      });
    }

    return res.status(200).json({
      message: "Entry logged successfully",
      duration: log.duration,
      status: log.status,
      log
    });
  } catch (error) {
    console.error("❌ ENTRY ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get all attendance logs for a specific lecture
 * @route   GET /api/logs/lecture/:lectureId
 * @access  Public
 */
exports.getLogsByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;

    if (!lectureId || !mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "Invalid lectureId" });
    }

    const logs = await AttendanceLog.find({ lectureId })
      .populate('studentId', 'name rollNo')
      .sort({ exitTime: -1 });

    const formattedLogs = logs
      .filter(log => log.studentId !== null)
      .map(log => ({
        _id: log._id,
        studentId: log.studentId._id,
        name: log.studentId.name,
        rollNo: log.studentId.rollNo,
        exitTime: log.exitTime,
        entryTime: log.entryTime,
        duration: log.duration,
        status: log.status
      }));

    return res.status(200).json({
      logs: formattedLogs
    });

  } catch (error) {
    console.error("❌ GET LECTURE LOGS ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};