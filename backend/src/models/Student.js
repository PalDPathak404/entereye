const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNo: {
    type: String,
    required: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  faceDescriptor: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 128;
      },
      message: props => `${props.value} is not a valid 128-element face descriptor!`
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for uniqueness of roll number within a batch
studentSchema.index({ batchId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
