const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const PresenceTracker = require('./services/presenceTracker');
const Lecture = require('./models/Lecture');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Attach io to app for use in controllers
app.set('socketio', io);

// Initialize Presence Tracker
const presenceTracker = new PresenceTracker(io);
app.set('presenceTracker', presenceTracker);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Temporary debug log for all incoming events
  socket.onAny((event, data) => {
    console.log("📡 Event:", event, data);
  });

  // Join a room based on batchId
  socket.on('join_batch', (batchId) => {
    console.log(`Socket ${socket.id} joining room: ${batchId}`);
    socket.join(batchId);
    console.log("Emitting to batch:", batchId);
  });

  // Handle face detection events
  socket.on('face_detected', async (data) => {
    const { batchId, studentId, confidence } = data;
    
    if (!batchId || !studentId) {
      console.log("⚠️ Invalid face_detected data:", data);
      return;
    }

    console.log(`👤 Face detected: ${studentId} in batch ${batchId} (confidence: ${confidence})`);
    
    // Process through presence tracker
    const result = await presenceTracker.processDetection(batchId, studentId, confidence);
    
    if (result.success) {
      socket.emit('detection_ack', {
        studentId,
        isPresent: result.isPresent,
        detectionCount: result.detectionCount
      });
    }
  });

  // Handle session management
  socket.on('start_session', async (data) => {
    const { batchId, teacherId, subject } = data;
    const result = await presenceTracker.startSession(batchId, teacherId, subject);
    socket.emit('session_result', result);
  });

  socket.on('stop_session', async (data) => {
    const { batchId } = data;
    const result = await presenceTracker.stopSession(batchId);
    socket.emit('session_result', result);
  });

  socket.on('get_session_status', (data) => {
    const { batchId } = data;
    const status = presenceTracker.getSessionStatus(batchId);
    socket.emit('session_status', status);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Periodic check for student absences (every 4 seconds)
setInterval(async () => {
  const activeSessions = presenceTracker.getAllActiveSessions();
  for (const session of activeSessions) {
    await presenceTracker.checkAbsences(session.batchId);
  }
}, 4000);


// Start Server
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Connect to MongoDB
    console.log('Connecting DB...');
    await connectDB();

    // Auto-end any stale active lectures from previous runs
    console.log('Cleaning up old active lectures...');
    const now = new Date();
    const staleLectures = await Lecture.find({ isActive: true });
    for (const lecture of staleLectures) {
      lecture.isActive = false;
      lecture.endTime = now;
      await lecture.save();
      console.log(`Auto-ended stale lecture: ${lecture._id} (batch: ${lecture.batchId})`);
    }
    if (staleLectures.length === 0) {
      console.log('No stale lectures found');
    }

    const PORT = config.port || 5000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Routes loaded...');
      console.log('Presence Tracker initialized...');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
