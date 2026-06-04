const mongoose = require('mongoose');
const Student = require('../models/Student');

/**
 * @desc    Register a new student
 * @route   POST /api/students
 * @access  Private (Admin, Assistant)
 */
exports.registerStudent = async (req, res, next) => {
  try {
    const { name, rollNo, batchId, faceDescriptor } = req.body;

    // 1. Validate all fields required
    if (!name || !rollNo || !batchId || !faceDescriptor) {
      return res.status(400).json({ message: 'All fields (name, rollNo, batchId, faceDescriptor) are required' });
    }

    // 2. Validate faceDescriptor is an array of length 128
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'faceDescriptor must be an array of length 128' });
    }

    // 3. Check for duplicate roll number in same batch
    const existingStudentByRollNo = await Student.findOne({ rollNo, batchId });
    if (existingStudentByRollNo) {
      return res.status(409).json({ message: 'Student with this roll number already exists in this batch' });
    }

    // 4. Check for duplicate face (similar face already registered in any batch across the system)
    const allStudents = await Student.find({});
    
    for (const student of allStudents) {
      if (student.faceDescriptor && student.faceDescriptor.length === 128) {
        // Calculate Euclidean distance between face descriptors
        let distance = 0;
        for (let i = 0; i < 128; i++) {
          const diff = faceDescriptor[i] - student.faceDescriptor[i];
          distance += diff * diff;
        }
        distance = Math.sqrt(distance);
        
        // If face is very similar (distance < 0.6), consider it a duplicate
        if (distance < 0.6) {
          return res.status(409).json({ 
            message: `Face already registered to student: ${student.name} (Roll: ${student.rollNo}). Please use recapture if lighting/clothing changed.`,
            existingStudent: { name: student.name, rollNo: student.rollNo }
          });
        }
      }
    }

    // 5. Create student
    const student = new Student({
      name,
      rollNo,
      batchId,
      faceDescriptor,
    });

    // 6. Save student
    await student.save();

    res.status(201).json({
      message: 'Student registered successfully',
      student,
    });
  } catch (error) {
    // 7. Handle duplicate rollNo error (Mongoose error code 11000)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Student already exists in this batch' });
    }
    next(error);
  }
};

/**
 * @desc    Get all students (optional filter by batchId)
 * @route   GET /api/students
 * @access  Private
 */
exports.getStudents = async (req, res, next) => {
  try {
    const { batchId } = req.query;
    console.log("🔍 [getStudents] Received batchId:", batchId);

    let filter = {};
    if (batchId) {
      filter.batchId = new mongoose.Types.ObjectId(batchId);
    }
    
    const students = await Student.find(filter).select('-faceDescriptor');
    
    console.log(`🔍 [getStudents] Found ${students.length} students for filter:`, filter);
    if (students.length > 0) {
      console.log(`📌 [getStudents] First student example: ID=${students[0]._id}, Name=${students[0].name}`);
    }

    res.status(200).json({
      count: students.length,
      students
    });
  } catch (error) {
    console.error("❌ [getStudents] Error:", error);
    next(error);
  }
};
