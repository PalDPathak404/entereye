const mongoose = require('mongoose');
const Student = require('../models/Student');

/**
 * @desc    Recognize a student from face descriptor
 * @route   POST /api/students/recognize
 * @access  Public (for live detection)
 */
exports.recognizeStudent = async (req, res) => {
  try {
    const { faceDescriptor, batchId, threshold = 0.6 } = req.body;

    // Validate input
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'faceDescriptor array is required' });
    }

    if (!batchId) {
      return res.status(400).json({ message: 'batchId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({ message: 'Invalid batchId' });
    }

    // Get all students from the batch
    const students = await Student.find({ batchId }).select('name rollNo faceDescriptor');

    if (students.length === 0) {
      return res.status(200).json({
        recognized: false,
        message: 'No students found in this batch'
      });
    }

    // Find best match using Euclidean distance
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const student of students) {
      const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    }

    // Convert distance to similarity score (0-1, where 1 is identical)
    const similarity = 1 - (bestDistance / 2);

    // Check if match is above threshold
    if (bestMatch && similarity >= threshold) {
      return res.status(200).json({
        recognized: true,
        student: {
          _id: bestMatch._id,
          name: bestMatch.name,
          rollNo: bestMatch.rollNo,
          confidence: similarity.toFixed(4)
        },
        distance: bestDistance.toFixed(6)
      });
    }

    // No match found
    return res.status(200).json({
      recognized: false,
      message: 'No matching student found',
      bestConfidence: similarity.toFixed(4)
    });

  } catch (error) {
    console.error('❌ RECOGNIZE ERROR:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Calculate Euclidean distance between two face descriptors
 */
function euclideanDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
