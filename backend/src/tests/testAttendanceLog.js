const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AttendanceLog = require('../models/AttendanceLog');
const Student = require('../models/Student');
const Lecture = require('../models/Lecture');

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/entereye';

async function testAttendanceLog() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find a student and a lecture to link
    const student = await Student.findOne();
    const lecture = await Lecture.findOne();

    if (!student || !lecture) {
      console.log('Requirements not met: Need at least one student and one lecture in the DB.');
      if (!student) console.log('Try registering a student first.');
      if (!lecture) console.log('Try starting a lecture first.');
      return;
    }

    const logData = {
      studentId: student._id,
      lectureId: lecture._id,
      exitTime: new Date(),
      status: 'normal'
    };

    const newLog = new AttendanceLog(logData);
    await newLog.save();

    console.log('AttendanceLog created successfully:');
    console.log(newLog);

  } catch (error) {
    console.error('Error testing AttendanceLog model:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

testAttendanceLog();
