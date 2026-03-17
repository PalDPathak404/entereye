const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  exitTime: {
    type: Date,
    required: true
  },
  entryTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['normal', 'exceeded'],
    default: 'normal'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);
